import { describe, expect, it } from "vitest";
import { getDemoSpec } from "../demoSpec";
import { ANIMATION_TEMPLATES } from "../templates";
import { parseSpecFromLLMResponse, validateSpec } from "../validator";

describe("validateSpec", () => {
  it("accepts the built-in derivative demo spec", () => {
    const result = validateSpec(getDemoSpec("derivative"));

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("keeps the template library valid", () => {
    expect(ANIMATION_TEMPLATES.length).toBeGreaterThanOrEqual(10);

    for (const template of ANIMATION_TEMPLATES) {
      const result = validateSpec(template.spec);
      expect(result.valid, `${template.id}: ${result.errors.join("; ")}`).toBe(true);
    }
  });

  it("rejects unknown tool names", () => {
    const spec = structuredClone(getDemoSpec("derivative"));
    spec.steps[0].toolName = "plotGraph";

    const result = validateSpec(spec);

    expect(result.valid).toBe(false);
    expect(result.errors.join("\n")).toContain("未知工具名称");
  });

  it("parses JSON wrapped in a markdown code fence", () => {
    const spec = getDemoSpec("integral area");
    const parsed = parseSpecFromLLMResponse(`\`\`\`json\n${JSON.stringify(spec)}\n\`\`\``);

    expect(parsed.concept).toBe(spec.concept);
    expect(parsed.steps).toHaveLength(spec.steps.length);
  });
});
