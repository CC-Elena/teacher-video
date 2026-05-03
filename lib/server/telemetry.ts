import { mkdir, readFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { AnimationSpec } from "@/lib/agent/types";

export interface GenerationMetrics {
  pass1Success: boolean;
  totalAttempts: number;
  totalDurationMs: number;
  errorsEncountered: string[];
}

export interface GenerationEvent {
  id: string;
  createdAt: string;
  userInput: string;
  concept?: string;
  demoMode: boolean;
  provider: string;
  status: "success" | "fallback";
  metrics: GenerationMetrics;
}

export interface FineTuneExample {
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  metadata: {
    createdAt: string;
    demoMode: boolean;
    pass1Success: boolean;
    totalAttempts: number;
  };
}

export interface GenerationSummary {
  total: number;
  live: number;
  demo: number;
  pass1Success: number;
  averageDurationMs: number;
  averageAttempts: number;
  recent: GenerationEvent[];
}

const dataDir = path.join(process.cwd(), "data");
const eventsPath = path.join(dataDir, "generation-events.jsonl");
const fineTunePath = path.join(dataDir, "fine-tune-examples.jsonl");

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function appendJsonLine(filePath: string, value: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify(value)}\n`, "utf8");
}

export function createGenerationEvent(input: {
  userInput: string;
  spec?: AnimationSpec;
  demoMode: boolean;
  provider: string;
  status: "success" | "fallback";
  metrics: GenerationMetrics;
}): GenerationEvent {
  return {
    id: createId(),
    createdAt: new Date().toISOString(),
    userInput: input.userInput,
    concept: input.spec?.concept,
    demoMode: input.demoMode,
    provider: input.provider,
    status: input.status,
    metrics: input.metrics,
  };
}

export async function recordGenerationEvent(event: GenerationEvent) {
  await appendJsonLine(eventsPath, event);
}

export async function recordFineTuneExample(input: {
  userInput: string;
  spec: AnimationSpec;
  demoMode: boolean;
  metrics: GenerationMetrics;
}) {
  const example: FineTuneExample = {
    messages: [
      { role: "user", content: input.userInput },
      { role: "assistant", content: JSON.stringify(input.spec) },
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      demoMode: input.demoMode,
      pass1Success: input.metrics.pass1Success,
      totalAttempts: input.metrics.totalAttempts,
    },
  };
  await appendJsonLine(fineTunePath, example);
}

export function summarizeGenerationEvents(events: GenerationEvent[]): GenerationSummary {
  const total = events.length;
  const durationSum = events.reduce((sum, event) => sum + event.metrics.totalDurationMs, 0);
  const attemptsSum = events.reduce((sum, event) => sum + event.metrics.totalAttempts, 0);

  return {
    total,
    live: events.filter((event) => !event.demoMode).length,
    demo: events.filter((event) => event.demoMode).length,
    pass1Success: events.filter((event) => event.metrics.pass1Success).length,
    averageDurationMs: total ? Math.round(durationSum / total) : 0,
    averageAttempts: total ? Number((attemptsSum / total).toFixed(2)) : 0,
    recent: events.slice(-20).reverse(),
  };
}

export async function readGenerationEvents(): Promise<GenerationEvent[]> {
  try {
    const raw = await readFile(eventsPath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as GenerationEvent);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
