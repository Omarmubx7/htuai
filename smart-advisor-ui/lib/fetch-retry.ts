/**
 * Fetch Retry Wrapper with Exponential Backoff
 * Provides reliable network requests with automatic retry logic
 */

export interface FetchRetryOptions extends RequestInit {
    retries?: number;
    retryDelay?: number;
    retryOn?: number[];
    retryCondition?: (response: Response) => boolean;
    onRetry?: (attempt: number, error: Error | null, response: Response | null) => void;
    timeout?: number; // Timeout in milliseconds for each fetch attempt
}

/**
 * Enhanced fetch with automatic retry logic and exponential backoff
 * @param url - The URL to fetch
 * @param options - Fetch options with retry configuration
 * @returns Promise with the fetch response
 */
export async function fetchWithRetry(
    url: string,
    options: FetchRetryOptions = {}
): Promise<Response> {
    const {
        retries = 3,
        retryDelay = 1000,
        retryOn = [408, 429, 500, 502, 503, 504],
        retryCondition,
        onRetry,
        timeout = 30000, // Default 30 second timeout per attempt
        ...fetchOptions
    } = options;

    let lastError: Error | null = null;
    let lastResponse: Response | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(url, { ...fetchOptions, signal: controller.signal });
            clearTimeout(timeoutId);

            // Check if we should retry based on status code
            const shouldRetryStatus = retryOn.includes(response.status);
            const shouldRetryCustom = retryCondition ? retryCondition(response) : false;

            if (!shouldRetryStatus && !shouldRetryCustom) {
                return response;
            }

            lastResponse = response;

            // Don't retry on last attempt
            if (attempt === retries) {
                return response;
            }

            // Calculate exponential backoff delay
            const delay = retryDelay * Math.pow(2, attempt);

            if (onRetry) {
                onRetry(attempt + 1, null, response);
            }

            await new Promise(resolve => setTimeout(resolve, delay));

        } catch (error) {
            clearTimeout(timeoutId);
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on last attempt
            if (attempt === retries) {
                throw lastError;
            }

            // Calculate exponential backoff delay
            const delay = retryDelay * Math.pow(2, attempt);

            if (onRetry) {
                onRetry(attempt + 1, lastError, null);
            }

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    // This should not be reached, but TypeScript needs it
    if (lastError) throw lastError;
    if (lastResponse) return lastResponse;
    throw new Error("Fetch failed after retries");
}

/**
 * Helper for API calls with JSON parsing and error handling
 * @param url - The API endpoint
 * @param options - Fetch options with retry configuration
 * @returns Promise with parsed JSON data
 */
export async function fetchJSON<T = unknown>(
    url: string,
    options: FetchRetryOptions = {}
): Promise<T> {
    const response = await fetchWithRetry(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    return response.json();
}

/**
 * Optimized polling configuration
 */
export const POLLING_INTERVALS = {
    /** Fast polling for critical real-time data (5 seconds) */
    FAST: 5_000,
    /** Normal polling for active monitoring (15 seconds) */
    NORMAL: 15_000,
    /** Slow polling for background updates (60 seconds) */
    SLOW: 60_000,
    /** Very slow polling for rare changes (5 minutes) */
    VERY_SLOW: 300_000,
    /** Admin dashboard refresh (45 seconds - reduced from 30s) */
    ADMIN_REFRESH: 45_000,
    /** Google Calendar sync (3 minutes - increased from 2m) */
    GOOGLE_SYNC: 180_000,
} as const;
