// Supabase Edge Function: fetch-rss (v4)
// Fetches and parses RSS feeds, filters by time, limits results. 
// Improved HTML cleaning and Image Extraction.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RssArticle {
    title: string;
    description: string | null;
    url: string;
    source_url: string | null;
    publisher: string | null;
    published_at: string;
    guid: string;
    image_url: string | null;
    categories: string[];
}

function extractDomain(url: string): string {
    try {
        const domain = new URL(url).hostname;
        return domain.replace(/^www\./, "");
    } catch {
        return "Unknown";
    }
}

function parseRssDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return new Date().toISOString();
        }
        return date.toISOString();
    } catch {
        return new Date().toISOString();
    }
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

function extractImageFromHtml(html: string): string | null {
    // Try to find img src
    // Matches <img ... src="URL" ... > or <img ... src='URL' ... >
    const imgMatch = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
    return null;
}

function cleanHtml(html: string | null): string | null {
    if (!html) return null;

    // 1. Decode entities first to ensure tags are recognized e.g &lt;b&gt; -> <b>
    let text = decodeHtmlEntities(html);

    // 2. Remove script and style tags and their content
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "");

    // 3. Remove all HTML tags
    text = text.replace(/<[^>]+>/g, " "); // Replace with space to avoid merging words

    // 4. Remove multiple spaces and trim
    return text.replace(/\s+/g, " ").trim();
}

function parseRssXml(xml: string): RssArticle[] {
    const articles: RssArticle[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const items = xml.matchAll(itemRegex);

    for (const match of items) {
        const itemXml = match[1];

        const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
        const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
        const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const sourceMatch = itemXml.match(/<source[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/source>/i);
        const sourceUrlMatch = itemXml.match(/<source[^>]+url=["']([^"']+)["']/i);
        const guidMatch = itemXml.match(/<guid[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/guid>/i);

        // Extract Categories
        const categories: string[] = [];
        const catRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
        let catMatch;
        while ((catMatch = catRegex.exec(itemXml)) !== null) {
            if (catMatch[1]) categories.push(cleanHtml(catMatch[1]) || "");
        }

        // Extract Image
        let imageUrl: string | null = null;

        // 1. media:content
        const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        if (mediaMatch) imageUrl = mediaMatch[1];

        // 2. enclosure
        if (!imageUrl) {
            const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
            if (enclosureMatch) imageUrl = enclosureMatch[1];
        }

        // 3. image from description (RAW description before cleaning)
        if (!imageUrl && descMatch?.[1]) {
            // Decode entities inside description first because Google News often does: &lt;img src="..."&gt;
            const rawDesc = decodeHtmlEntities(descMatch[1]);
            imageUrl = extractImageFromHtml(rawDesc);
        }

        // Fallback: Google News Specific - sometimes image is in <google-news:image> (rare) or just description

        // Fix Google News Images (often low res in preview, but better than nothing)
        if (imageUrl && imageUrl.startsWith("//")) {
            imageUrl = "https:" + imageUrl;
        }

        const title = titleMatch?.[1] ? cleanHtml(titleMatch[1]) : null;
        const link = linkMatch?.[1]?.trim();

        if (!title || !link) continue;

        articles.push({
            title: title,
            description: descMatch?.[1] ? cleanHtml(descMatch[1]) : null, // Clean description for display
            url: link,
            source_url: sourceUrlMatch?.[1]?.trim() || null,
            publisher: sourceMatch?.[1]?.trim() || extractDomain(link),
            published_at: parseRssDate(pubDateMatch?.[1]?.trim() || ""),
            guid: guidMatch?.[1]?.trim() || link,
            image_url: imageUrl,
            categories: categories.filter(c => c.length > 0),
        });
    }

    return articles;
}

async function checkDuplicates(
    supabase: any,
    userId: string,
    urls: string[]
): Promise<Set<string>> {
    const { data } = await supabase
        .from("alerts")
        .select("url, clean_url")
        .eq("user_id", userId)
        .in("url", urls);

    const existingUrls = new Set<string>();
    if (data) {
        data.forEach((row: any) => {
            if (row.url) existingUrls.add(row.url);
            if (row.clean_url) existingUrls.add(row.clean_url);
        });
    }
    return existingUrls;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { feed_id, hours_filter = 12, user_id, check_duplicates = true } = await req.json();

        if (!feed_id) {
            throw new Error("Missing feed_id");
        }

        const { data: feed, error: feedError } = await supabase
            .from("rss_feeds")
            .select("url, title")
            .eq("id", feed_id)
            .single();

        if (feedError || !feed) {
            throw new Error("Feed not found");
        }

        console.log(`Fetching RSS: ${feed.url}`);
        const response = await fetch(feed.url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; AlertHub/1.0; RSS Reader)",
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch RSS: ${response.status}`);
        }

        const xml = await response.text();
        let articles = parseRssXml(xml);
        console.log(`Parsed ${articles.length} articles`);

        const cutoffDate = new Date(Date.now() - hours_filter * 60 * 60 * 1000);
        articles = articles.filter((article) => {
            const pubDate = new Date(article.published_at);
            return pubDate >= cutoffDate;
        });

        articles = articles.slice(0, 50);

        let existingUrls = new Set<string>();
        if (check_duplicates && user_id) {
            existingUrls = await checkDuplicates(supabase, user_id, articles.map((a) => a.url));
        }

        const articlesWithDuplicates = articles.map((article) => ({
            ...article,
            is_duplicate: existingUrls.has(article.url),
        }));

        await supabase
            .from("rss_feeds")
            .update({ last_fetched_at: new Date().toISOString() })
            .eq("id", feed_id);

        return new Response(
            JSON.stringify({
                success: true,
                feed_title: feed.title || extractDomain(feed.url),
                articles: articlesWithDuplicates,
                total: articlesWithDuplicates.length,
                duplicates: articlesWithDuplicates.filter((a) => a.is_duplicate).length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
