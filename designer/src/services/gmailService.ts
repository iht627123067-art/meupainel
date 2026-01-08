/**
 * Gmail Service for extracting Google Alerts
 * Based on: 1.1 extractgmail.js
 */

import { cleanUrl, decodeHtmlEntities } from '@/utils/urlUtils';

/**
 * Represents an article extracted from a Google Alert email
 */
export interface ExtractedArticle {
    type: string;
    title: string;
    description: string;
    publisher: string;
    url: string;
    cleanUrl: string;
    valid: boolean;
    emailSubject: string;
    emailDate: string;
    emailId: string;
}

/**
 * Raw email metadata
 */
export interface EmailMetadata {
    html: string;
    subject: string;
    date: string;
    id: string;
}

/**
 * Extracts the alert type from Google Alerts email HTML
 */
function extractAlertType(html: string): string {
    const typeMatch = html.match(/<span style="font-size:12px;color:#737373">\s*([A-Z]+)\s*<\/span>/i);
    return typeMatch ? typeMatch[1] : 'UNKNOWN';
}

/**
 * Extracts the article title from article HTML block
 */
function extractTitle(articleHtml: string): string {
    const titleMatch = articleHtml.match(/<span itemprop="name">([^<]+)<\/span>/i);
    if (!titleMatch) return '';

    return titleMatch[1]
        .replace(/<\/?b>/g, '')
        .trim();
}

/**
 * Extracts the URL from article HTML block
 */
function extractUrl(articleHtml: string): string {
    const urlMatch = articleHtml.match(/href="([^"]+)"/i);
    if (!urlMatch) return '';

    let url = urlMatch[1];

    // Decode Google redirect URL
    if (url.includes('google.com/url?')) {
        try {
            const urlObj = new URL(url);
            const urlParam = urlObj.searchParams.get('url');
            url = urlParam || url;
        } catch (e) {
            const urlParamMatch = url.match(/[?&]url=([^&]+)/);
            if (urlParamMatch) {
                url = decodeURIComponent(urlParamMatch[1]);
            }
        }
    }

    return url;
}

/**
 * Extracts the publisher from article HTML block
 */
function extractPublisher(articleHtml: string): string {
    const publisherMatch = articleHtml.match(
        /<div itemprop="publisher"[^>]*>[\s\S]*?<span itemprop="name">([^<]+)<\/span>/i
    );
    return publisherMatch ? publisherMatch[1].trim() : '';
}

/**
 * Extracts the description from article HTML block
 */
function extractDescription(articleHtml: string): string {
    const descMatch = articleHtml.match(/<div itemprop="description"[^>]*>([^<]+)<\/div>/i);
    if (!descMatch) return '';

    return decodeHtmlEntities(descMatch[1])
        .replace(/<\/?b>/g, '')
        .trim();
}

/**
 * Extracts all articles from a Google Alert email HTML
 */
export function extractArticlesFromHtml(
    html: string,
    metadata: Omit<EmailMetadata, 'html'>
): ExtractedArticle[] {
    const alertType = extractAlertType(html);

    // Find all article blocks using schema.org markup
    const articleRegex = /<tr[^>]*itemscope[^>]*itemtype="http:\/\/schema\.org\/Article"[^>]*>([\s\S]*?)<\/tr>/gi;
    const articles: ExtractedArticle[] = [];
    let articleMatch;

    while ((articleMatch = articleRegex.exec(html)) !== null) {
        const articleHtml = articleMatch[1];

        const title = extractTitle(articleHtml);
        const url = extractUrl(articleHtml);
        const publisher = extractPublisher(articleHtml);
        const description = extractDescription(articleHtml);

        // Skip if missing essential data
        if (!url || !title || !url.startsWith('http')) {
            continue;
        }

        // Clean the URL
        const cleanedUrl = cleanUrl(url);

        articles.push({
            type: alertType,
            title,
            description,
            publisher,
            url,
            cleanUrl: cleanedUrl.cleanUrl,
            valid: cleanedUrl.valid,
            emailSubject: metadata.subject,
            emailDate: metadata.date,
            emailId: metadata.id,
        });
    }

    return articles;
}

/**
 * Removes duplicate articles based on URL
 */
export function removeDuplicates(articles: ExtractedArticle[]): ExtractedArticle[] {
    const seenUrls = new Set<string>();
    const uniqueArticles: ExtractedArticle[] = [];

    for (const article of articles) {
        // Use cleanUrl for comparison to catch more duplicates
        const urlKey = article.cleanUrl || article.url;

        if (!seenUrls.has(urlKey)) {
            seenUrls.add(urlKey);
            uniqueArticles.push(article);
        }
    }

    return uniqueArticles;
}

/**
 * Processes a single Google Alert email and extracts articles
 */
export function processGoogleAlertEmail(email: EmailMetadata): ExtractedArticle[] {
    const articles = extractArticlesFromHtml(email.html, {
        subject: email.subject,
        date: email.date,
        id: email.id,
    });

    return removeDuplicates(articles);
}

/**
 * Processes multiple Google Alert emails
 */
export function processMultipleEmails(emails: EmailMetadata[]): ExtractedArticle[] {
    const allArticles: ExtractedArticle[] = [];

    for (const email of emails) {
        const articles = processGoogleAlertEmail(email);
        allArticles.push(...articles);
    }

    // Final deduplication across all emails
    return removeDuplicates(allArticles);
}

/**
 * Converts extracted article to database format
 */
export function toAlertDatabaseRecord(article: ExtractedArticle, userId: string) {
    return {
        user_id: userId,
        source_type: 'gmail_alert' as const,
        alert_type: article.type, // NEWS, WEB, etc.
        title: article.title,
        description: article.description,
        publisher: article.publisher,
        url: article.url,
        clean_url: article.cleanUrl,
        email_subject: article.emailSubject,
        email_date: article.emailDate ? new Date(article.emailDate).toISOString() : null,
        email_id: article.emailId,
        is_valid: article.valid,
        status: 'pending' as const,
        keywords: extractKeywords(article.title + ' ' + article.description),
    };
}

/**
 * Extracts keywords from text for classification
 */
function extractKeywords(text: string): string[] {
    if (!text) return [];

    // Simple keyword extraction - remove common words and get unique terms
    const stopWords = new Set([
        'a', 'o', 'e', 'de', 'da', 'do', 'em', 'um', 'uma', 'para', 'com', 'não',
        'the', 'and', 'or', 'is', 'in', 'to', 'of', 'for', 'on', 'with', 'at',
    ]);

    const words = text
        .toLowerCase()
        .replace(/[^\w\sáéíóúâêîôûãõàèìòùç]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));

    // Get unique keywords (max 10)
    return [...new Set(words)].slice(0, 10);
}
