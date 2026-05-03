import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimitBuckets } from "../rateLimit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitBuckets();
  });

  it("allows requests until the limit is exceeded", () => {
    expect(checkRateLimit("local", 2, 1000, 100).limited).toBe(false);
    const second = checkRateLimit("local", 2, 1000, 200);
    expect(second.limited).toBe(false);
    expect(second.remaining).toBe(0);

    const third = checkRateLimit("local", 2, 1000, 300);
    expect(third.limited).toBe(true);
    expect(third.retryAfterSeconds).toBe(1);
  });

  it("resets buckets after the window expires", () => {
    expect(checkRateLimit("local", 1, 1000, 100).limited).toBe(false);
    expect(checkRateLimit("local", 1, 1000, 200).limited).toBe(true);

    const nextWindow = checkRateLimit("local", 1, 1000, 1200);
    expect(nextWindow.limited).toBe(false);
    expect(nextWindow.remaining).toBe(0);
  });
});
