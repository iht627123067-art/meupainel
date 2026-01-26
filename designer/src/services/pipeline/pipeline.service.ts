/**
 * Pipeline Service
 * Orchestrates the entire pipeline workflow
 */

import { extractContent, retryExtraction } from "../api/content.service";
import { classifyContent, retryClassification } from "../api/classification.service";
import { generateLinkedInPost } from "../api/linkedin.service";
import { updateAlertStatus, deleteAlert } from "../api/alerts.service";
import type { StageId } from "@/types";

/**
 * Move an alert to the next stage in the pipeline
 */
export async function advanceAlert(
    alertId: string,
    currentStage: StageId,
    url?: string,
    userId?: string,
    translate: boolean = false
): Promise<void> {
    switch (currentStage) {
        case "pending":
            if (!url) throw new Error("URL required for extraction");
            await extractContent(alertId, url, translate);
            break;

        case "extracted":
            await classifyContent(alertId);
            break;

        case "classified":
            // Move to approved (manual approval)
            await updateAlertStatus(alertId, "approved");
            break;

        case "approved":
            if (!userId) throw new Error("User ID required for LinkedIn post generation");
            await generateLinkedInPost(alertId, userId);
            await updateAlertStatus(alertId, "published");
            break;

        case "needs_review":
            // Manual review - requires explicit action
            throw new Error("Items in review require manual intervention");

        case "published":
            // Already published, no further action
            throw new Error("Item already published");

        default:
            throw new Error(`Unknown stage: ${currentStage}`);
    }
}

/**
 * Reject an alert
 */
export async function rejectAlert(alertId: string): Promise<void> {
    await updateAlertStatus(alertId, "rejected");
}

/**
 * Delete an alert permanently
 */
export async function removeAlert(alertId: string): Promise<void> {
    await deleteAlert(alertId);
}

/**
 * Retry a failed operation based on current status
 */
export async function retryAlert(
    alertId: string,
    currentStage: StageId,
    url?: string,
    translate: boolean = false
): Promise<void> {
    switch (currentStage) {
        case "needs_review":
        case "pending":
            if (!url) throw new Error("URL required for extraction retry");
            await retryExtraction(alertId, url, translate);
            break;

        case "extracted":
            await retryClassification(alertId);
            break;

        default:
            throw new Error(`Cannot retry from stage: ${currentStage}`);
    }
}

/**
 * Move alert to a specific stage (manual override)
 */
export async function moveToStage(
    alertId: string,
    targetStage: StageId
): Promise<void> {
    await updateAlertStatus(alertId, targetStage);
}
