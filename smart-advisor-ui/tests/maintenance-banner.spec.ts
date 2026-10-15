import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const BASE = "http://localhost:3000";
const MESSAGE = `E2E maintenance notice — should render on every page ${Date.now()}`;

/** Read ADMIN_SECRET without depending on dotenv being wired into the test runner. */
function adminSecret(): string {
  if (process.env.ADMIN_SECRET) return process.env.ADMIN_SECRET;
  for (const file of [".env.local", ".env"]) {
    try {
      const raw = readFileSync(path.join(__dirname, "..", file), "utf8");
      const match = raw.match(/^\s*ADMIN_SECRET\s*=\s*(.+?)\s*$/m);
      if (match) return match[1].replace(/^["']|["']$/g, "");
    } catch {
      /* keep looking */
    }
  }
  return "";
}

async function setMaintenance(enabled: boolean, message?: string) {
  return fetch(`${BASE}/api/admin/settings`, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-admin-secret": adminSecret(),
    },
    body: JSON.stringify({ maintenance: { enabled, ...(message ? { message } : {}) } }),
  });
}

// A representative route from each surface: landing, auth, public legal,
// directory and the admin area. The banner lives in the root layout, so any
// page proves the mount point — these prove it across every layout variant.
const PAGES = ["/", "/login", "/privacy", "/terms", "/ai-transparency", "/resources", "/admin/dashboard"];

test.describe("Maintenance notice shown site-wide", () => {
  test.describe.configure({ timeout: 240000 });

  // One single test on purpose: the maintenance flag is global site state, so
  // parallel tests (or Playwright's 4 browser projects) would toggle it out from
  // under each other. A lone test + try/finally makes the restore unconditional.
  test("renders once on every page", async ({ page }, testInfo) => {
    // The banner is plain DOM in the root layout — browser-agnostic. Running it
    // on one project only keeps the 4 projects from racing the shared flag.
    test.skip(testInfo.project.name !== "chromium", "runs once; flag is global site state");

    const enableRes = await setMaintenance(true, MESSAGE);
    expect(enableRes.status, `enable failed: ${await enableRes.text()}`).toBe(200);

    try {
      for (const route of PAGES) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        const banner = page.getByText(MESSAGE);
        await expect(banner.first()).toBeVisible({ timeout: 30000 });
        // Exactly one banner — guards against the Resources page rendering a
        // second copy alongside the global one.
        await expect(banner).toHaveCount(1);
      }
    } finally {
      const restoreRes = await setMaintenance(false);
      if (restoreRes.status !== 200) {
        console.error(`cleanup returned ${restoreRes.status}; maintenance may still be ON`);
      }
    }
  });
});
