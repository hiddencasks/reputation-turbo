import { describe, expect, it } from "vitest";
import { withRateLimitRetry } from "@/lib/ai-visibility/retry";

const far = () => Date.now() + 60_000;

describe("rate limit retry", () => {
  it("asks again after a 429 and returns the answer", async () => {
    let calls = 0;
    const answer = await withRateLimitRetry(async () => {
      calls++;
      if (calls < 3) throw new Error("HTTP 429: Request rate limit exceeded, please try again later.");
      return "ok";
    }, far(), [1, 1]);
    expect(answer).toBe("ok");
    expect(calls).toBe(3);
  });

  it("gives up after the last wait", async () => {
    let calls = 0;
    await expect(withRateLimitRetry(async () => { calls++; throw new Error("HTTP 429: slow down"); }, far(), [1])).rejects.toThrow("HTTP 429");
    expect(calls).toBe(2);
  });

  it("doesn't retry other errors or past the deadline", async () => {
    let calls = 0;
    await expect(withRateLimitRetry(async () => { calls++; throw new Error("HTTP 401: bad key"); }, far(), [1])).rejects.toThrow("401");
    await expect(withRateLimitRetry(async () => { calls++; throw new Error("HTTP 429: slow down"); }, Date.now() + 5, [1_000])).rejects.toThrow("429");
    expect(calls).toBe(2);
  });
});
