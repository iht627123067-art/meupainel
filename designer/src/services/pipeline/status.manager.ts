/**
 * Status Manager Service
 * Manages alert status transitions and validation
 */

import type { AlertStatus, StageId } from "@/types";

export const STAGE_ORDER: StageId[] = [
    "pending",
    "extracted",
    "classified",
    "approved",
    "published",
];

/**
 * Get the next stage in the pipeline
 */
export function getNextStage(currentStage: StageId): StageId | null {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    return currentIndex < STAGE_ORDER.length - 1
        ? STAGE_ORDER[currentIndex + 1]
        : null;
}

/**
 * Get the previous stage in the pipeline
 */
export function getPrevStage(currentStage: StageId): StageId | null {
    const currentIndex = STAGE_ORDER.indexOf(currentStage);
    return currentIndex > 0 ? STAGE_ORDER[currentIndex - 1] : null;
}

/**
 * Check if a status transition is valid
 */
export function isValidTransition(
    from: AlertStatus,
    to: AlertStatus
): boolean {
    // Can always reject or mark for review
    if (to === "rejected" || to === "needs_review") {
        return true;
    }

    // Can't move from rejected or published
    if (from === "rejected" || from === "published") {
        return false;
    }

    // Can move forward or backward in the pipeline
    const fromIndex = STAGE_ORDER.indexOf(from as StageId);
    const toIndex = STAGE_ORDER.indexOf(to as StageId);

    return fromIndex !== -1 && toIndex !== -1;
}

/**
 * Determine if an alert needs review based on extraction results
 */
export function shouldMoveToReview(data: {
    wordCount?: number;
    qualityScore?: number;
    error?: string;
}): boolean {
    // No content extracted
    if (data.wordCount === 0) {
        return true;
    }

    // Low quality score
    if (data.qualityScore !== undefined && data.qualityScore < 0.3) {
        return true;
    }

    // Specific error types that need review
    if (data.error) {
        const errorLower = data.error.toLowerCase();
        if (
            errorLower.includes("url_resolution_failed") ||
            errorLower.includes("low_quality") ||
            errorLower.includes("google news")
        ) {
            return true;
        }
    }

    return false;
}

/**
 * Get the appropriate status after extraction
 */
export function getStatusAfterExtraction(data: {
    wordCount: number;
    qualityScore: number;
}): AlertStatus {
    if (shouldMoveToReview(data)) {
        return "needs_review";
    }
    return "extracted";
}

/**
 * Get the appropriate status after classification
 */
export function getStatusAfterClassification(success: boolean): AlertStatus {
    return success ? "classified" : "needs_review";
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: AlertStatus): string {
    const labels: Record<AlertStatus, string> = {
        pending: "Pendente",
        extracted: "Extraído",
        classified: "Classificado",
        approved: "Aprovado",
        rejected: "Rejeitado",
        published: "Publicado",
        needs_review: "Revisão Manual",
    };

    return labels[status] || status;
}
