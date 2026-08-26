import { describe, expect, it } from "vitest";
import { PROVIDER_DESC } from "../src/components/seed.js";

describe("desktop provider options (T020)", () => {
  it("exposes domestic providers in the provider description map", () => {
    expect(PROVIDER_DESC.deepseek).toContain("DEEPSEEK_API_KEY");
    expect(PROVIDER_DESC.qwen).toContain("DASHSCOPE_API_KEY");
    expect(PROVIDER_DESC.glm).toContain("ZHIPU_API_KEY");
  });
});