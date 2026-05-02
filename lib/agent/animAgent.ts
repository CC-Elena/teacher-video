/**
 * AnimAgent 核心
 * 实现 生成 → 执行 → 验证 → 修复 循环
 *
 * 流程：
 *   1. parseIntent: 自然语言 → AnimationSpec (使用 LLM)
 *   2. validate: 检查 spec 的有效性
 *   3. generateCode: AnimationSpec → TypeScript 渲染代码
 *   4. execute: 在沙盒中运行 (此处模拟运行；实际实现使用 vm/iframe)
 *   5. 失败时：注入错误并重试 (最多 N 次)
 */

import OpenAI from "openai";
import { AnimationSpec, AgentState, GenerationMetrics } from "./types";
import {
  SYSTEM_PROMPT,
  selectFewShotExamples,
  buildUserPrompt,
} from "./prompts";
import { validateSpec, parseSpecFromLLMResponse } from "./validator";
import { generateAnimationCode } from "./codeGenerator";
import { executeSandbox } from "./sandboxExecutor";

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
   * 主入口：获取用户自然语言输入 → 返回最终的 AnimationSpec + 代码
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

      // ── 步骤 1: 通过 LLM 生成 AnimationSpec ──────────────────────────
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
        const msg = `JSON 解析错误: ${String(err)}`;
        metrics.errorsEncountered.push(msg);
        lastError = msg;
        continue;
      }

      // ── 步骤 2: 验证 spec ───────────────────────────────────────────
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

      // ── 步骤 3: 生成可执行的 TypeScript 代码 ──────────────────────
      onLog?.(lang === "zh" ? `正在生成 TypeScript React 组件代码...` : `Generating TypeScript React component code...`);
      const code = generateAnimationCode(spec);

      // ── 步骤 4: 沙盒执行检查 ───────────────────────
      onLog?.(lang === "zh" ? `正在执行沙盒安全检查...` : `Executing sandbox safety check...`);
      const execResult = executeSandbox(code, spec);
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

      // ── 成功 ─────────────────────────────────────────────────────────
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
      `AnimAgent 在 ${maxAttempts} 次尝试后失败。最后一次错误: ${lastError}`
    );
  }

  private async callLLM(
    userInput: string,
    previousError?: string,
    previousSpec?: string
  ): Promise<string> {
    // 构建 Few-shot 消息
    const fewShotMessages: OpenAI.Chat.ChatCompletionMessageParam[] = selectFewShotExamples(userInput).flatMap(
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
      temperature: 0.3, // 低温以获得稳定的结构化输出
    });

    return response.choices[0]?.message?.content ?? "";
  }
}
