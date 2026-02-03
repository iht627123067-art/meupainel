/**
 * Alerts Service
 * Handles all CRUD operations for alerts
 */

import { supabase } from "@/integrations/supabase/client";
import type { Alert, AlertStatus, PipelineItem } from "@/types";

/**
 * Fetch all alerts with optional status filter
 */
// Match database enum
export type AlertSourceType = 'gmail_alert' | 'rss';

export interface FetchAlertsOptions {
    statusFilter?: AlertStatus[];
    sourceType?: AlertSourceType;
    select?: string;
    page?: number;
    limit?: number;
    searchTerm?: string;
    topicFilter?: string;
}

/**
 * Fetch all alerts with optional filters
 */
export async function fetchAlerts(
    options: FetchAlertsOptions = {}
): Promise<{ data: any[]; count: number | null }> {
    const { statusFilter, sourceType, select, page = 1, limit = 50, searchTerm, topicFilter } = options;

    // Default selection if not specified (optimized for list view)
    const selectQuery = select || "*";

    let query = supabase
        .from("alerts")
        .select(selectQuery, { count: 'estimated' })
        .order("personalization_score", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

    // Apply specific source filter if valid
    if (sourceType) {
        query = query.eq("source_type", sourceType);
    }

    // Apply server-side search term filter (searches title and description)
    if (searchTerm && searchTerm.trim().length > 0) {
        const term = searchTerm.trim();
        query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,publisher.ilike.%${term}%`);
    }

    // Apply topic filter (predefined topics)
    if (topicFilter && topicFilter !== 'all') {
        // Map topic names to search patterns
        const topicPatterns: Record<string, string[]> = {
            'palantir': ['palantir'],
            'ai': ['artificial intelligence', 'inteligencia artificial', 'AI', 'machine learning'],
            'elections': ['eleicoes', 'eleições', 'election', 'eleitoral'],
            'trump': ['trump'],
            'musk': ['elon', 'musk'],
            'crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain'],
            'tech': ['technology', 'tecnologia', 'startup', 'silicon valley'],
        };

        const patterns = topicPatterns[topicFilter];
        if (patterns && patterns.length > 0) {
            const orClauses = patterns.flatMap(p => [`title.ilike.%${p}%`, `description.ilike.%${p}%`]).join(',');
            query = query.or(orClauses);
        }
    }

    // Apply limit only if positive, otherwise fetch all (careful with large datasets)
    if (limit > 0) {
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);
    }

    if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
    }

    const { data, error, count } = await query;

    if (error) throw error;
    return { data: data || [], count };
}

/**
 * Fetch a single alert by ID
 */
export async function fetchAlertById(id: string): Promise<Alert | null> {
    const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", id)
        .single();

    if (error) throw error;
    // Cast to unknown first to break type inference chain if needed, or just direct cast
    return data as unknown as Alert;
}

/**
 * Update alert status
 */
export async function updateAlertStatus(
    id: string,
    status: AlertStatus
): Promise<void> {
    const { error } = await supabase
        .from("alerts")
        .update({ status })
        .eq("id", id);

    if (error) throw error;
}

/**
 * Update alert fields
 */
export async function updateAlert(
    id: string,
    updates: Partial<Alert>
): Promise<void> {
    const { error } = await supabase
        .from("alerts")
        .update(updates)
        .eq("id", id);

    if (error) throw error;
}

/**
 * Delete an alert
 */
export async function deleteAlert(id: string): Promise<void> {
    const { error } = await supabase.from("alerts").delete().eq("id", id);

    if (error) throw error;
}

/**
 * Group alerts by status
 */
export function groupAlertsByStatus(
    alerts: PipelineItem[]
): Record<string, PipelineItem[]> {
    return {
        pending: alerts.filter((i) => i.status === "pending"),
        extracted: alerts.filter((i) => i.status === "extracted"),
        classified: alerts.filter((i) => i.status === "classified"),
        approved: alerts.filter((i) => i.status === "approved"),
        published: alerts.filter((i) => i.status === "published"),
        needs_review: alerts.filter((i) => i.status === "needs_review"),
    };
}
