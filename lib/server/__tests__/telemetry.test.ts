import { describe, expect, it } from "vitest";
import { GenerationEvent, summarizeGenerationEvents } from "../telemetry";

const baseEvent: GenerationEvent = {
  id: "evt-1",
  createdAt: "2026-05-02T00:00:00.000Z",
  userInput: "讲解导数",
  concept: "导数",
  demoMode: false,
  provider: "openai",
  status: "success",
  metrics: {
    pass1Success: true,
    totalAttempts: 1,
    totalDurationMs: 1200,
    errorsEncountered: [],
  },
};

describe("summarizeGenerationEvents", () => {
  it("aggregates performance and fallback counters", () => {
    const summary = summarizeGenerationEvents([
      baseEvent,
      {
        ...baseEvent,
        id: "evt-2",
        demoMode: true,
        status: "fallback",
        metrics: {
          pass1Success: false,
          totalAttempts: 3,
          totalDurationMs: 2400,
          errorsEncountered: ["timeout"],
        },
      },
    ]);

    expect(summary.total).toBe(2);
    expect(summary.live).toBe(1);
    expect(summary.demo).toBe(1);
    expect(summary.pass1Success).toBe(1);
    expect(summary.averageDurationMs).toBe(1800);
    expect(summary.averageAttempts).toBe(2);
    expect(summary.recent).toHaveLength(2);
    expect(summary.recent[0].id).toBe("evt-2");
  });
});
