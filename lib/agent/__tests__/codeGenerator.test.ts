import { describe, expect, it } from "vitest";
import { getDemoSpec } from "../demoSpec";
import { generateAnimationCode } from "../codeGenerator";

describe("generateAnimationCode", () => {
  it("emits a default renderer module for valid specs", () => {
    const code = generateAnimationCode(getDemoSpec("derivative"));

    expect(code).toContain("export default function AnimationPlayer");
    expect(code).toContain("renderDrawFunctionGraph");
    expect(code).toContain("renderDrawTangentLine");
  });

  it("uses mathjs instead of constructing functions from expressions", () => {
    const code = generateAnimationCode(getDemoSpec("integral"));

    expect(code).toContain('import { evaluate } from "mathjs"');
    expect(code).not.toContain("new Function");
  });

  it("emits limit approach renderer when the spec requests it", () => {
    const code = generateAnimationCode(getDemoSpec("limit as x approaches 2"));

    expect(code).toContain("renderDrawLimitApproach");
  });
});
