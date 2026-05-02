/**
 * AnimAgent 流水线的核心类型
 */

export type AnimationType =
  | "derivative"
  | "integral"
  | "limit"
  | "function_graph"
  | "geometry"
  | "algebra_steps";

/** 从用户自然语言输入中提取的结构化意图 */
export interface AnimationSpec {
  concept: string;
  animationType: AnimationType;
  /** 要执行的工具调用排序列表 */
  steps: AnimationStep[];
  /** 与动画同步的旁白脚本行 */
  narration: string[];
  /** 总时长 (毫秒) */
  durationMs: number;
  /** 用于验证的教学上下文 */
  expectedOutcome: string;
}

export interface AnimationStep {
  toolName: string;
  params: Record<string, unknown>;
  /** 此步骤开始的时间，相对于动画开始 (ms) */
  startMs: number;
  /** 此步骤的持续时间 (ms) */
  durationMs: number;
  description: string;
}

/** 来自 Function Calling API 的原始 LLM 工具调用 */
export interface LLMToolCall {
  id: string;
  name: string;
  arguments: string; // JSON 字符串
}

/** 沙盒执行结果 */
export interface ExecutionResult {
  success: boolean;
  error?: string;
  errorType?: "syntax" | "runtime" | "semantic" | "timeout";
  output?: unknown;
  durationMs?: number;
}

/** 单次生成请求的完整流水线状态 */
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

/** 用于追踪生成质量的指标 */
export interface GenerationMetrics {
  pass1Success: boolean;
  totalAttempts: number;
  totalDurationMs: number;
  errorsEncountered: string[];
}
