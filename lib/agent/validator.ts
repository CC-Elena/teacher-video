/**
 * AnimSpec 验证器
 * 在执行前验证 LLM 生成的 AnimationSpec。
 * 三个验证级别：
 *   1. Schema – 必需字段、类型
 *   2. 工具    – 工具名称和参数是否存在
 *   3. 语义    – 时间一致性、合理值
 */

import { AnimationSpec } from "./types";
import { TOOL_NAMES } from "../components/animationTools";
import { evaluate, parse } from "mathjs";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSpec(spec: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec || typeof spec !== "object") {
    return { valid: false, errors: ["响应不是一个 JSON 对象"], warnings: [] };
  }

  const s = spec as Record<string, unknown>;

  // --- 级别 1: Schema ---
  if (!s.concept || typeof s.concept !== "string") {
    errors.push("缺少或无效的 'concept' 字段");
  }
  if (!s.animationType) {
    errors.push("缺少 'animationType' 字段");
  }
  if (!Array.isArray(s.steps) || s.steps.length === 0) {
    errors.push("'steps' 必须是一个非空数组");
  }
  if (!Array.isArray(s.narration) || (s.narration as unknown[]).length < 2) {
    errors.push("'narration' 必须至少包含 2 个条目");
  }
  if (typeof s.durationMs !== "number" || s.durationMs <= 0) {
    errors.push("'durationMs' 必须是一个正数");
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  const typedSpec = s as unknown as AnimationSpec;

  // --- 级别 2: 工具验证 ---
  for (let i = 0; i < typedSpec.steps.length; i++) {
    const step = typedSpec.steps[i];
    if (!TOOL_NAMES.includes(step.toolName)) {
      errors.push(
        `步骤 ${i}: 未知工具名称 "${step.toolName}"。有效名称: ${TOOL_NAMES.join(", ")}`
      );
    }
    if (!step.params || typeof step.params !== "object") {
      errors.push(`步骤 ${i}: 'params' 必须是一个对象`);
    }
    if (typeof step.startMs !== "number" || step.startMs < 0) {
      errors.push(`步骤 ${i}: 'startMs' 必须是一个非负数`);
    }
    if (typeof step.durationMs !== "number" || step.durationMs < 100) {
      errors.push(`步骤 ${i}: 'durationMs' 必须至少为 100ms`);
    }

    if (step.params?.expression) {
      const expression = String(step.params.expression);
      try {
        parse(expression);
        for (const sampleX of [-2, -0.5, 0.5, 2]) {
          const value = evaluate(expression, {
            x: sampleX,
            sin: Math.sin,
            cos: Math.cos,
            tan: Math.tan,
            sqrt: Math.sqrt,
            abs: Math.abs,
            pi: Math.PI,
            e: Math.E,
            log: Math.log,
            pow: Math.pow,
          });
          if (typeof value !== "number" || Number.isNaN(value)) {
            warnings.push(`步骤 ${i}: expression 在 x=${sampleX} 处不能得到数值`);
          }
        }
      } catch (error) {
        errors.push(`步骤 ${i}: expression 不是有效的 mathjs 表达式 (${String(error)})`);
      }
    }

    // 工具特定的必需参数
    if (step.toolName === "drawFunctionGraph" || step.toolName === "drawTangentLine") {
      if (!step.params.expression) {
        errors.push(`步骤 ${i} (${step.toolName}): 缺少必需参数 'expression'`);
      }
    }
    if (step.toolName === "drawTangentLine" && step.params.atX === undefined) {
      errors.push(`步骤 ${i} (drawTangentLine): 缺少必需参数 'atX'`);
    }
    if (step.toolName === "highlightIntegralArea") {
      if (step.params.fromX === undefined || step.params.toX === undefined) {
        errors.push(`步骤 ${i} (highlightIntegralArea): 缺少 fromX 或 toX`);
      }
    }
    if (step.toolName === "drawLimitApproach") {
      if (!step.params.expression) {
        errors.push(`步骤 ${i} (drawLimitApproach): 缺少必需参数 'expression'`);
      }
      if (step.params.approachX === undefined) {
        errors.push(`步骤 ${i} (drawLimitApproach): 缺少必需参数 'approachX'`);
      }
    }
    if (step.toolName === "showStepByStep") {
      if (!Array.isArray(step.params.steps) || (step.params.steps as unknown[]).length === 0) {
        errors.push(`步骤 ${i} (showStepByStep): 'steps' 参数必须是一个非空数组`);
      }
    }
  }

  // --- 级别 3: 语义 ---
  if (typedSpec.durationMs < 3000) {
    warnings.push("总时长 < 3秒 可能会让学生感到太仓促");
  }
  if (typedSpec.durationMs > 20000) {
    warnings.push("总时长 > 20秒 可能会让学生失去注意力");
  }
  const lastStep = typedSpec.steps[typedSpec.steps.length - 1];
  if (lastStep && lastStep.startMs + lastStep.durationMs > typedSpec.durationMs * 1.1) {
    warnings.push("最后一步超出了总时长 (durationMs)");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * 将 LLM 响应字符串解析为 AnimationSpec
 * 稳健地处理代码块和空白符
 */
export function parseSpecFromLLMResponse(raw: string): AnimationSpec {
  // 如果存在 Markdown 代码块，则将其剥离
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  return JSON.parse(cleaned) as AnimationSpec;
}
