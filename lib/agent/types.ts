/**
 * Core types for the AnimAgent pipeline
 */

export type AnimationType =
  | "derivative"
  | "integral"
  | "function_graph"
  | "geometry"
  | "algebra_steps";

/** Structured intent extracted from user's natural language input */
export interface AnimationSpec {
  concept: string;
  animationType: AnimationType;
  /** Ordered list of tool calls to execute */
  steps: AnimationStep[];
  /** Narration script lines synced with animation */
  narration: string[];
  /** Total duration in milliseconds */
  durationMs: number;
  /** Educational context for validation */
  expectedOutcome: string;
}

export interface AnimationStep {
  toolName: string;
  params: Record<string, unknown>;
  /** When this step starts, relative to animation start (ms) */
  startMs: number;
  /** Duration of this step (ms) */
  durationMs: number;
  description: string;
}

/** Raw LLM tool call from Function Calling API */
export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string
}

/** Result of sandbox execution */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  errorType?: "syntax" | "runtime" | "semantic" | "timeout";
  output?: unknown;
  durationMs?: number;
}

/** Full pipeline state for one generation request */
export interface AgentState {
  requestId: string;
  userInput: string;
  spec?: AnimationSpec;
  generatedCode?: string;
  executionResult?: ExecutionResult;
  attempts: number;
  maxAttempts: number;
  status: "idle" | "parsing" | "generating" | "executing" | "validating" | "fixing" | "done" | "failed";
  finalCode?: string;
  createdAt: Date;
}

/** Metrics for tracking generation quality */
export interface GenerationMetrics {
  pass1Success: boolean;
  totalAttempts: number;
  totalDurationMs: number;
  errorsEncountered: string[];
}
