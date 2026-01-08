/**
 * URL Utilities for cleaning and validating URLs
 * Based on: 2.2 cleanurl.js
 */

/**
 * Decodes HTML entities in a string
 */
export function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&middot;/g, '·');
}

/**
 * Extracts the actual URL from a Google redirect URL
 */
export function extractGoogleRedirectUrl(url: string): string {
    if (!url.includes('google.com/url?')) {
        return url;
    }

    try {
        const urlObj = new URL(url);
        const urlParam = urlObj.searchParams.get('url');

        if (urlParam) {
            return decodeURIComponent(urlParam);
        }

        // Fallback: try regex extraction
        const match = url.match(/[?&]url=([^&]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
    } catch (e) {
        // If URL parsing fails, try basic regex extraction
        const match = url.match(/[?&]url=([^&]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
    }

    return url;
}

/**
 * Removes common tracking parameters from a URL
 */
export function removeTrackingParams(url: string): string {
    try {
        const urlObj = new URL(url);

        // Google tracking params
        urlObj.searchParams.delete('ct');
        urlObj.searchParams.delete('cd');
        urlObj.searchParams.delete('usg');

        // UTM tracking params
        urlObj.searchParams.delete('utm_source');
        urlObj.searchParams.delete('utm_medium');
        urlObj.searchParams.delete('utm_campaign');
        urlObj.searchParams.delete('utm_term');
        urlObj.searchParams.delete('utm_content');

        // Facebook tracking
        urlObj.searchParams.delete('fbclid');

        // Google Analytics
        urlObj.searchParams.delete('gclid');
        urlObj.searchParams.delete('gclsrc');

        // If no query parameters remain, just use origin + pathname
        if (urlObj.search === '' || urlObj.search === '?') {
            return urlObj.origin + urlObj.pathname;
        }

        return urlObj.toString();
    } catch (e) {
        // If URL parsing fails, try basic string manipulation
        return url
            .split('&ct=')[0]
            .split('&cd=')[0]
            .split('&usg=')[0]
            .split('&utm_')[0]
            .split('&fbclid=')[0]
            .split('&gclid=')[0];
    }
}

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 */
export function isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Result of URL cleaning operation
 */
export interface CleanUrlResult {
    originalUrl: string;
    cleanUrl: string;
    valid: boolean;
    skip: boolean;
    reason?: string;
}

/**
 * Cleans a URL by removing Google tracking and HTML entities
 * Main function that combines all cleaning operations
 */
export function cleanUrl(url: string): CleanUrlResult {
    const originalUrl = url;

    // Validate URL format
    if (!url || !url.startsWith('http')) {
        return {
            originalUrl,
            cleanUrl: '',
            valid: false,
            skip: true,
            reason: 'Invalid URL format',
        };
    }

    // Step 1: Decode HTML entities
    let cleanedUrl = decodeHtmlEntities(url);

    // Step 2: Extract actual URL from Google redirect
    cleanedUrl = extractGoogleRedirectUrl(cleanedUrl);

    // Step 3: Remove tracking parameters
    cleanedUrl = removeTrackingParams(cleanedUrl);

    // Validate final URL
    const valid = isValidUrl(cleanedUrl);

    return {
        originalUrl,
        cleanUrl: cleanedUrl,
        valid,
        skip: !valid,
        reason: valid ? undefined : 'URL validation failed after cleaning',
    };
}

/**
 * Batch clean multiple URLs
 */
export function cleanUrls(urls: string[]): CleanUrlResult[] {
    return urls.map(cleanUrl);
}
