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
    // Search for emails in the 'alertas' label that are unread
    const query = encodeURIComponent("label:alertas is:unread");

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
        throw new Error(`Gmail API list failed: ${error}`);
    }

    const data = await response.json();
    return data.messages || [];
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

// Extract HTML body from email payload
function extractHtmlBody(payload: GmailMessageDetail["payload"]): string {
    // Check direct body
    if (payload.body?.data) {
        return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
    }

    // Check parts for HTML
    if (payload.parts) {
        for (const part of payload.parts) {
            if (part.mimeType === "text/html" && part.body?.data) {
                return atob(part.body.data.replace(/-/g, "+").replace(/_/g, "/"));
            }
            // Check nested parts (multipart/alternative)
            if (part.parts) {
                for (const nestedPart of part.parts) {
                    if (nestedPart.mimeType === "text/html" && nestedPart.body?.data) {
                        return atob(nestedPart.body.data.replace(/-/g, "+").replace(/_/g, "/"));
                    }
                }
            }
        }
    }

    return "";
}

// Extract subject from headers
function extractHeader(headers: Array<{ name: string; value: string }>, name: string): string {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || "";
}

// URL Cleaning utilities (from existing process-gmail)
function extractGoogleRedirectUrl(url: string): string {
    if (!url) return "";

    if (url.includes("google.com/url?")) {
        try {
            const urlObj = new URL(url);
            const qParam = urlObj.searchParams.get("q");
            const urlParam = urlObj.searchParams.get("url");
            if (urlParam) return decodeURIComponent(urlParam);
            if (qParam) return decodeURIComponent(qParam);
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

function extractArticlesFromHtml(html: string): ExtractedArticle[] {
    const articles: ExtractedArticle[] = [];
    const $ = cheerio.load(html);

    // Detect Alert Type
    let alertType = "UNKNOWN";
    const typeSpan = $('span[style*="font-size:12px"][style*="color:#737373"]').first();
    if (typeSpan.length) {
        alertType = typeSpan.text().trim();
    }

    // Extract articles using schema.org markup
    $('tr[itemscope][itemtype="http://schema.org/Article"]').each((_, element) => {
        const el = $(element);

        const titleEl = el.find('span[itemprop="name"]').first();
        const linkEl = el.find('a[href]').first();
        const title = titleEl.text().trim();
        const rawUrl = linkEl.attr('href') || "";

        const publisherEl = el.find('div[itemprop="publisher"] span[itemprop="name"]').first();
        const publisher = publisherEl.text().trim();

        const descEl = el.find('div[itemprop="description"]').first();
        const description = descEl.text().trim();

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
            }
        }
    });

    // Remove duplicates
    const seen = new Set<string>();
    return articles.filter(a => {
        if (seen.has(a.clean_url)) return false;
        seen.add(a.clean_url);
        return true;
    });
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
                        console.log(`Extracted ${articles.length} articles from: ${subject}`);

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
                            email_date: date ? new Date(date).toISOString() : null,
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

                        // Mark email as read
                        await markAsRead(accessToken, message.id);
                        emailsProcessed++;

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
