import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Clean Google redirect URLs to get the actual target URL
 */
export function cleanGoogleUrl(url: string): string {
  if (!url) return url;

  try {
    // Handle standard Google redirect
    if (url.includes('google.com/url')) {
      const urlObj = new URL(url);
      const targetUrl = urlObj.searchParams.get('url') || urlObj.searchParams.get('q');
      if (targetUrl) return targetUrl;
    }

    // Handle Google News redirect (news.google.com) - often difficult as it requires fetch, 
    // but sometimes parameters might expose it. For now, return as is if no simple param.
    return url;
  } catch (e) {
    return url;
  }
}
