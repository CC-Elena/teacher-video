/**
 * 沙盒执行器 — 隔离执行 + 安全检查
 *
 * 生成代码会先经过静态安全扫描，再被 TypeScript 转译为 CommonJS，
 * 最后放进 node:vm 隔离上下文中加载。vm 设置了短超时，并只暴露
 * 最小必要的全局对象，避免把生成代码直接运行在主应用上下文里。
 */

import vm from "node:vm";
import ts from "typescript";
import { AnimationSpec } from "./types";

export interface SandboxResult {
  success: boolean;
  error?: string;
  errorType?: "structural" | "safety" | "semantic" | "timeout";
  warnings: string[];
  executionTimeMs: number;
}

/**
 * 绝对不能出现在生成代码中的危险模式
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
 * 生成代码中必须包含的结构元素
 */
const REQUIRED_ELEMENTS = [
  { pattern: /export\s+default/, label: "'export default' 函数" },
  { pattern: /AnimationSpec/, label: "AnimationSpec 类型引用" },
];

/**
 * 验证 spec 步骤的时间线是否一致
 */
function validateTimeline(spec: AnimationSpec): string[] {
  const warnings: string[] = [];
  
  for (let i = 0; i < spec.steps.length; i++) {
    const step = spec.steps[i];
    if (step.startMs + step.durationMs > spec.durationMs * 1.2) {
      warnings.push(`步骤 ${i} (${step.toolName}) 超出总时长 20% 以上`);
    }
    if (step.durationMs < 100) {
      warnings.push(`步骤 ${i} (${step.toolName}) 的持续时间太短：${step.durationMs}ms`);
    }
  }

  // 检查相同类型的步骤是否有重叠
  for (let i = 0; i < spec.steps.length; i++) {
    for (let j = i + 1; j < spec.steps.length; j++) {
      if (spec.steps[i].toolName === spec.steps[j].toolName) {
        const aEnd = spec.steps[i].startMs + spec.steps[i].durationMs;
        const bStart = spec.steps[j].startMs;
        if (aEnd > bStart && spec.steps[i].startMs < bStart + spec.steps[j].durationMs) {
          warnings.push(
            `步骤 ${i} 和 ${j} (均为 ${spec.steps[i].toolName}) 的时间线存在重叠`
          );
        }
      }
    }
  }

  return warnings;
}

function validateExpressions(spec: AnimationSpec): SandboxResult | null {
  const start = Date.now();

  for (const step of spec.steps) {
    if (!step.params.expression) continue;

    const expr = String(step.params.expression);
    if (/[;{}]/.test(expr)) {
      return {
        success: false,
        error: `表达式包含可疑字符: "${expr}"`,
        errorType: "safety",
        warnings: [],
        executionTimeMs: Date.now() - start,
      };
    }
    if (/\b(import|require|process|global|window|document|constructor|prototype|Function|eval)\b/.test(expr)) {
      return {
        success: false,
        error: `表达式包含不允许的标识符: "${expr}"`,
        errorType: "safety",
        warnings: [],
        executionTimeMs: Date.now() - start,
      };
    }
  }

  return null;
}

function compileInVm(code: string): { success: boolean; error?: string } {
  const output = ts.transpileModule(code, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
    },
    reportDiagnostics: true,
  });

  const diagnostics = output.diagnostics ?? [];
  const blockingDiagnostic = diagnostics.find((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
  if (blockingDiagnostic) {
    return {
      success: false,
      error: ts.flattenDiagnosticMessageText(blockingDiagnostic.messageText, "\n"),
    };
  }

  const generatedModule = { exports: {} as Record<string, unknown> };
  const sandboxRequire = (name: string) => {
    if (name === "mathjs") {
      return {
        evaluate: (expr: string, scope: Record<string, unknown>) => {
          const x = Number(scope.x ?? 0);
          if (expr === "x") return x;
          if (expr === "x^2") return x * x;
          if (expr === "x^3") return x * x * x;
          if (expr === "sin(x)") return Math.sin(x);
          if (expr === "cos(x)") return Math.cos(x);
          return 0;
        },
      };
    }
    if (name === "@/lib/agent/types") return {};
    throw new Error(`沙盒禁止 require("${name}")`);
  };

  const context = vm.createContext({
    module: generatedModule,
    exports: generatedModule.exports,
    require: sandboxRequire,
    console: { error: () => undefined, log: () => undefined, warn: () => undefined },
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    isFinite,
    NaN,
  });

  try {
    const script = new vm.Script(output.outputText, {
      filename: "animagent-generated.cjs",
    });
    script.runInContext(context, { timeout: 200 });
  } catch (error) {
    return { success: false, error: String(error) };
  }

  if (typeof generatedModule.exports.default !== "function") {
    return { success: false, error: "代码加载后没有导出默认组件函数" };
  }

  return { success: true };
}

/**
 * 对生成的代码 + spec 执行沙盒验证
 */
export function executeSandbox(code: string, spec: AnimationSpec): SandboxResult {
  const start = Date.now();
  const warnings: string[] = [];

  // 1. 空代码检查
  if (!code.trim()) {
    return {
      success: false,
      error: "生成的代码为空",
      errorType: "structural",
      warnings: [],
      executionTimeMs: Date.now() - start,
    };
  }

  // 2. 安全扫描
  for (const { pattern, label } of DANGER_PATTERNS) {
    if (pattern.test(code)) {
      return {
        success: false,
        error: `检测到不安全模式: ${label}`,
        errorType: "safety",
        warnings: [],
        executionTimeMs: Date.now() - start,
      };
    }
  }

  // 3. 结构要求
  for (const { pattern, label } of REQUIRED_ELEMENTS) {
    if (!pattern.test(code)) {
      return {
        success: false,
        error: `代码缺少必要元素: ${label}`,
        errorType: "structural",
        warnings: [],
        executionTimeMs: Date.now() - start,
      };
    }
  }

  // 4. 代码大小检查 (异常大的代码可能预示着问题)
  if (code.length > 50000) {
    warnings.push(`生成的代码异常大：${code.length} 字节`);
  }

  // 5. 时间线验证
  const timelineWarnings = validateTimeline(spec);
  warnings.push(...timelineWarnings);

  // 6. 已知工具类型的表达式安全检查
  const expressionError = validateExpressions(spec);
  if (expressionError) {
    return { ...expressionError, warnings, executionTimeMs: Date.now() - start };
  }

  // 7. 在隔离 VM 中加载转译后的模块，捕获语法和初始化错误
  const vmResult = compileInVm(code);
  if (!vmResult.success) {
    return {
      success: false,
      error: `沙盒加载失败: ${vmResult.error}`,
      errorType: "structural",
      warnings,
      executionTimeMs: Date.now() - start,
    };
  }

  return {
    success: true,
    warnings,
    executionTimeMs: Date.now() - start,
  };
}
