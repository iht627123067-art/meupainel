// Supabase Edge Function: extract-content
// Extracts article content from URL and converts to Markdown with robust fallback
// Includes advanced Google News URL resolution and strategy-based extraction

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Cleans and resolves Google URLs to get the real article URL
 * Handles Google News RSS URLs, google.com/url redirects, regex search, and Base64 decoding
 */
async function resolveGoogleNewsUrl(url: string): Promise<string> {
    console.log(`🔍 Starting URL resolution: ${url}`);

    if (!url || !url.startsWith('http')) {
        return url;
    }

    let cleanUrl = url;

    // 1. Decode HTML entities
    cleanUrl = cleanUrl
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    // 2. Base64 Decoding Strategy (New)
    try {
        if (cleanUrl.includes('news.google.com/rss/articles/')) {
            const urlParts = cleanUrl.split('/articles/');
            if (urlParts.length > 1) {
                const base64Part = urlParts[1].split('?')[0];
                try {
                    const buffer = Buffer.from(base64Part, 'base64');
                    const decoded = buffer.toString('latin1'); // Use latin1 to preserve binary structure

                    // Search for http in decoded string
                    const httpIndex = decoded.indexOf('http');
                    if (httpIndex !== -1) {
                        const urlMatch = decoded.match(/https?:\/\/[^\x00-\x1F\x7F]+/);
                        if (urlMatch) {
                            console.log(`   ✓ Found URL in Base64 decoding: ${urlMatch[0]}`);
                            return urlMatch[0];
                        }
                    }

                    // Try inner base64 decoding (common in newer Google News links)
                    const possibleB64 = decoded.match(/[A-Za-z0-9+/=]{20,}/);
                    if (possibleB64) {
                        try {
                            const innerBuffer = Buffer.from(possibleB64[0], 'base64');
                            const innerDecoded = innerBuffer.toString('latin1');
                            const innerUrlMatch = innerDecoded.match(/https?:\/\/[^\x00-\x1F\x7F]+/);
                            if (innerUrlMatch) {
                                console.log(`   ✓ Found URL in inner Base64: ${innerUrlMatch[0]}`);
                                return innerUrlMatch[0];
                            }
                        } catch (e) {
                            // ignore inner decode errors
                        }
                    }
                } catch (e: any) {
                    console.log(`   ⚠️ Base64 decode failed: ${e.message}`);
                }
            }
        }
    } catch (e: any) {
        console.log(`   ⚠️ Advanced Base64 strategy failed: ${e.message}`);
    }

    // 3. Network Fetch Strategy (Follow Redirects & Content Analysis)
    if (cleanUrl.includes('news.google.com') || cleanUrl.includes('google.com/url')) {
        console.log(`   🌐 Fetching to follow redirects...`);
        try {
            const response = await fetch(cleanUrl, {
                method: "GET",
                redirect: "follow",
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                }
            });

            const finalUrl = response.url;

            // If we landed on a non-google page, great!
            if (!finalUrl.includes('google.com') && !finalUrl.includes('googleusercontent.com')) {
                console.log(`   ✓ Redirect followed to: ${finalUrl}`);
                return finalUrl;
            }

            // If still on Google, parse HTML
            const html = await response.text();

            // Strategy: Window Location
            const matchLocation = html.match(/window\.location\.(?:replace|href)\s*=\s*["']([^"']+)["']/);
            if (matchLocation) {
                return matchLocation[1].replace(/\\x3d/g, '=').replace(/\\x26/g, '&');
            }

            // Strategy: Link in pure HTML
            const $ = cheerio.load(html);
            const link = $('a[href^="http"]:not([href*="google.com"]):not([href*="googleusercontent.com"])').first().attr('href');
            if (link) return link;

            // Strategy: Regex for any external URL
            const allUrls = html.match(/https?:\/\/[^\s"'<>]+/g) || [];
            const externalUrl = allUrls.find(u =>
                !u.includes('google.com') &&
                !u.includes('gstatic.com') &&
                !u.includes('googleapis.com') &&
                !u.includes('googletagmanager.com') &&
                !u.includes('w3.org') &&
                !u.includes('schema.org')
            );
            if (externalUrl) return externalUrl;

        } catch (e: any) {
            console.log(`   ⚠️ Network resolution failed: ${e.message}`);
        }
    }

    // 4. Fallback: Check for ?url= param
    try {
        const urlObj = new URL(cleanUrl);
        const urlParam = urlObj.searchParams.get('url');
        if (urlParam) return decodeURIComponent(urlParam);
    } catch (e) { }

    return cleanUrl;
}


/**
 * Fetches content from URL using Jina Reader API (primary)
 */
async function fetchContentAsMarkdown(url: string): Promise<{ markdown: string; wordCount: number, source: string }> {
    const jinaUrl = `https://r.jina.ai/${url}`;

    try {
        const response = await fetch(jinaUrl, {
            headers: {
                "Accept": "text/markdown",
                "User-Agent": "Mozilla/5.0 (compatible; ContentExtractor/1.0)",
            },
        });

        if (!response.ok) {
            throw new Error(`Jina status: ${response.status}`);
        }

        const markdown = await response.text();
        const wordCount = markdown.split(/\s+/).filter(w => w.length > 0).length;

        if (markdown.includes("Cloudflare") || markdown.length < 50) {
            throw new Error("Jina returned invalid content");
        }

        return { markdown, wordCount, source: 'jina' };
    } catch (error) {
        console.log("Jina Reader failed, trying fallback...", error);
        return await fallbackExtraction(url);
    }
}

/**
 * Robust Fallback extraction logic using Cheerio
 * Matches logic from proposed solution
 */
async function fallbackExtraction(url: string): Promise<{ markdown: string; wordCount: number, source: string }> {
    console.log(`   Running robust fallback extraction for: ${url}`);

    // Improved User-Agent
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Remove Junk
    $('script, style, nav, header, footer, iframe, noscript, .ad, .advertisement, #sidebar, .cookie-banner, .subscription-banner').remove();

    // 2. Strategy: Selectors from proposed solution
    const selectors = [
        'article',
        '[role="main"]',
        '.article-content',
        '.post-content',
        '.entry-content',
        'main',
        '#content',
        '.content',
        '.post-body'
    ];

    let contentRoot: any = null;

    for (const selector of selectors) {
        const element = $(selector);
        if (element.length > 0) {
            // Check if it has substantial text
            if (element.text().trim().length > 200) {
                console.log(`   ✓ Found content using selector: ${selector}`);
                contentRoot = element;
                break;
            }
        }
    }

    // Fallback if no specific selector matched
    if (!contentRoot) {
        console.log(`   ⚠️ No specific selector matched, using body fallback`);
        contentRoot = $('body');
    }

    let markdown = "";

    // Iterate over semantic elements to build markdown
    contentRoot.find('h1, h2, h3, p, ul, ol, blockquote').each((_: number, elem: any) => {
        // Skip if inside a previously removed element (double check)
        if ($(elem).parents('.ad, nav, footer').length > 0) return;

        const tag = $(elem).prop('tagName').toLowerCase();
        // Decode text
        const text = $(elem).text().trim().replace(/\s+/g, ' ');

        if (!text) return;

        switch (tag) {
            case 'h1': markdown += `# ${text}\n\n`; break;
            case 'h2': markdown += `## ${text}\n\n`; break;
            case 'h3': markdown += `### ${text}\n\n`; break;
            case 'p': markdown += `${text}\n\n`; break;
            case 'blockquote': markdown += `> ${text}\n\n`; break;
            case 'ul':
                $(elem).find('li').each((_: number, li: any) => {
                    markdown += `- ${$(li).text().trim()}\n`;
                });
                markdown += "\n";
                break;
            case 'ol':
                $(elem).find('li').each((i: number, li: any) => {
                    markdown += `${i + 1}. ${$(li).text().trim()}\n`;
                });
                markdown += "\n";
                break;
        }
    });

    const wordCount = markdown.split(/\s+/).filter(w => w.length > 0).length;
    return { markdown, wordCount, source: 'cheerio-robust' };
}

/**
 * Clean Markdown
 */
function cleanMarkdownContent(markdown: string): string {
    return markdown
        .replace(/\[Advertisement\].*?\n/gi, "")
        .replace(/\[Sponsored\].*?\n/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * Quality Score Logic
 */
function calculateQualityScore(markdown: string, wordCount: number): number {
    let score = 0.5;
    if (wordCount >= 500 && wordCount <= 2000) score += 0.2;
    else if (wordCount > 2000) score += 0.15;
    else if (wordCount < 100) score -= 0.3;

    if (/#\s/.test(markdown)) score += 0.1;
    if (/\n\n/.test(markdown)) score += 0.1;

    return Math.max(0, Math.min(1, score));
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json().catch(() => ({}));
        const { alert_id, url } = body;

        if (!alert_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: alert_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`\n🚀 ========== STARTING EXTRACTION ==========`);
        console.log(`📋 Alert ID: ${alert_id}`);

        // 0. Get alert details
        const { data: alert, error: alertError } = await supabase
            .from("alerts")
            .select("source_url, title, url, clean_url")
            .eq("id", alert_id)
            .single();

        if (alertError) console.error(`❌ Failed to fetch alert: ${alertError.message}`);

        // 1. Determine URL to extract
        let urlToExtract = url || alert?.clean_url || alert?.url;
        console.log(`📍 STEP 1: Determining URL to extract...`);
        console.log(`   Initial URL: ${urlToExtract}`);

        // If it's a Google News URL or seems obfuscated, try to resolve it
        if (urlToExtract.includes('news.google.com') || urlToExtract.includes('google.com/url')) {
            console.log(`   📰 Obfuscated/redirect link detected. Resolving...`);
            urlToExtract = await resolveGoogleNewsUrl(urlToExtract);
        }

        console.log(`✅ Final URL to extract: ${urlToExtract}`);

        // Update clean_url in DB if it changed
        if (urlToExtract !== alert?.clean_url) {
            await supabase.from("alerts").update({ clean_url: urlToExtract }).eq("id", alert_id);
        }

        // 2. Extract content
        console.log(`\n📰 STEP 3: Extracting content from URL...`);
        const { markdown, wordCount, source } = await fetchContentAsMarkdown(urlToExtract);

        // Clean content
        const cleanedContent = cleanMarkdownContent(markdown);
        const cleanedWordCount = cleanedContent.split(/\s+/).filter(w => w.length > 0).length;
        const qualityScore = calculateQualityScore(cleanedContent, cleanedWordCount);

        console.log(`✅ Extraction complete! Score: ${qualityScore}`);

        // 3. Upsert extracted content
        const { error: insertError } = await supabase
            .from("extracted_content")
            .upsert({
                alert_id,
                markdown_content: markdown,
                cleaned_content: cleanedContent,
                word_count: cleanedWordCount,
                quality_score: qualityScore,
                extraction_status: 'success',
                extracted_at: new Date().toISOString()
            }, { onConflict: 'alert_id' });

        if (insertError) throw insertError;

        // 4. Update alert status
        await supabase
            .from("alerts")
            .update({
                status: "extracted",
                clean_url: urlToExtract
            })
            .eq("id", alert_id);

        return new Response(
            JSON.stringify({
                success: true,
                word_count: cleanedWordCount,
                quality_score: qualityScore,
                clean_url: urlToExtract,
                extraction_source: source,
                message: "Content extracted successfully",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        let message = String(error);
        if (error instanceof Error) message = error.message;
        console.error(`❌ Extraction Failed: ${message}`);

        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
