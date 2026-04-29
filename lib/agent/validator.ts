/**
 * AnimSpec Validator
 * Validates the LLM-generated AnimationSpec before execution.
 * Three validation levels:
 *   1. Schema – required fields, types
 *   2. Tool    – tool names and parameter presence
 *   3. Semantic – timing consistency, reasonable values
 */

import { AnimationSpec } from "./types";
import { TOOL_NAMES } from "../components/animationTools";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSpec(spec: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!spec || typeof spec !== "object") {
    return { valid: false, errors: ["Response is not a JSON object"], warnings: [] };
  }

  const s = spec as Record<string, unknown>;

  // --- Level 1: Schema ---
  if (!s.concept || typeof s.concept !== "string") {
    errors.push("Missing or invalid 'concept' field");
  }
  if (!s.animationType) {
    errors.push("Missing 'animationType' field");
  }
  if (!Array.isArray(s.steps) || s.steps.length === 0) {
    errors.push("'steps' must be a non-empty array");
  }
  if (!Array.isArray(s.narration) || (s.narration as unknown[]).length < 2) {
    errors.push("'narration' must have at least 2 items");
  }
  if (typeof s.durationMs !== "number" || s.durationMs <= 0) {
    errors.push("'durationMs' must be a positive number");
  }

  if (errors.length > 0) return { valid: false, errors, warnings };

  const typedSpec = s as unknown as AnimationSpec;

  // --- Level 2: Tool validation ---
  for (let i = 0; i < typedSpec.steps.length; i++) {
    const step = typedSpec.steps[i];
    if (!TOOL_NAMES.includes(step.toolName)) {
      errors.push(
        `Step ${i}: unknown toolName "${step.toolName}". Valid: ${TOOL_NAMES.join(", ")}`
      );
    }
    if (!step.params || typeof step.params !== "object") {
      errors.push(`Step ${i}: 'params' must be an object`);
    }
    if (typeof step.startMs !== "number" || step.startMs < 0) {
      errors.push(`Step ${i}: 'startMs' must be a non-negative number`);
    }
    if (typeof step.durationMs !== "number" || step.durationMs < 100) {
      errors.push(`Step ${i}: 'durationMs' must be at least 100ms`);
    }

    // Tool-specific required params
    if (step.toolName === "drawFunctionGraph" || step.toolName === "drawTangentLine") {
      if (!step.params.expression) {
        errors.push(`Step ${i} (${step.toolName}): missing required param 'expression'`);
      }
    }
    if (step.toolName === "drawTangentLine" && step.params.atX === undefined) {
      errors.push(`Step ${i} (drawTangentLine): missing required param 'atX'`);
    }
    if (step.toolName === "highlightIntegralArea") {
      if (step.params.fromX === undefined || step.params.toX === undefined) {
        errors.push(`Step ${i} (highlightIntegralArea): missing fromX or toX`);
      }
    }
    if (step.toolName === "showStepByStep") {
      if (!Array.isArray(step.params.steps) || (step.params.steps as unknown[]).length === 0) {
        errors.push(`Step ${i} (showStepByStep): 'steps' param must be a non-empty array`);
      }
    }
  }

  // --- Level 3: Semantic ---
  if (typedSpec.durationMs < 3000) {
    warnings.push("Total duration < 3s may feel too rushed for students");
  }
  if (typedSpec.durationMs > 20000) {
    warnings.push("Total duration > 20s may lose student attention");
  }
  const lastStep = typedSpec.steps[typedSpec.steps.length - 1];
  if (lastStep && lastStep.startMs + lastStep.durationMs > typedSpec.durationMs * 1.1) {
    warnings.push("Last step extends beyond total durationMs");
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Parse LLM response string → AnimationSpec
 * Handles code fences and whitespace robustly
 */
export function parseSpecFromLLMResponse(raw: string): AnimationSpec {
  // Strip markdown code fences if present
  const cleaned = raw
    .replace(/^```(?:json)?\s*/m, "")
    .replace(/\s*```\s*$/m, "")
    .trim();
  return JSON.parse(cleaned) as AnimationSpec;
}
