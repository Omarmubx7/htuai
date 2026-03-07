import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry, fetchJSON, POLLING_INTERVALS } from '../lib/fetch-retry';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully fetch on first attempt', async () => {
    const mockResponse = new Response('OK', { status: 200 });
    global.fetch = vi.fn().mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('https://example.com/api');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it('should retry on 500 error and succeed on second attempt', async () => {
    const mockErrorResponse = new Response('Server Error', { status: 500 });
    const mockSuccessResponse = new Response('OK', { status: 200 });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse);

    vi.useFakeTimers();
    
    const promise = fetchWithRetry('https://example.com/api', { retries: 2, retryDelay: 100 });
    
    // Fast-forward time to trigger retry
    await vi.advanceTimersByTimeAsync(100);
    
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);

    vi.useRealTimers();
  });

  it('should use exponential backoff for retries', async () => {
    const mockErrorResponse = new Response('Server Error', { status: 503 });
    const mockSuccessResponse = new Response('OK', { status: 200 });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse);

    vi.useFakeTimers();
    const startTime = Date.now();

    const promise = fetchWithRetry('https://example.com/api', { retries: 3, retryDelay: 100 });
    
    // First retry: 100ms delay
    await vi.advanceTimersByTimeAsync(100);
    
    // Second retry: 200ms delay (exponential backoff: 100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);
    
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result.status).toBe(200);

    vi.useRealTimers();
  });

  it('should throw error after exhausting all retries', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    vi.useFakeTimers();

    const promise = fetchWithRetry('https://example.com/api', { retries: 2, retryDelay: 10 })
      .catch((error) => error); // Suppress unhandled rejection warning

    // Advance through all retries
    await vi.advanceTimersByTimeAsync(10);  // First retry
    await vi.advanceTimersByTimeAsync(20);  // Second retry (exponential backoff)

    const error = await promise;
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe('Network error');
  expect(global.fetch).toHaveBeenCalledTimes(3); // Initial + 2 retries


    vi.useRealTimers();
  });

  it('should not retry on successful status codes', async () => {
    const mockResponse = new Response('OK', { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchWithRetry('https://example.com/api');

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(result.status).toBe(200);
  });

  it('should retry only on specified status codes', async () => {
    const mock429Response = new Response('Too Many Requests', { status: 429 });
    const mockSuccessResponse = new Response('OK', { status: 200 });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(mock429Response)
      .mockResolvedValueOnce(mockSuccessResponse);

    vi.useFakeTimers();

    const promise = fetchWithRetry('https://example.com/api', { 
      retries: 1, 
      retryDelay: 100,
      retryOn: [429] // Only retry on 429
    });

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);

    vi.useRealTimers();
  });

  it('should call onRetry callback with correct attempt number', async () => {
    const mockErrorResponse = new Response('Server Error', { status: 500 });
    const mockSuccessResponse = new Response('OK', { status: 200 });
    const onRetry = vi.fn();

    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockErrorResponse)
      .mockResolvedValueOnce(mockSuccessResponse);

    vi.useFakeTimers();

    const promise = fetchWithRetry('https://example.com/api', { 
      retries: 2, 
      retryDelay: 50,
      onRetry 
    });

    await vi.advanceTimersByTimeAsync(50);
    await promise;

    expect(onRetry).toHaveBeenCalledWith(1, null, mockErrorResponse);
    expect(onRetry).toHaveBeenCalledTimes(1);

    vi.useRealTimers();
  });

  it('should use custom retry condition', async () => {
    // Use status 201 to trigger custom retry logic (not in default retryOn list)
    const mockResponse = new Response('Created', { status: 201 });
    const mockSuccessResponse = new Response('OK', { status: 200 });

    global.fetch = vi.fn()
      .mockResolvedValueOnce(mockResponse)
      .mockResolvedValueOnce(mockSuccessResponse);

    vi.useFakeTimers();

    const promise = fetchWithRetry('https://example.com/api', {
      retries: 1,
      retryDelay: 50,
      retryCondition: (response) => response.status === 201 // Retry on 201
    });

    await vi.advanceTimersByTimeAsync(50);
    const result = await promise;

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.status).toBe(200);

    vi.useRealTimers();
  });
});

describe('fetchJSON', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should parse JSON response successfully', async () => {
    const mockData = { message: 'Success', value: 42 };
    const mockResponse = new Response(JSON.stringify(mockData), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    const result = await fetchJSON<typeof mockData>('https://example.com/api');

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        })
      })
    );
  });

  it('should throw error on non-ok response', async () => {
    const mockResponse = new Response('Not Found', { status: 404 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(fetchJSON('https://example.com/api')).rejects.toThrow('API Error (404): Not Found');
  });

  it('should handle JSON parsing errors gracefully', async () => {
    const mockResponse = new Response('Invalid JSON', { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await expect(fetchJSON('https://example.com/api')).rejects.toThrow();
  });

  it('should merge custom headers with default Content-Type', async () => {
    const mockData = { success: true };
    const mockResponse = new Response(JSON.stringify(mockData), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    await fetchJSON('https://example.com/api', {
      headers: {
        'Authorization': 'Bearer token123',
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123'
        })
      })
    );
  });
});

describe('POLLING_INTERVALS', () => {
  it('should define correct polling intervals', () => {
    expect(POLLING_INTERVALS.FAST).toBe(5_000);
    expect(POLLING_INTERVALS.NORMAL).toBe(15_000);
    expect(POLLING_INTERVALS.SLOW).toBe(60_000);
    expect(POLLING_INTERVALS.VERY_SLOW).toBe(300_000);
  });

  it('should have intervals in ascending order', () => {
    expect(POLLING_INTERVALS.FAST).toBeLessThan(POLLING_INTERVALS.NORMAL);
    expect(POLLING_INTERVALS.NORMAL).toBeLessThan(POLLING_INTERVALS.SLOW);
    expect(POLLING_INTERVALS.SLOW).toBeLessThan(POLLING_INTERVALS.VERY_SLOW);
  });
});
