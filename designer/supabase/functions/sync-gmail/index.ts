// Supabase Edge Function: sync-gmail
// Fetches emails from Gmail and extracts Google Alerts articles

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as cheerio from "https://esm.sh/cheerio@1.0.0-rc.12";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailMessage {
    id: string;
    threadId: string;
}

interface GmailMessageDetail {
    id: string;
    payload: {
        headers: Array<{ name: string; value: string }>;
        body?: { data?: string };
        parts?: Array<{
            mimeType: string;
            body?: { data?: string };
            parts?: Array<{
                mimeType: string;
                body?: { data?: string };
            }>;
        }>;
    };
    internalDate: string;
}

// Get valid access token (refresh if needed)
async function getValidAccessToken(
    supabase: ReturnType<typeof createClient>,
    emailAccountId: string
): Promise<string> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Call the exchange function to refresh if needed
    const response = await fetch(
        `${supabaseUrl}/functions/v1/exchange-gmail-token`,
        {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${supabaseKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                action: "refresh",
                email_account_id: emailAccountId,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
}

// List Google Alerts emails from Gmail
async function listGoogleAlertsEmails(
    accessToken: string,
    maxResults: number = 20
): Promise<GmailMessage[]> {
    // Try multiple label variants to maximize email discovery
    // Includes both Portuguese (alertas) and English (alerts) variations
    const queryVariants = [
        "(label:alertas OR label:Alertas OR label:ALERTAS OR label:alerts OR label:Alerts OR label:ALERTS) is:unread",
        "from:googlealerts-noreply@google.com is:unread",
        "subject:\"Google Alert\" is:unread",
    ];

    console.log("=== GMAIL QUERY DEBUG ===");

    for (const queryStr of queryVariants) {
        const query = encodeURIComponent(queryStr);
        console.log(`Trying query: ${queryStr}`);

        const response = await fetch(
            `https://www.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=${maxResults}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error(`Query failed for "${queryStr}": ${error}`);
            continue;
        }

        const data = await response.json();
        const messages = data.messages || [];

        console.log(`Query "${queryStr}" returned ${messages.length} messages`);

        if (messages.length > 0) {
            console.log(`✓ SUCCESS: Using query "${queryStr}"`);
            console.log(`Message IDs:`, messages.map(m => m.id).slice(0, 5));
            return messages;
        }
    }

    console.log(`✗ No messages found with any query variant`);
    return [];
}

// Get email details including HTML body
async function getEmailDetails(
    accessToken: string,
    messageId: string
): Promise<GmailMessageDetail> {
    const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to get message ${messageId}`);
    }

    return response.json();
}

// Mark email as read after processing
async function markAsRead(accessToken: string, messageId: string): Promise<void> {
    await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                removeLabelIds: ["UNREAD"],
            }),
        }
    );
}

// Extract HTML body (or Plain Text fallback) from email payload
function extractHtmlBody(payload: GmailMessageDetail["payload"]): string {
    let html = "";
    let plain = "";

    // Helper to decode Base64 URL-safe to UTF-8
    const decode = (data: string) => {
        const text = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i++) {
            bytes[i] = text.charCodeAt(i);
        }
        return new TextDecoder("utf-8").decode(bytes);
    };

    // Check direct body
    if (payload.body?.data) {
        // Try decoding regardless of mimetype if standard decoding is needed,
        // but typically standard text/html is UTF-8.
        if (payload.mimeType === "text/html" || payload.mimeType === "text/plain") {
            html = decode(payload.body.data);
        }
    }

    // Check parts
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.body?.data) {
                if (part.mimeType === "text/html") html = decode(part.body.data);
                if (part.mimeType === "text/plain") plain = decode(part.body.data);
            }

            // Nested parts
            if (part.parts) {
                for (const nested of part.parts) {
                    if (nested.body?.data) {
                        if (nested.mimeType === "text/html") html = decode(nested.body.data);
                        if (nested.mimeType === "text/plain") plain = decode(nested.body.data);
                    }
                }
            }
        }
    }

    // Use HTML if available, otherwise wrap plain text in minimal HTML for cheerio
    if (html) return html;
    if (plain) {
        console.log("No HTML body found, using Plain Text fallback.");
        return `<html><body><pre>${plain}</pre></body></html>`;
    }

    return "";
}

