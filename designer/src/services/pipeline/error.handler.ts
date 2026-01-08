/**
 * Error Handler Service
 * Provides retry logic with exponential backoff and error handling utilities
 */

export interface RetryConfig {
    maxAttempts: number;
    backoffMs: number;
    shouldRetry?: (error: Error) => boolean;
    onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    backoffMs: 1000,
    shouldRetry: () => true,
};

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {}
): Promise<T> {
    const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;

            // Check if we should retry
            const shouldRetry = finalConfig.shouldRetry?.(lastError) ?? true;
            const isLastAttempt = attempt === finalConfig.maxAttempts;

            if (!shouldRetry || isLastAttempt) {
                throw lastError;
            }

            // Call onRetry callback
            finalConfig.onRetry?.(attempt, lastError);

            // Wait with exponential backoff
            const delay = finalConfig.backoffMs * Math.pow(2, attempt - 1);
            await sleep(delay);
        }
    }

    throw lastError!;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if error is retryable (network errors, timeouts, 5xx errors)
 */
export function isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Network errors
    if (message.includes('network') || message.includes('timeout')) {
        return true;
    }

    // HTTP 5xx errors
    if (message.includes('500') || message.includes('502') ||
        message.includes('503') || message.includes('504')) {
        return true;
    }

    // Supabase function errors that are retryable
    if (message.includes('function invocation failed')) {
        return true;
    }

    return false;
}

/**
 * Check if error indicates low quality extraction
 */
export function isLowQualityError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('low_quality_extraction') ||
        message.includes('word_count') ||
        message.includes('quality_score');
}

/**
 * Check if error indicates URL resolution failure
 */
export function isUrlResolutionError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('url_resolution_failed') ||
        message.includes('google news');
}

/**
 * Create a timeout promise
 */
export function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage = 'Operation timed out'
): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        ),
    ]);
}

/**
 * Error types for better error handling
 */
export class ExtractionError extends Error {
    constructor(message: string, public readonly alertId: string) {
        super(message);
        this.name = 'ExtractionError';
    }
}

export class ClassificationError extends Error {
    constructor(message: string, public readonly alertId: string) {
        super(message);
        this.name = 'ClassificationError';
    }
}

export class UrlResolutionError extends Error {
    constructor(message: string, public readonly url: string) {
        super(message);
        this.name = 'UrlResolutionError';
    }
}
