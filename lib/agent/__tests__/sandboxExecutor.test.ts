import { describe, expect, it } from "vitest";
import { getDemoSpec } from "../demoSpec";
import { generateAnimationCode } from "../codeGenerator";
import { executeSandbox } from "../sandboxExecutor";

describe("executeSandbox", () => {
  it("loads generated demo code inside the sandbox", () => {
    const spec = getDemoSpec("derivative");
    const result = executeSandbox(generateAnimationCode(spec), spec);

    expect(result.success, result.error).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("rejects dangerous generated code patterns", () => {
    const spec = getDemoSpec("derivative");
    const result = executeSandbox("export default function Bad() { eval('1 + 1') }", spec);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("safety");
  });

  it("rejects suspicious math expressions before sandbox load", () => {
    const spec = structuredClone(getDemoSpec("derivative"));
    spec.steps[0].params.expression = "x; process.exit()";

    const result = executeSandbox(generateAnimationCode(getDemoSpec("derivative")), spec);

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("safety");
  });
});
