import { test, expect } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

// Regression test for the settings-panel bug that shipped twice
// (fixed 2026-07-28, silently dropped out of styles.css, re-fixed 2026-08-07).
// Symptom: the gear icon and its panel become unclickable because
// `.graph-settings-view` isn't promoted into its own positioned CSS
// layer, so it can't sit above the 3D canvas and receive pointer events.

const css = readFileSync(join(import.meta.dir, "..", "styles.css"), "utf-8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.[\]]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) {
    throw new Error(`selector not found in styles.css: ${selector}`);
  }
  return match[1] ?? "";
}

test(".graph-settings-view is promoted into its own positioned layer", () => {
  const body = ruleBody(".graph-3d-view .graph-settings-view");
  expect(body).toMatch(/position:\s*absolute/);
  expect(body).toMatch(/z-index:\s*[1-9]\d*/);
});

test("the settings-view layer ignores pointer events by default", () => {
  const body = ruleBody(".graph-3d-view .graph-settings-view");
  expect(body).toMatch(/pointer-events:\s*none/);
});

test("the gear icon and controls opt back into pointer events", () => {
  const body = ruleBody(
    ".graph-3d-view .graph-settings-view > .clickable-icon,\n.graph-3d-view .graph-controls"
  );
  expect(body).toMatch(/pointer-events:\s*auto/);
});
