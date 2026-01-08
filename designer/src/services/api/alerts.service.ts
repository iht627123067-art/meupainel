/**
 * Alerts Service
 * Handles all CRUD operations for alerts
 */

import { supabase } from "@/integrations/supabase/client";
import type { Alert, AlertStatus, PipelineItem } from "@/types";

/**
 * Fetch all alerts with optional status filter
 */
export async function fetchAlerts(
    statusFilter?: AlertStatus[]
): Promise<PipelineItem[]> {
    let query = supabase
        .from("alerts")
        .select(
            "id, title, description, publisher, status, created_at, url, source_url, clean_url, is_valid, linkedin_posts(id, status, created_at)"
        )
        .order("created_at", { ascending: false });

    if (statusFilter && statusFilter.length > 0) {
        query = query.in("status", statusFilter);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data as PipelineItem[]) || [];
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
    return data as Alert;
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
