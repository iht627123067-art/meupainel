// Supabase Edge Function: fetch-rss (v4)
// Fetches and parses RSS feeds, filters by loops, limits results. 
// Uses RPC for efficient fuzzy deduplication.

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
    const imgMatch = html.match(/<img[^>]+src\s*=\s*["']([^"']+)["']/i);
    if (imgMatch) return imgMatch[1];
    return null;
}

function cleanHtml(html: string | null): string | null {
    if (!html) return null;
    let text = decodeHtmlEntities(html);
    text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "");
    text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "");
    text = text.replace(/<[^>]+>/g, " ");
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

        const categories: string[] = [];
        const catRegex = /<category>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi;
        let catMatch;
        while ((catMatch = catRegex.exec(itemXml)) !== null) {
            if (catMatch[1]) categories.push(cleanHtml(catMatch[1]) || "");
        }

        let imageUrl: string | null = null;
        const mediaMatch = itemXml.match(/<media:content[^>]+url=["']([^"']+)["']/i);
        if (mediaMatch) imageUrl = mediaMatch[1];
        if (!imageUrl) {
            const enclosureMatch = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image\/[^"']+["']/i);
            if (enclosureMatch) imageUrl = enclosureMatch[1];
        }
        if (!imageUrl && descMatch?.[1]) {
            const rawDesc = decodeHtmlEntities(descMatch[1]);
            imageUrl = extractImageFromHtml(rawDesc);
        }
        if (imageUrl && imageUrl.startsWith("//")) {
            imageUrl = "https:" + imageUrl;
        }

        const rawTitle = titleMatch?.[1] ? cleanHtml(titleMatch[1]) : null;
        // Clean Title Strategy (Source Removal)
        const title = rawTitle ? rawTitle.replace(/ [\-\|] [^\-\|]+$/, "").trim() : null;

        const link = linkMatch?.[1]?.trim();

        if (!title || !link) continue;

        articles.push({
            title: title,
            description: descMatch?.[1] ? cleanHtml(descMatch[1]) : null,
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

const cleanInput = (str: string): string => {
    return str.split("?")[0].split("#")[0]
        .replace(/^(https?:\/\/)?(www\.)?/, "")
        .replace(/\/$/, "")
        .toLowerCase();
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

        let duplicatesIds = new Set<string>();

        if (check_duplicates && articles.length > 0) {
            const articlesPayload = articles.map(a => ({
                clean_url: cleanInput(a.url),
                title: a.title
            }));

            const { data: duplicateData, error: dupError } = await supabase.rpc('check_existing_articles', {
                p_entries: articlesPayload
            });

            if (dupError) {
                console.error("Duplicate RPC Error:", dupError);
                // Fallback or just ignore error and return without duplicate info?
                // Or throw? Let's log and proceed, assuming no duplicates if check failed.
            }

            if (!dupError && duplicateData) {
                duplicateData.forEach((d: any) => {
                    if (d.match_url) duplicatesIds.add(d.match_url);
                });
            }
        }

        const articlesWithDuplicates = articles.map((article) => {
            const cUrl = cleanInput(article.url);
            return {
                ...article,
                is_duplicate: duplicatesIds.has(cUrl),
            };
        });

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
