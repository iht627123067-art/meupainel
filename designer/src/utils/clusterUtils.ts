/**
 * Cluster Utilities
 * Generic functions for grouping and sorting items with duplicate detection
 */

import { cleanUrl } from "./urlUtils";

/**
 * Display list entry types
 */
export type DisplayEntry<T> =
    | { type: 'single'; item: T }
    | { type: 'cluster'; items: T[]; groupId: string | number };

/**
 * Item with duplicate_group_id support
 */
export interface DuplicateGroupable {
    duplicate_group_id?: string | null;
    id: string;
    personalization_score?: number | null;
}

/**
 * Article-like item for RSS similarity detection
 */
export interface ArticleLike {
    title: string;
    url: string;
    guid?: string;
    id?: string;
    publisher?: string | null;
    is_duplicate?: boolean;
}

/**
 * Groups items by duplicate_group_id
 * Returns a display list with 'single' or 'cluster' entries
 * 
 * @param items - Array of items with duplicate_group_id property
 * @returns Display list with grouped items
 */
export function groupByDuplicateId<T extends DuplicateGroupable>(
    items: T[]
): DisplayEntry<T>[] {
    const displayList: DisplayEntry<T>[] = [];

    for (const item of items) {
        if (item.duplicate_group_id) {
            // Find existing cluster with same duplicate_group_id
            const existingGroup = displayList.find(
                (entry): entry is { type: 'cluster'; items: T[]; groupId: string | number } =>
                    entry.type === 'cluster' &&
                    entry.items.length > 0 &&
                    entry.items[0].duplicate_group_id === item.duplicate_group_id
            );

            if (existingGroup) {
                existingGroup.items.push(item);
            } else {
                displayList.push({
                    type: 'cluster',
                    items: [item],
                    groupId: item.duplicate_group_id,
                });
            }
        } else {
            displayList.push({ type: 'single', item });
        }
    }

    return displayList;
}

/**
 * Sorts items by highest personalization score
 * For clusters, uses the maximum score in the group
 * 
 * @param items - Array of items or display entries to sort
 * @param getScore - Optional function to extract score from item
 * @returns Sorted array (highest score first)
 */
export function sortByBestScore<T extends DuplicateGroupable>(
    items: T[],
    getScore?: (item: T) => number
): T[] {
    const scoreFn = getScore || ((item: T) => item.personalization_score || 0);
    return [...items].sort((a, b) => scoreFn(b) - scoreFn(a));
}

/**
 * Sorts display list entries by highest score
 * For clusters, uses the maximum score in the group
 * 
 * @param displayList - Display list with single/cluster entries
 * @param getScore - Optional function to extract score from item
 * @returns Sorted display list (highest score first)
 */
export function sortDisplayListByScore<T extends DuplicateGroupable>(
    displayList: DisplayEntry<T>[],
    getScore?: (item: T) => number
): DisplayEntry<T>[] {
    const scoreFn = getScore || ((item: T) => item.personalization_score || 0);

    return [...displayList].sort((a, b) => {
        const scoreA = a.type === 'single'
            ? scoreFn(a.item)
            : Math.max(...a.items.map(scoreFn));

        const scoreB = b.type === 'single'
            ? scoreFn(b.item)
            : Math.max(...b.items.map(scoreFn));

        return scoreB - scoreA;
    });
}

/**
 * Calculates similarity between two titles using Levenshtein-like comparison
 * Returns a value between 0 (completely different) and 1 (identical)
 * 
 * @param title1 - First title
 * @param title2 - Second title
 * @returns Similarity score (0-1)
 */
