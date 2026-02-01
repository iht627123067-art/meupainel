// Supabase Edge Function: process-gmail
// Processes Google Alerts emails and extracts articles using Cheerio for robust HTML parsing

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

// URL Utilities
function extractGoogleRedirectUrl(url: string): string {
    if (!url) return "";

    // Decoding common Google News URL patterns
    // Pattern 1: google.com/url?q=...
    // Pattern 2: google.com/url?url=...
    if (url.includes("google.com/url?")) {
        try {
            const urlObj = new URL(url);
            const qParam = urlObj.searchParams.get("q");
            const urlParam = urlObj.searchParams.get("url");

            if (urlParam) return decodeURIComponent(urlParam);
            if (qParam) return decodeURIComponent(qParam);
        } catch {
            // Manual regex fallback if URL parsing fails
            const match = url.match(/[?&](url|q)=([^&]+)/);
            if (match) return decodeURIComponent(match[2]);
        }
    }
    return url;
}

function removeTrackingParams(url: string): string {
    try {
        const urlObj = new URL(url);
        const paramsToRemove = [
            "ct", "cd", "usg", "utm_source", "utm_medium", "utm_campaign",
            "utm_term", "utm_content", "fbclid", "gclid", "gclsrc",
            "si", "mbid", "ref"
        ];

        paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

        // Return cleaned URL
        return urlObj.origin + urlObj.pathname + (urlObj.search === "?" ? "" : urlObj.search);
    } catch {
        // Simple string manipulation fallback
        return url.split("&ct=")[0].split("&cd=")[0].split("?utm_")[0];
    }
}

function cleanUrl(url: string): { cleanUrl: string; valid: boolean } {
    if (!url || !url.startsWith("http")) {
        return { cleanUrl: "", valid: false };
    }

    let cleanedUrl = extractGoogleRedirectUrl(url);
    cleanedUrl = removeTrackingParams(cleanedUrl);

    try {
        new URL(cleanedUrl);
        return { cleanUrl: cleanedUrl, valid: true };
    } catch {
        return { cleanUrl: cleanedUrl, valid: false };
    }
}

// Article extraction interface
interface ExtractedArticle {
    type: string;
    title: string;
    description: string;
    publisher: string;
    url: string;
    clean_url: string;
    valid: boolean;
    email_subject: string;
    email_date: string;
    email_id: string;
}

function extractArticlesFromHtml(
    html: string,
    subject: string,
    date: string,
    emailId: string
): ExtractedArticle[] {
    const articles: ExtractedArticle[] = [];
    const $ = cheerio.load(html);

    // Detect Alert Type (e.g. "Google Alert - KEYWORD")
    let alertType = "UNKNOWN";
    const typeSpan = $('span[style*="font-size:12px"][style*="color:#737373"]').first();
    if (typeSpan.length) {
        alertType = typeSpan.text().trim();
    }

    // Google Alerts usually structure items in tables with itemType="http://schema.org/Article"
    $('tr[itemscope][itemtype="http://schema.org/Article"]').each((_, element) => {
        const el = $(element);

        // Titles are usually in a span with itemprop="name" inside a link
        const titleEl = el.find('span[itemprop="name"]').first();
        const linkEl = el.find('a[href]').first();

        const title = titleEl.text().trim();
        let rawUrl = linkEl.attr('href') || "";

        // Publisher
        const publisherEl = el.find('div[itemprop="publisher"] span[itemprop="name"]').first();
        const publisher = publisherEl.text().trim();

        // Description
        const descEl = el.find('div[itemprop="description"]').first();
        const description = descEl.text().trim();

        if (title && rawUrl) {
            // Apply cleaning
            const cleaned = cleanUrl(rawUrl);

            if (cleaned.valid) {
                articles.push({
                    type: alertType,
                    title,
                    description,
                    publisher,
                    url: rawUrl,
                    clean_url: cleaned.cleanUrl,
                    valid: cleaned.valid,
                    email_subject: subject,
                    email_date: date,
                    email_id: emailId,
                });
            }
        }
    });

    // Remove duplicates based on clean_url
    const seen = new Set<string>();
    return articles.filter((a) => {
        const key = a.clean_url;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function extractKeywords(text: string): string[] {
    if (!text) return [];
    const stopWords = new Set([
        "a", "o", "e", "de", "da", "do", "em", "um", "uma", "para", "com", "não",
        "the", "and", "or", "is", "in", "to", "of", "for", "on", "with", "at",
        "as", "os", "ao", "aos", "pela", "pelas", "pelo", "pelos", "que", "se"
    ]);
    const words = text
        .toLowerCase()
        .replace(/[^\w\sáéíóúâêîôûãõàèìòùçñ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3 && !stopWords.has(w));

    return [...new Set(words)].slice(0, 10);
}

Deno.serve(async (req: Request) => {
    // CORS headers
    const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    };

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json().catch(() => ({}));
        const { html, subject, date, email_id, user_id, email_account_id } = body;

        if (!html || !user_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: html, user_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Processing email: ${subject} (${email_id})`);

        const articles = extractArticlesFromHtml(
            html,
            subject || "Google Alert",
            date || new Date().toISOString(),
            email_id || `import-${Date.now()}`
        );

        console.log(`Extracted ${articles.length} articles.`);

        if (articles.length === 0) {
            return new Response(
                JSON.stringify({ success: true, count: 0, message: "No articles found in email" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Prepare records for insertion
        const records = articles.map((article) => ({
            user_id,
            email_account_id: email_account_id || null,
            source_type: "gmail_alert",
            alert_type: article.type,
            title: article.title,
            description: article.description,
            publisher: article.publisher,
            url: article.url,
            clean_url: article.clean_url,
            email_subject: article.email_subject,
            email_date: article.email_date ? new Date(article.email_date).toISOString() : null,
            email_id: article.email_id,
            is_valid: article.valid,
            status: "pending",
            keywords: extractKeywords(article.title + " " + article.description),
        }));

        const { data: insertedRecords, error } = await supabase
            .from("alerts")
            .insert(records)
            .select();

        if (error) {
            console.error("Supabase insert error:", error);
            throw error;
        }

        // Trigger Clustering for each inserted alert
        // We do this asynchronously (no await inside loop) OR sequentially if we want strong consistency?
        // Sequential is safer for clustering (Order matters: Item 2 might cluster with Item 1).

        console.log(`Clustering ${insertedRecords.length} new alerts...`);
        let clusterCount = 0;

        for (const record of insertedRecords) {
            try {
                // Use email_date as the "publish time" for clustering logic if available
                const publishDate = record.email_date || record.created_at;

                await supabase.rpc('assign_or_create_group_v2', {
                    p_alert_id: record.id,
                    p_title: record.title,
                    p_description: record.description || "",
                    p_url: record.url,
                    p_created_at: publishDate
                });
                clusterCount++;
            } catch (err) {
                console.error(`Failed to cluster alert ${record.id}:`, err);
            }
        }

        console.log(`Clustering complete. Processed ${clusterCount}/${insertedRecords.length}.`);

        return new Response(
            JSON.stringify({
                success: true,
                count: records.length,
                message: `Successfully imported ${records.length} articles`,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error processing gmail:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
