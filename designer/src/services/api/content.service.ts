/**
 * Content Service
 * Handles content extraction operations
 */

import { supabase } from "@/integrations/supabase/client";
import { withRetry, withTimeout, isRetryableError, ExtractionError } from "../pipeline/error.handler";
import { shouldMoveToReview, getStatusAfterExtraction } from "../pipeline/status.manager";
import { updateAlertStatus } from "./alerts.service";

import { cleanUrl } from "@/lib/utils";

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
    url: string,
    translate: boolean = false
): Promise<ExtractionResult> {
    // Clean URL before processing
    const cleanedUrl = cleanUrl(url);

    try {
        const result = await withRetry(
            async () => {
                const { data, error } = await withTimeout(
                    supabase.functions.invoke("extract-content", {
                        body: { alert_id: alertId, url: cleanedUrl, translate },
                    }),
                    60000, // 60 second timeout to allow for extraction + translation
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
    url: string,
    translate: boolean = false
): Promise<ExtractionResult> {
    // Reset status to pending before retry
    await updateAlertStatus(alertId, "pending");
    return extractContent(alertId, url, translate);
}

/**
 * Save manually edited content
 */
export async function saveManualContent(
    alertId: string,
    content: string
): Promise<void> {
    const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

    // 1. Update extracted_content
    const { error: extractionError } = await supabase
        .from("extracted_content")
        .upsert({
            alert_id: alertId,
            markdown_content: content,
            cleaned_content: content,
            word_count: wordCount,
            quality_score: 1.0, // Manual content is considered high quality
            extraction_status: 'success',
            error_message: null,
            extracted_at: new Date().toISOString()
        }, { onConflict: 'alert_id' });

    if (extractionError) throw extractionError;

    // 2. Update alert status to extracted
    await updateAlertStatus(alertId, "extracted");
}

/**
 * Create a new manual entry with content
 */
export async function createManualEntry(
    title: string,
    url: string,
    publisher: string,
    content: string,
    date?: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const cleanedUrl = cleanUrl(url);

    // Check if an alert with this URL already exists
    const { data: existingAlert } = await supabase
        .from("alerts")
        .select("id")
        .eq("clean_url", cleanedUrl)
        .maybeSingle();

    let alertId: string;

    if (existingAlert) {
        // Update existing alert
        const { error: updateError } = await supabase
            .from("alerts")
            .update({
                title,
                publisher,
                email_date: date || new Date().toISOString(),
                status: 'extracted',
                is_valid: true,
                description: content.substring(0, 200) + "..."
            })
            .eq("id", existingAlert.id);

        if (updateError) throw updateError;
        alertId = existingAlert.id;
    } else {
        // Create new alert
        const { data: alert, error: alertError } = await supabase
            .from("alerts")
            .insert({
                user_id: user.id,
                title,
                url,
                clean_url: cleanedUrl,
                publisher,
                email_date: date || new Date().toISOString(),
                status: 'extracted',
                is_valid: true,
                source_type: 'rss',
                description: content.substring(0, 200) + "..."
            })
            .select()
            .single();

        if (alertError) throw alertError;
        if (!alert) throw new Error("Erro ao criar alerta");
        alertId = alert.id;
    }

    // Save content using existing function
    await saveManualContent(alertId, content);
}

/**
 * Create a new alert from URL and trigger extraction
 */
export async function createAlertAndExtract(
    url: string,
    translate: boolean = false
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Usuário não autenticado");

    const cleanedUrl = cleanUrl(url);

    // Check if an alert with this URL already exists
    const { data: existingAlert } = await supabase
        .from("alerts")
        .select("id")
        .eq("clean_url", cleanedUrl)
        .maybeSingle();

    let alertId: string;

    if (existingAlert) {
        // Update existing alert to retry
        const { error: updateError } = await supabase
            .from("alerts")
            .update({
                title: "Extraindo...",
                status: 'pending',
                is_valid: true
            })
            .eq("id", existingAlert.id);

        if (updateError) throw updateError;
        alertId = existingAlert.id;
    } else {
        // Create new alert
        const { data: alert, error: alertError } = await supabase
            .from("alerts")
            .insert({
                user_id: user.id,
                title: "Extraindo...",
                url,
                clean_url: cleanedUrl,
                status: 'pending',
                is_valid: true,
                source_type: 'rss'
            })
            .select()
            .single();

        if (alertError) throw alertError;
        if (!alert) throw new Error("Erro ao criar alerta");
        alertId = alert.id;
    }

    // Call extraction with a longer UI timeout
    try {
        await withTimeout(
            extractContent(alertId, url, translate),
            100000, // 100s UI timeout for the whole chain
            "A extração está demorando mais que o esperado, mas continuará em segundo plano."
        );
    } catch (error) {
        console.error("Extraction failed or timed out during manual URL add:", error);

        // Ensure title is updated to show it failed to the user
        await supabase.from("alerts").update({
            title: "Problema na Extração (Ajuste Manual)",
            status: "needs_review"
        }).eq("id", alertId);

        throw error;
    }
}