export function calculateTitleSimilarity(title1: string, title2: string): number {
    const normalize = (str: string) =>
        str
            .toLowerCase()
            .trim()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ');

    const norm1 = normalize(title1);
    const norm2 = normalize(title2);

    if (norm1 === norm2) return 1.0;

    // Check if one title contains the other (high similarity)
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        const shorter = Math.min(norm1.length, norm2.length);
        const longer = Math.max(norm1.length, norm2.length);
        return shorter / longer;
    }

    // Simple word overlap comparison
    const words1 = new Set(norm1.split(' ').filter(w => w.length > 2));
    const words2 = new Set(norm2.split(' ').filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

/**
 * Calculates similarity between two URLs
 * Compares domain and path similarity
 * For RSS feeds: groups articles with same clean_url or similar URLs (same domain + path)
 * 
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns Similarity score (0-1)
 */
export function calculateUrlSimilarity(url1: string, url2: string): number {
    try {
        const clean1 = cleanUrl(url1);
        const clean2 = cleanUrl(url2);

        // Exact clean_url match = identical (strongest signal for RSS feeds)
        if (clean1.cleanUrl && clean2.cleanUrl && clean1.cleanUrl === clean2.cleanUrl) {
            return 1.0;
        }

        const urlObj1 = new URL(clean1.cleanUrl || url1);
        const urlObj2 = new URL(clean2.cleanUrl || url2);

        // Same domain = high similarity
        if (urlObj1.hostname !== urlObj2.hostname) {
            return 0;
        }

        // Same path = identical
        if (urlObj1.pathname === urlObj2.pathname) {
            return 1.0;
        }

        // Compare path similarity
        const path1 = urlObj1.pathname.toLowerCase().split('/').filter(Boolean);
        const path2 = urlObj2.pathname.toLowerCase().split('/').filter(Boolean);

        if (path1.length === 0 && path2.length === 0) return 1.0;
        if (path1.length === 0 || path2.length === 0) return 0.5;

        // Check if paths share significant segments
        const commonSegments = path1.filter(seg => path2.includes(seg));
        const maxLength = Math.max(path1.length, path2.length);

        return commonSegments.length / maxLength;
    } catch {
        // If URL parsing fails, do basic string comparison
        const clean1 = cleanUrl(url1).cleanUrl || url1;
        const clean2 = cleanUrl(url2).cleanUrl || url2;
        return clean1 === clean2 ? 1.0 : 0;
    }
}

/**
 * Checks if two URLs have the same clean_url (exact match)
 * Useful for RSS feeds where same article appears with different tracking parameters
 * 
 * @param url1 - First URL
 * @param url2 - Second URL
 * @returns true if clean URLs match exactly
 */
export function hasSameCleanUrl(url1: string, url2: string): boolean {
    try {
        const clean1 = cleanUrl(url1);
        const clean2 = cleanUrl(url2);
        return clean1.cleanUrl !== null && 
               clean2.cleanUrl !== null && 
               clean1.cleanUrl === clean2.cleanUrl;
    } catch {
        return false;
    }
}

/**
 * Detects similar articles and groups them
 * Creates temporary duplicate_group_id for articles not yet in database
 * 
 * For RSS feeds, groups articles by:
 * 1. Exact clean_url match (strongest signal)
 * 2. URL similarity (same domain + similar path)
 * 3. Title similarity
 * 
 * @param articles - Array of articles to check for similarity
 * @param options - Configuration options
 * @returns Display list with grouped similar articles
 */
export function detectSimilarArticles<T extends ArticleLike>(
    articles: T[],
    options: {
        titleSimilarityThreshold?: number; // Default: 0.7
        urlSimilarityThreshold?: number; // Default: 0.8
        requireBothSimilar?: boolean; // If true, both title AND url must be similar
        prioritizeCleanUrl?: boolean; // If true, exact clean_url match overrides other checks
    } = {}
): DisplayEntry<T & { duplicate_group_id?: string | number }>[] {
    const {
        titleSimilarityThreshold = 0.7,
        urlSimilarityThreshold = 0.8,
        requireBothSimilar = false,
        prioritizeCleanUrl = true,
    } = options;

    const displayList: DisplayEntry<T & { duplicate_group_id?: string | number }>[] = [];
    const processed = new Set<string | number>();
    let nextGroupId = 1;

    for (let i = 0; i < articles.length; i++) {
        const article = articles[i];
        const articleId = article.guid || article.id || `article-${i}`;

        // Skip if already processed or marked as duplicate
        if (processed.has(articleId) || article.is_duplicate) {
            continue;
        }

        // Find similar articles
        const similarArticles: (T & { duplicate_group_id?: string | number })[] = [
            { ...article, duplicate_group_id: nextGroupId },
        ];

        for (let j = i + 1; j < articles.length; j++) {
            const otherArticle = articles[j];
            const otherId = otherArticle.guid || otherArticle.id || `article-${j}`;

            if (processed.has(otherId) || otherArticle.is_duplicate) {
                continue;
            }

            // Check for exact clean_url match first (strongest signal for RSS)
            const hasExactCleanUrl = prioritizeCleanUrl && hasSameCleanUrl(article.url, otherArticle.url);
            
            // Calculate similarities
            const titleSim = calculateTitleSimilarity(article.title, otherArticle.title);
            const urlSim = calculateUrlSimilarity(article.url, otherArticle.url);

            // Determine if articles are similar
            let isSimilar: boolean;
            
            if (hasExactCleanUrl) {
                // Exact clean_url match = always group (even if titles differ slightly)
                isSimilar = true;
            } else if (requireBothSimilar) {
                // Both title AND url must be similar
                isSimilar = titleSim >= titleSimilarityThreshold && urlSim >= urlSimilarityThreshold;
            } else {
                // Either title OR url is similar
                isSimilar = titleSim >= titleSimilarityThreshold || urlSim >= urlSimilarityThreshold;
            }

            if (isSimilar) {
                similarArticles.push({ ...otherArticle, duplicate_group_id: nextGroupId });
                processed.add(otherId);
            }
        }

        processed.add(articleId);

        if (similarArticles.length > 1) {
            // Cluster of similar articles
            displayList.push({
                type: 'cluster',
                items: similarArticles,
                groupId: nextGroupId,
            });
            nextGroupId++;
        } else {
            // Single article
            displayList.push({
                type: 'single',
                item: similarArticles[0],
            });
        }
    }

    return displayList;
}

/**
 * Gets the best item from a cluster based on score
 * Falls back to first item if no scores available
 * 
 * @param items - Array of items in cluster
 * @param getScore - Optional function to extract score
 * @returns Best item from cluster
 */
export function getBestItemFromCluster<T extends DuplicateGroupable>(
    items: T[],
    getScore?: (item: T) => number
): T {
    if (items.length === 0) {
        throw new Error('Cannot get best item from empty cluster');
    }

    const scoreFn = getScore || ((item: T) => item.personalization_score || 0);
    const sorted = sortByBestScore(items, scoreFn);
    return sorted[0];
}

/**
 * Gets the maximum score from a cluster
 * 
 * @param items - Array of items in cluster
 * @param getScore - Optional function to extract score
 * @returns Maximum score in cluster
 */
export function getMaxScoreFromCluster<T extends DuplicateGroupable>(
    items: T[],
    getScore?: (item: T) => number
): number {
    if (items.length === 0) return 0;

    const scoreFn = getScore || ((item: T) => item.personalization_score || 0);
    return Math.max(...items.map(scoreFn));
}
