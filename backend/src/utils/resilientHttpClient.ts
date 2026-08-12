import CircuitBreaker from "opossum";

export interface ResilientOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  errorThresholdPercentage?: number;
  resetTimeoutMs?: number;
  volumeThreshold?: number;
  name?: string;
}

export interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<Omit<ResilientOptions, "name">> = {
  maxRetries: 3,
  retryDelayMs: 200,
  timeoutMs: 10000,
  errorThresholdPercentage: 50,
  resetTimeoutMs: 10000,
  volumeThreshold: 3,
};

const breakersMap = new Map<string, CircuitBreaker<[string, RequestOptions?], Response>>();

function isTransientError(error: any, response?: Response): boolean {
  if (response) {
    return response.status >= 500 && response.status <= 599;
  }
  if (!error) return false;
  const code = error.code || error.name;
  if (
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "TimeoutError" ||
    code === "AbortError" ||
    error.message?.includes("fetch failed") ||
    error.message?.includes("timeout") ||
    error.message?.includes("aborted")
  ) {
    return true;
  }
  return true;
}

export async function fetchWithRetry(url: string, options?: RequestOptions): Promise<Response> {
  const maxRetries = options?.maxRetries ?? DEFAULT_OPTIONS.maxRetries;
  const initialDelay = options?.retryDelayMs ?? DEFAULT_OPTIONS.retryDelayMs;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_OPTIONS.timeoutMs;

  let lastError: any;
  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(url, {
        method: options?.method ?? "GET",
        headers: options?.headers,
        body: options?.body,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (res.ok) {
        return res;
      }

      if (res.status >= 500 && res.status <= 599 && attempt < maxRetries) {
        lastResponse = res;
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return res;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries && isTransientError(err)) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw err;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError ?? new Error(`Request to ${url} failed after ${maxRetries} attempts`);
}

export function getOrCreateCircuitBreaker(
  serviceKey: string,
  options?: ResilientOptions
): CircuitBreaker<[string, RequestOptions?], Response> {
  let breaker = breakersMap.get(serviceKey);
  if (!breaker) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const breakerOptions: CircuitBreaker.Options = {
      timeout: opts.timeoutMs,
      errorThresholdPercentage: opts.errorThresholdPercentage,
      resetTimeout: opts.resetTimeoutMs,
      volumeThreshold: opts.volumeThreshold,
      name: serviceKey,
    };

    breaker = new CircuitBreaker(async (url: string, reqOpts?: RequestOptions) => {
      return await fetchWithRetry(url, reqOpts);
    }, breakerOptions);

    breaker.on("open", () => {
      console.warn(`[CircuitBreaker] Circuit OPEN for service: ${serviceKey}`);
    });
    breaker.on("halfOpen", () => {
      console.info(`[CircuitBreaker] Circuit HALF-OPEN for service: ${serviceKey}`);
    });
    breaker.on("close", () => {
      console.info(`[CircuitBreaker] Circuit CLOSED for service: ${serviceKey}`);
    });

    breakersMap.set(serviceKey, breaker);
  }
  return breaker;
}

export async function resilientFetch(
  url: string,
  options?: RequestOptions,
  resilientOpts?: ResilientOptions
): Promise<Response> {
  let serviceKey = resilientOpts?.name;
  if (!serviceKey) {
    try {
      serviceKey = new URL(url).origin;
    } catch {
      serviceKey = "default_service";
    }
  }
  const breaker = getOrCreateCircuitBreaker(serviceKey, resilientOpts);
  return await breaker.fire(url, options);
}

export function clearCircuitBreakers(): void {
  for (const [, breaker] of breakersMap) {
    breaker.shutdown();
  }
  breakersMap.clear();
}
