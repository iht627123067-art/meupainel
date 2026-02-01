/**
 * Classification Service
 * Handles AI classification operations
 */

import { supabase } from "@/integrations/supabase/client";
import { withRetry, withTimeout, isRetryableError, ClassificationError } from "../pipeline/error.handler";
import { getStatusAfterClassification } from "../pipeline/status.manager";
import { updateAlertStatus } from "./alerts.service";

export interface ClassificationResult {
    success: boolean;
    destination?: string;
    confidence_score?: number;
    reasoning?: string;
    error?: string;
}

/**
 * Classify content with AI with retry logic
 */
export async function classifyContent(
    alertId: string
): Promise<ClassificationResult> {
    try {
        const result = await withRetry(
            async () => {
                const { data, error } = await withTimeout(
                    supabase.functions.invoke("classify-content", {
                        body: { alert_id: alertId },
                    }),
                    60000, // 60 second timeout for AI processing
                    "Classification timed out"
                );

                if (error) throw error;
                if (!data.success) {
                    throw new Error(data.error || "Classification failed");
                }
                return data;
            },
            {
                maxAttempts: 2,
                backoffMs: 3000,
                shouldRetry: isRetryableError,
                onRetry: (attempt, error) => {
                    console.log(
                        `Classification attempt ${attempt} failed for alert ${alertId}:`,
                        error.message
                    );
                },
            }
        );

        // Update status based on classification success AND destination
        // Safely check result and destination
        if (!result || typeof result !== 'object') {
            throw new Error("Invalid classification result received");
        }

        let newStatus = getStatusAfterClassification(result.success);

        // Respect explicit "needs_review" from API even if success is true
        if (result.destination === "needs_review") {
            newStatus = "needs_review";
        }

        await updateAlertStatus(alertId, newStatus);

        return result;
    } catch (error) {
        // If all retries failed, move to review
        await updateAlertStatus(alertId, "needs_review");
        throw new ClassificationError(
            `Classification failed after retries: ${(error as Error).message}`,
            alertId
        );
    }
}

/**
 * Re-classify content (for manual retry)
 */
export async function retryClassification(
    alertId: string
): Promise<ClassificationResult> {
    // Reset status to extracted before retry
    await updateAlertStatus(alertId, "extracted");
    return classifyContent(alertId);
}
