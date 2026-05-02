/**
 * AnimAgent Core
 * Implements the Generate → Execute → Validate → Fix loop
 *
 * Flow:
 *   1. parseIntent: NL → AnimationSpec (with LLM)
 *   2. validate: check spec validity
 *   3. generateCode: AnimationSpec → TypeScript render code
 *   4. execute: run in sandbox (simulate here; real impl uses vm/iframe)
 *   5. On failure: inject error + retry (max N times)
 */

import OpenAI from "openai";
import { AnimationSpec, AgentState, GenerationMetrics } from "./types";
import {
  SYSTEM_PROMPT,
  FEW_SHOT_EXAMPLES,
  buildUserPrompt,
} from "./prompts";
import { validateSpec, parseSpecFromLLMResponse } from "./validator";
import { generateAnimationCode } from "./codeGenerator";

export class AnimAgent {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o", baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL,
      maxRetries: 0,
      timeout: 15000,
    });
    this.model = model;
  }

  /**
   * Main entry point: takes user NL input → returns final AnimationSpec + code
   */
  async run(
    userInput: string,
    maxAttempts = 3,
    onProgress?: (state: Partial<AgentState>) => void,
    onLog?: (message: string) => void,
    lang: "en" | "zh" = "zh"
  ): Promise<{ spec: AnimationSpec; code: string; metrics: GenerationMetrics }> {
    const startTime = Date.now();
    const metrics: GenerationMetrics = {
      pass1Success: false,
      totalAttempts: 0,
      totalDurationMs: 0,
      errorsEncountered: [],
    };

    let lastError: string | undefined;
    let lastSpecJson: string | undefined;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      metrics.totalAttempts = attempt;
      onProgress?.({ status: attempt === 1 ? "generating" : "fixing", attempts: attempt });
      onLog?.(lang === "zh" 
        ? `第 ${attempt} 次尝试：开始生成动画...` 
        : `Attempt #${attempt}: Starting animation generation...`);

      // ── Step 1: Generate AnimationSpec via LLM ──────────────────────────
      let spec: AnimationSpec;
      let specJson: string;
      try {
        onLog?.(lang === "zh" ? `正在调用 LLM (${this.model})...` : `Calling LLM (${this.model})...`);
        const raw = await this.callLLM(userInput, lastError, lastSpecJson);
        onLog?.(lang === "zh" 
          ? `LLM 已响应，返回了 ${raw.length} 字节的 JSON 数据。` 
          : `LLM responded with ${raw.length} bytes of JSON.`);
        spec = parseSpecFromLLMResponse(raw);
        specJson = JSON.stringify(spec, null, 2);
        lastSpecJson = specJson;
      } catch (err) {
        const msg = `JSON parse error: ${String(err)}`;
        metrics.errorsEncountered.push(msg);
        lastError = msg;
        continue;
      }

      // ── Step 2: Validate spec ───────────────────────────────────────────
      onProgress?.({ status: "validating" });
      onLog?.(lang === "zh" ? `正在验证 AnimationSpec 结构...` : `Validating AnimationSpec structure...`);
      const validation = validateSpec(spec);
      if (!validation.valid) {
        const msg = lang === "zh" 
          ? `验证失败：${validation.errors.join("; ")}` 
          : `Validation failed: ${validation.errors.join("; ")}`;
        onLog?.(`❌ ${msg}`);
        metrics.errorsEncountered.push(msg);
        lastError = msg;
        lastSpecJson = specJson;
        continue;
      }

      // ── Step 3: Generate executable TypeScript code ──────────────────────
      onLog?.(lang === "zh" ? `正在生成 TypeScript React 组件代码...` : `Generating TypeScript React component code...`);
      const code = generateAnimationCode(spec);

      // ── Step 4: Simulate execution (sandbox check) ───────────────────────
      // In production this runs in a vm2 / iframe sandbox.
      // Here we do a structural sanity check.
      onLog?.(lang === "zh" ? `正在执行沙盒安全检查...` : `Executing sandbox safety check...`);
      const execResult = simulateExecution(code);
      if (!execResult.success) {
        const msg = lang === "zh" 
          ? `执行错误：${execResult.error}` 
          : `Execution error: ${execResult.error}`;
        onLog?.(`❌ ${msg}`);
        metrics.errorsEncountered.push(msg);
        lastError = msg;
        lastSpecJson = specJson;
        continue;
      }

      // ── Success ─────────────────────────────────────────────────────────
      if (attempt === 1) metrics.pass1Success = true;
      metrics.totalDurationMs = Date.now() - startTime;
      onLog?.(lang === "zh" 
        ? `✅ 成功！动画在 ${metrics.totalDurationMs}ms 内生成。` 
        : `✅ Success! Animation generated in ${metrics.totalDurationMs}ms.`);
      onProgress?.({ status: "done", finalCode: code });

      return { spec, code, metrics };
    }

    metrics.totalDurationMs = Date.now() - startTime;
    throw new Error(
      `AnimAgent failed after ${maxAttempts} attempts. Last error: ${lastError}`
    );
  }

  private async callLLM(
    userInput: string,
    previousError?: string,
    previousSpec?: string
  ): Promise<string> {
    // Build few-shot messages
    const fewShotMessages: OpenAI.Chat.ChatCompletionMessageParam[] = FEW_SHOT_EXAMPLES.flatMap(
      (ex) => [
        { role: "user" as const, content: ex.user },
        { role: "assistant" as const, content: JSON.stringify(ex.spec, null, 2) },
      ]
    );

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...fewShotMessages,
      { role: "user", content: buildUserPrompt(userInput, previousError, previousSpec) },
    ];

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.3, // Low temp for stable structured output
    });

    return response.choices[0]?.message?.content ?? "";
  }
}

/**
 * Lightweight structural check on generated code.
 * Real impl: run in isolated vm2 or Worker with timeout.
 */
function simulateExecution(code: string): { success: boolean; error?: string } {
  if (!code.trim()) {
    return { success: false, error: "Generated code is empty" };
  }
  if (!code.includes("export default")) {
    return { success: false, error: "Code missing 'export default' function" };
  }
  if (!code.includes("AnimationSpec")) {
    return { success: false, error: "Code does not reference AnimationSpec type" };
  }
  // Check for unsafe patterns
  const dangerPatterns = [/eval\s*\(/, /process\.exit/, /require\s*\(/];
  for (const p of dangerPatterns) {
    if (p.test(code)) {
      return { success: false, error: `Unsafe pattern detected: ${p.source}` };
    }
  }
  return { success: true };
}
