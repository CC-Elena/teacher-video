/**
 * Sandbox Executor — Enhanced code execution safety check
 * 
 * Replaces the old simulateExecution() with a more thorough analysis.
 * In a production environment, this would use vm2/Worker isolation.
 * For now, we do deep structural + safety validation.
 */

import { AnimationSpec } from "./types";

export interface SandboxResult {
  success: boolean;
  error?: string;
  errorType?: "structural" | "safety" | "semantic" | "timeout";
  warnings: string[];
  executionTimeMs: number;
}

/**
 * Dangerous patterns that must never appear in generated code
 */
const DANGER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\beval\s*\(/, label: "eval()" },
  { pattern: /\bnew\s+Function\b/, label: "new Function()" },
  { pattern: /\bprocess\s*\./, label: "process.*" },
  { pattern: /\brequire\s*\(/, label: "require()" },
  { pattern: /\bimport\s*\(/, label: "dynamic import()" },
  { pattern: /\bfetch\s*\(/, label: "fetch()" },
  { pattern: /\bXMLHttpRequest\b/, label: "XMLHttpRequest" },
  { pattern: /\bdocument\s*\.cookie/, label: "document.cookie" },
  { pattern: /\blocalStorage\b/, label: "localStorage" },
  { pattern: /\bsessionStorage\b/, label: "sessionStorage" },
  { pattern: /\bwindow\s*\.open/, label: "window.open()" },
  { pattern: /\b__proto__\b/, label: "__proto__" },
  { pattern: /\bconstructor\s*\[/, label: "constructor[]" },
];

/**
 * Required structural elements in generated code
 */
const REQUIRED_ELEMENTS = [
  { pattern: /export\s+default/, label: "'export default' function" },
  { pattern: /AnimationSpec/, label: "AnimationSpec type reference" },
];

/**
 * Validate that spec steps timeline is consistent
 */
function validateTimeline(spec: AnimationSpec): string[] {
  const warnings: string[] = [];
  
  for (let i = 0; i < spec.steps.length; i++) {
    const step = spec.steps[i];
    if (step.startMs + step.durationMs > spec.durationMs * 1.2) {
      warnings.push(`Step ${i} (${step.toolName}) extends 20%+ beyond total duration`);
    }
    if (step.durationMs < 100) {
      warnings.push(`Step ${i} (${step.toolName}) has very short duration: ${step.durationMs}ms`);
    }
  }

  // Check for overlapping steps of same type
  for (let i = 0; i < spec.steps.length; i++) {
    for (let j = i + 1; j < spec.steps.length; j++) {
      if (spec.steps[i].toolName === spec.steps[j].toolName) {
        const aEnd = spec.steps[i].startMs + spec.steps[i].durationMs;
        const bStart = spec.steps[j].startMs;
        if (aEnd > bStart && spec.steps[i].startMs < bStart + spec.steps[j].durationMs) {
          warnings.push(
            `Steps ${i} and ${j} (both ${spec.steps[i].toolName}) have overlapping timelines`
          );
        }
      }
    }
  }

  return warnings;
}

/**
 * Execute sandbox validation on generated code + spec
 */
export function executeSandbox(code: string, spec: AnimationSpec): SandboxResult {
  const start = Date.now();
  const warnings: string[] = [];

  // 1. Empty code check
  if (!code.trim()) {
    return {
      success: false,
      error: "Generated code is empty",
      errorType: "structural",
      warnings: [],
      executionTimeMs: Date.now() - start,
    };
  }

  // 2. Safety scan
  for (const { pattern, label } of DANGER_PATTERNS) {
    if (pattern.test(code)) {
      return {
        success: false,
        error: `Unsafe pattern detected: ${label}`,
        errorType: "safety",
        warnings: [],
        executionTimeMs: Date.now() - start,
      };
    }
  }

  // 3. Structural requirements
  for (const { pattern, label } of REQUIRED_ELEMENTS) {
    if (!pattern.test(code)) {
      return {
        success: false,
        error: `Code missing required element: ${label}`,
        errorType: "structural",
        warnings: [],
        executionTimeMs: Date.now() - start,
      };
    }
  }

  // 4. Code size check (suspiciously large code may indicate issues)
  if (code.length > 50000) {
    warnings.push(`Generated code is unusually large: ${code.length} bytes`);
  }

  // 5. Timeline validation
  const timelineWarnings = validateTimeline(spec);
  warnings.push(...timelineWarnings);

  // 6. Expression safety check for known tool types
  for (const step of spec.steps) {
    if (step.params.expression) {
      const expr = String(step.params.expression);
      if (/[;{}]/.test(expr)) {
        return {
          success: false,
          error: `Expression contains suspicious characters: "${expr}"`,
          errorType: "safety",
          warnings,
          executionTimeMs: Date.now() - start,
        };
      }
    }
  }

  return {
    success: true,
    warnings,
    executionTimeMs: Date.now() - start,
  };
}