// Extract subject from headers
function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || "";
}

// Helper for safe date parsing
function safeParseDate(dateStr: string | null): string {
    if (!dateStr) return new Date().toISOString();
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) throw new Error("Invalid Date");
        return date.toISOString();
    } catch {
        console.warn(`Invalid date format: ${dateStr}, using current time`);
        return new Date().toISOString();
    }
}

// URL Cleaning utilities (from existing process-gmail)
function extractGoogleRedirectUrl(url: string): string {
    if (!url) return "";

    if (url.includes("google.com/url?")) {
        try {
            const urlObj = new URL(url);
            const qParam = urlObj.searchParams.get("q");
            const urlParam = urlObj.searchParams.get("url");

            // Fix: Do not double decode. URL params are auto-decoded by searchParams.get()
            if (urlParam) return urlParam;
            if (qParam) return qParam;
        } catch {
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
            "utm_term", "utm_content", "fbclid", "gclid", "gclsrc", "si", "mbid", "ref"
        ];
        paramsToRemove.forEach(param => urlObj.searchParams.delete(param));
        return urlObj.origin + urlObj.pathname + (urlObj.search === "?" ? "" : urlObj.search);
    } catch {
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

// Extract articles from Google Alert HTML (from existing process-gmail)
interface ExtractedArticle {
    type: string;
    title: string;
    description: string;
    publisher: string;
    url: string;
    clean_url: string;
    valid: boolean;
}

function extractAlertTypeCheck(html: string): string {
    const $ = cheerio.load(html);
    const typeSpan = $('span[style*="font-size:12px"][style*="color:#737373"]').first();
    return typeSpan.length ? typeSpan.text().trim() : "UNKNOWN";
}

function extractArticlesFromHtml(html: string): ExtractedArticle[] {
    console.log("=== ARTICLE EXTRACTION DEBUG ===");
    console.log(`Input HTML length: ${html.length} characters`);

    const articles: ExtractedArticle[] = [];
    const $ = cheerio.load(html);

    // Detect Alert Type
    let alertType = "UNKNOWN";
    const typeSpan = $('span[style*="font-size:12px"][style*="color:#737373"]').first();
    if (typeSpan.length) {
        alertType = typeSpan.text().trim();
    }
    console.log(`Alert Type detected: "${alertType}"`);

    // Strategy 1: Schema.org markup
    const schemaOrgTrs = $('tr').filter((_, el) => {
        const itemtype = $(el).attr('itemtype');
        return itemtype && (itemtype.includes('schema.org/Article') || itemtype.includes('schema.org/NewsArticle'));
    });

    console.log(`Strategy 1 - Schema.org <tr> matches: ${schemaOrgTrs.length}`);

    schemaOrgTrs.each((idx, element) => {
        const el = $(element);

        const titleEl = el.find('[itemprop="name"]').first();
        const linkEl = el.find('a[href]').first();
        const title = titleEl.text().trim();
        const rawUrl = linkEl.attr('href') || "";

        const publisherEl = el.find('[itemprop="publisher"]').first();
        const publisher = publisherEl.text().trim();

        const descEl = el.find('[itemprop="description"]').first();
        const description = descEl.text().trim();

        console.log(`  Article ${idx}: title="${title.substring(0, 50)}", url="${rawUrl.substring(0, 80)}"`);

        if (title && rawUrl) {
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
                });
                console.log(`    ✓ Added (valid URL)`);
            } else {
                console.log(`    ✗ Rejected (invalid URL after cleaning)`);
            }
        } else {
            console.log(`    ✗ Skipped (missing title or URL)`);
        }
    });

    // Strategy 2: Fallback for generic HTML structure
    if (articles.length === 0) {
        console.log("Strategy 1 yielded 0 articles. Trying Strategy 2 (Generic <h4><a>)...");

        const h4Links = $('h4 a[href]');
        console.log(`Strategy 2 - <h4><a> matches: ${h4Links.length}`);

        h4Links.each((idx, element) => {
            const linkEl = $(element);
            const title = linkEl.text().trim();
            const rawUrl = linkEl.attr('href') || "";

            const container = linkEl.closest('table');
            const description = container.find('.aa').text().trim() || "";
            const publisher = container.find('.j').text().trim() || "";

            console.log(`  Article ${idx}: title="${title.substring(0, 50)}", url="${rawUrl.substring(0, 80)}"`);

            if (title && rawUrl && rawUrl.startsWith('http')) {
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
                    });
                    console.log(`    ✓ Added`);
                } else {
                    console.log(`    ✗ Rejected (invalid URL)`);
                }
            } else {
                console.log(`    ✗ Skipped`);
            }
        });
    }

    // Strategy 3: Regex fallback (NEW)
    if (articles.length === 0) {
        console.log("Strategy 2 yielded 0 articles. Trying Strategy 3 (Regex for google.com/url links)...");

        const urlRegex = /href="(https?:\/\/(?:www\.)?google\.com\/url\?[^"]+)"/g;
        const matches = [...html.matchAll(urlRegex)];
        console.log(`Strategy 3 - Regex matches: ${matches.length}`);

        matches.forEach((match, idx) => {
            const rawUrl = match[1];
            const cleaned = cleanUrl(rawUrl);

            console.log(`  Link ${idx}: ${rawUrl.substring(0, 80)}`);

            if (cleaned.valid) {
                articles.push({
                    type: alertType,
                    title: "[Extracted via Regex - Check manually]",
                    description: "Article extracted using fallback regex method",
                    publisher: "Unknown",
                    url: rawUrl,
                    clean_url: cleaned.cleanUrl,
                    valid: cleaned.valid,
                });
                console.log(`    ✓ Added`);
            } else {
                console.log(`    ✗ Rejected (invalid URL)`);
            }
        });
    }

    // Remove duplicates
    const seen = new Set<string>();
    const uniqueArticles = articles.filter(a => {
        if (seen.has(a.clean_url)) {
            console.log(`  Duplicate removed: ${a.clean_url.substring(0, 60)}`);
            return false;
        }
        seen.add(a.clean_url);
        return true;
    });

    console.log(`=== EXTRACTION SUMMARY ===`);
    console.log(`Total articles extracted: ${uniqueArticles.length}`);
    console.log(`Duplicates removed: ${articles.length - uniqueArticles.length}`);

    return uniqueArticles;
}

