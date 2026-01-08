/**
 * LinkedIn Service
 * Handles LinkedIn post generation operations
 */

import { supabase } from "@/integrations/supabase/client";
import { withRetry, withTimeout, isRetryableError } from "../pipeline/error.handler";

export interface LinkedInPostResult {
    post_id: string;
    content: string;
    status: string;
}

/**
 * Generate LinkedIn post with retry logic
 */
export async function generateLinkedInPost(
    alertId: string,
    userId: string
): Promise<LinkedInPostResult> {
    const result = await withRetry(
        async () => {
            const { data, error } = await withTimeout(
                supabase.functions.invoke("generate-linkedin-post", {
                    body: { alert_id: alertId, user_id: userId },
                }),
                60000, // 60 second timeout for AI generation
                "LinkedIn post generation timed out"
            );

            if (error) throw error;
            return data;
        },
        {
            maxAttempts: 2,
            backoffMs: 3000,
            shouldRetry: isRetryableError,
            onRetry: (attempt, error) => {
                console.log(
                    `LinkedIn post generation attempt ${attempt} failed for alert ${alertId}:`,
                    error.message
                );
            },
        }
    );

    return result;
}

/**
 * Fetch LinkedIn posts for an alert
 */
export async function fetchLinkedInPosts(alertId: string) {
    const { data, error } = await supabase
        .from("linkedin_posts")
        .select("*")
        .eq("alert_id", alertId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Update LinkedIn post status
 */
export async function updateLinkedInPostStatus(
    postId: string,
    status: string
): Promise<void> {
    const { error } = await supabase
        .from("linkedin_posts")
        .update({ status })
        .eq("id", postId);

    if (error) throw error;
}

/**
 * Delete LinkedIn post
 */
export async function deleteLinkedInPost(postId: string): Promise<void> {
    const { error } = await supabase
        .from("linkedin_posts")
        .delete()
        .eq("id", postId);

    if (error) throw error;
}
