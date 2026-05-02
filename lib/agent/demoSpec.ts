import { AnimationSpec } from "./types";
import { findTemplateForInput } from "./templates";

export function getDemoSpec(userInput: string): AnimationSpec {
  return structuredClone(findTemplateForInput(userInput).spec);
}
