import { test, expect } from "bun:test";
import { BaseDisplaySettingsSchema, linkOpacity } from "@/SettingsSchemas";
import { resolveLinkBaseColor } from "@/util/resolveLinkBaseColor";

test("an unset link color falls back to the theme's graph line color", () => {
  expect(BaseDisplaySettingsSchema.parse({}).linkColor).toBe("");
  expect(resolveLinkBaseColor("", "#555555")).toBe("#555555");
});

test("a custom link color overrides the theme color", () => {
  expect(resolveLinkBaseColor("#ff8800", "#555555")).toBe("#ff8800");
});

test("saved settings without the new field still parse, defaulting to unset", () => {
  const parsed = BaseDisplaySettingsSchema.parse({ linkHoverColor: "#0000ff" });
  expect(parsed.linkColor).toBe("");
});

test("link opacity defaults to the previously hard-coded 0.3 and sits inside its slider range", () => {
  expect(BaseDisplaySettingsSchema.parse({}).linkOpacity).toBe(0.3);
  expect(linkOpacity.default).toBeGreaterThanOrEqual(linkOpacity.min);
  expect(linkOpacity.default).toBeLessThanOrEqual(linkOpacity.max);
});