function extractKeywords(text: string): string[] {
    if (!text) return [];
    const stopWords = new Set([
        "a", "o", "e", "de", "da", "do", "em", "um", "uma", "para", "com", "não",
        "the", "and", "or", "is", "in", "to", "of", "for", "on", "with", "at",
    ]);
    const words = text
        .toLowerCase()
        .replace(/[^\w\sáéíóúâêîôûãõàèìòùçñ]/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 3 && !stopWords.has(w));
    return [...new Set(words)].slice(0, 10);
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
        const { email_account_id } = body;

        // Get accounts to sync
        let accountsQuery = supabase
            .from("email_accounts")
            .select("*")
            .eq("oauth_connected", true)
            .eq("sync_enabled", true);

        if (email_account_id) {
            accountsQuery = accountsQuery.eq("id", email_account_id);
        }

        const { data: accounts, error: accountsError } = await accountsQuery;

        if (accountsError) throw accountsError;

        if (!accounts || accounts.length === 0) {
            return new Response(
                JSON.stringify({ success: true, message: "No connected accounts to sync" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const results = [];

        for (const account of accounts) {
            console.log(`Syncing account: ${account.email}`);

            // Create sync log entry
            const { data: syncLog, error: logError } = await supabase
                .from("email_sync_logs")
                .insert({
                    email_account_id: account.id,
                    status: "running",
                })
                .select()
                .single();

            if (logError) {
                console.error("Failed to create sync log:", logError);
                continue;
            }

            try {
                // Get valid access token
                const accessToken = await getValidAccessToken(supabase, account.id);

                // List unread Google Alerts emails
                const messages = await listGoogleAlertsEmails(accessToken);
                console.log(`Found ${messages.length} unread emails`);

                let emailsProcessed = 0;
                let articlesExtracted = 0;

                for (const message of messages) {
                    try {
                        // Get email details
                        const details = await getEmailDetails(accessToken, message.id);
                        const html = extractHtmlBody(details.payload);

                        if (!html) {
                            console.log(`No HTML body for message ${message.id}`);
                            continue;
                        }

                        const subject = extractHeader(details.payload.headers, "Subject");
                        const date = extractHeader(details.payload.headers, "Date");

                        // Extract articles
                        const articles = extractArticlesFromHtml(html);

                        if (articles.length === 0) {
                            console.log(`No articles found in email: ${subject} (Type: ${extractAlertTypeCheck(html)})`);
                        } else {
                            console.log(`Extracted ${articles.length} articles from: ${subject}`);
                        }

                        // Prepare records for insertion
                        const records = articles.map(article => ({
                            user_id: account.user_id,
                            email_account_id: account.id,
                            source_type: "gmail_alert",
                            alert_type: article.type,
                            title: article.title,
                            description: article.description,
                            publisher: article.publisher,
                            url: article.url,
                            clean_url: article.clean_url,
                            email_subject: subject,
                            email_date: safeParseDate(date),
                            email_id: message.id,
                            is_valid: article.valid,
                            status: "pending",
                            keywords: extractKeywords(article.title + " " + article.description),
                        }));

                        if (records.length > 0) {
                            const { error: insertError } = await supabase
                                .from("alerts")
                                .upsert(records, {
                                    onConflict: "clean_url",
                                    ignoreDuplicates: true
                                });

                            if (insertError) {
                                console.error("Insert error:", insertError);
                            } else {
                                articlesExtracted += records.length;
                            }
                        }

                        // Mark email as read ONLY if articles were found (to allow retrying if extraction fails)
                        if (articles.length > 0) {
                            await markAsRead(accessToken, message.id);
                            emailsProcessed++;
                        } else {
                            console.log(`SKIPPING markAsRead for message ${message.id} because 0 articles were extracted.`);
                        }

                    } catch (msgError) {
                        console.error(`Error processing message ${message.id}:`, msgError);
                    }
                }

                // Update sync log with success
                await supabase
                    .from("email_sync_logs")
                    .update({
                        status: "success",
                        sync_completed_at: new Date().toISOString(),
                        emails_processed: emailsProcessed,
                        articles_extracted: articlesExtracted,
                    })
                    .eq("id", syncLog.id);

                // Update account last sync
                await supabase
                    .from("email_accounts")
                    .update({ last_sync_at: new Date().toISOString() })
                    .eq("id", account.id);

                results.push({
                    account: account.email,
                    success: true,
                    emails_processed: emailsProcessed,
                    articles_extracted: articlesExtracted,
                });

            } catch (error) {
                const message = error instanceof Error ? error.message : "Unknown error";
                console.error(`Sync failed for ${account.email}:`, message);

                // Update sync log with error
                await supabase
                    .from("email_sync_logs")
                    .update({
                        status: "error",
                        sync_completed_at: new Date().toISOString(),
                        error_message: message,
                    })
                    .eq("id", syncLog.id);

                results.push({
                    account: account.email,
                    success: false,
                    error: message,
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                accounts_synced: results.length,
                results,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error in sync-gmail:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
