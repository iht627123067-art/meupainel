/**
 * Content Service
 * Handles content extraction operations
 */

import { supabase } from "@/integrations/supabase/client";
import { withRetry, withTimeout, isRetryableError, ExtractionError } from "../pipeline/error.handler";
import { shouldMoveToReview, getStatusAfterExtraction } from "../pipeline/status.manager";
import { updateAlertStatus } from "./alerts.service";

export interface ExtractionResult {
    word_count: number;
    quality_score: number;
    markdown_content?: string;
}

/**
 * Extract content from a URL with retry logic
 */
export async function extractContent(
    alertId: string,
    url: string
): Promise<ExtractionResult> {
    try {
        const result = await withRetry(
            async () => {
                const { data, error } = await withTimeout(
                    supabase.functions.invoke("extract-content", {
                        body: { alert_id: alertId, url },
                    }),
                    30000, // 30 second timeout
                    "Content extraction timed out"
                );

                if (error) throw error;
                return data;
            },
            {
                maxAttempts: 3,
                backoffMs: 2000,
                shouldRetry: isRetryableError,
                onRetry: (attempt, error) => {
                    console.log(
                        `Extraction attempt ${attempt} failed for alert ${alertId}:`,
                        error.message
                    );
                },
            }
        );

        // Check if extraction quality is acceptable
        if (shouldMoveToReview(result)) {
            await updateAlertStatus(alertId, "needs_review");
            throw new ExtractionError(
                "Low quality extraction - moved to review",
                alertId
            );
        }

        // Update status to extracted
        const newStatus = getStatusAfterExtraction(result);
        await updateAlertStatus(alertId, newStatus);

        return result;
    } catch (error) {
        // If all retries failed, move to review
        if (error instanceof ExtractionError) {
            throw error;
        }

        await updateAlertStatus(alertId, "needs_review");
        throw new ExtractionError(
            `Extraction failed after retries: ${(error as Error).message}`,
            alertId
        );
    }
}

/**
 * Re-extract content (for manual retry)
 */
export async function retryExtraction(
    alertId: string,
    url: string
): Promise<ExtractionResult> {
    // Reset status to pending before retry
    await updateAlertStatus(alertId, "pending");
    return extractContent(alertId, url);
}
