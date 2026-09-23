import { test, expect } from "bun:test";
import { BaseDisplaySettingsSchema } from "@/SettingsSchemas";
import { resolveLinkArrowColor } from "@/util/resolveLinkArrowColor";

test("an unset arrow color leaves the arrowheads following the link color", () => {
  expect(BaseDisplaySettingsSchema.parse({}).linkArrowColor).toBe("");
  expect(resolveLinkArrowColor("", false)).toBe("");
});

test("a custom arrow color applies to ordinary links", () => {
  expect(resolveLinkArrowColor("#ff8800", false)).toBe("#ff8800");
});

test("highlighted links keep their hover color instead of the custom arrow color", () => {
  expect(resolveLinkArrowColor("#ff8800", true)).toBe("");
});

test("saved settings without the new field still parse, defaulting to unset", () => {
  const parsed = BaseDisplaySettingsSchema.parse({ linkHoverColor: "#0000ff" });
  expect(parsed.linkArrowColor).toBe("");
});
