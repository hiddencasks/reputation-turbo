/** Waits before each retry of a rate-limited question (HTTP 429). */
export const RATE_LIMIT_WAITS_MS = [4_000, 10_000];

/**
 * Asks again when a service says "too many requests at once" (HTTP 429), which happens when
 * several questions reach it together. Other errors, or no time left before the deadline, fail as before.
 */
export async function withRateLimitRetry<T>(ask: () => Promise<T>, deadline: number, waits = RATE_LIMIT_WAITS_MS): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await ask();
    } catch (err) {
      const wait = waits[attempt];
      // Out-of-credit errors also use 429 (OpenAI); waiting won't help those.
      const rateLimited = err instanceof Error && /^HTTP 429\b/.test(err.message) && !/quota|credit|billing/i.test(err.message);
      if (!rateLimited || wait === undefined || Date.now() + wait >= deadline) throw err;
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }
}
