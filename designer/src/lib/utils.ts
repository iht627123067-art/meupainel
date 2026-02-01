import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Tracking parameters to remove from URLs
 */
const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', // Google Analytics
  'ct', 'cd', 'usg', 'ved', 'source', 'client', 'ei', 'sig', 'cad', // Google Search/News
  'ocid', 'cvid', // Microsoft
  'fbclid', // Facebook
  'si', '__twitter_impression', 'twclid', // Social
  'gclid', 'msclkid', // Ad tracking
]);

/**
 * Clean aggregator URLs and remove tracking parameters
 * Handles: Google redirects, MSN/Microsoft Start, tracking params
 */
export function cleanUrl(url: string): string {
  if (!url) return url;

  try {
    let finalUrl = new URL(url);

    // 1. Google Redirects (google.com/url?url=...)
    if (finalUrl.hostname.includes('google.com') && finalUrl.pathname.includes('/url')) {
      const target = finalUrl.searchParams.get('url') || finalUrl.searchParams.get('q');
      if (target) {
        try {
          finalUrl = new URL(decodeURIComponent(target));
        } catch {
          // If target is not a valid URL, keep original
          return url;
        }
      }
    }

    // 2. MSN/Microsoft Start (msn.com/.../ar-ID)
    // The /ar-XXXX pattern is consistent for articles
    // Remove query params as content lives in the path
    if (finalUrl.hostname.includes('msn.com') || finalUrl.hostname.includes('microsoftstart.com')) {
      finalUrl.search = '';
    }

    // 3. Remove Tracking Parameters
    // Preserve essential params (id, v, article_id, p, page, etc.)
    const params = new URLSearchParams(finalUrl.search);
    const keysToDelete: string[] = [];

    params.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key) || key.startsWith('utm_')) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(k => params.delete(k));
    finalUrl.search = params.toString();

    return finalUrl.toString();
  } catch (e) {
    // If URL parsing fails, return original
    return url;
  }
}

/**
 * Legacy alias for backward compatibility
 * @deprecated Use cleanUrl instead
 */
export function cleanGoogleUrl(url: string): string {
  return cleanUrl(url);
}

/**
 * Get the display URL for a pipeline item
 * Prioritizes clean_url (canonical) over url (original)
 */
export function getDisplayUrl(item: { url: string; clean_url?: string | null }): string {
  return item.clean_url || item.url;
}
