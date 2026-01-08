/**
 * URL Resolution Service
 * Handles client-side URL cleaning and validation.
 * Heavy lifting (following redirects) is handled by the backend Edge Function.
 */

export class UrlResolver {
    /**
     * Basic client-side URL cleaning.
     * Removes common tracking parameters and decodes Google News redirect URLs if possible without network requests.
     */
    static cleanUrl(url: string): string {
        if (!url) return '';

        try {
            let clean = url;

            // 1. Decode HTML entities
            clean = clean
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'");

            // 2. Extract from google.com/url?
            if (clean.includes('google.com/url?')) {
                const urlObj = new URL(clean);
                const urlParam = urlObj.searchParams.get('url');
                if (urlParam) {
                    clean = decodeURIComponent(urlParam);
                }
            }

            // 3. Remove Tracking Parameters
            const urlObj = new URL(clean);
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'msclkid', 'dclid',
                'ct', 'cd', 'usg', 'oc', 'ucbcb' // Google News specific
            ];

            trackingParams.forEach(param => urlObj.searchParams.delete(param));

            // If query is empty, return only origin + pathname
            if (urlObj.search === '' || urlObj.search === '?') {
                return urlObj.origin + urlObj.pathname;
            }

            return urlObj.toString();
        } catch (e) {
            console.warn('Error cleaning URL:', e);
            return url;
        }
    }

    /**
     * Checks if a URL looks like a Google News redirect
     */
    static isGoogleNewsUrl(url: string): boolean {
        return url.includes('news.google.com') || url.includes('google.com/url');
    }

    /**
     * Validates if a URL is well-formed
     */
    static isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}
