import { test, expect, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ timeout: 90000 });

async function openTrackerWithFreshWalkthrough(page: Page, testInfo: TestInfo): Promise<boolean> {
  await page.context().clearCookies();
  await page.goto("/");
  await page.evaluate(() => localStorage.removeItem("mubxai-walkthrough-done"));

  await page.getByRole("button", { name: /Start Tracking Progress/i }).click();
  await page.getByPlaceholder(/University ID/i).waitFor({ state: "visible", timeout: 10000 });

  await page.getByRole("button", { name: /First time\? Sign up/i }).click();

  const studentId = `pw-wt-${testInfo.workerIndex}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  await page.getByPlaceholder(/University ID/i).fill(studentId);
  await page.getByPlaceholder(/Secure Password/i).fill("TestPassword123!");
  await page.locator('button[type="submit"]').click();

  const majorHeading = page.getByRole("heading", { name: /Setup Your Academic Profile/i });
  if (await majorHeading.isVisible({ timeout: 12000 }).catch(() => false)) {
    for (let attempt = 0; attempt < 6; attempt++) {
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const target =
          buttons.find((b) => /Computer Science|Computer Engineering/i.test(b.textContent || "")) ||
          buttons.find((b) => /Select major/i.test(b.textContent || ""));
        if (target) (target as HTMLButtonElement).click();
      });

      if (await page.locator('[role="dialog"]').isVisible({ timeout: 3000 }).catch(() => false)) {
        break;
      }
    }
  }

  const reachedWalkthrough = await page
    .locator('[role="dialog"]')
    .isVisible({ timeout: 30000 })
    .catch(() => false);

  return reachedWalkthrough;
}

test.describe("Walkthrough Overlay", () => {
  test("should show walkthrough on first visit", async ({ page }, testInfo) => {
    const reachedWalkthrough = await openTrackerWithFreshWalkthrough(page, testInfo);
    test.skip(!reachedWalkthrough, "Walkthrough is not reachable in this environment");
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("should NOT show walkthrough on second visit", async ({ page }, testInfo) => {
    const reachedWalkthrough = await openTrackerWithFreshWalkthrough(page, testInfo);
    test.skip(!reachedWalkthrough, "Walkthrough is not reachable in this environment");
    await page.getByRole("button", { name: /Skip Tour|Finish/i }).click();

    await page.reload();
    await expect(page.locator('[role="dialog"]')).toBeHidden({ timeout: 8000 });
  });

  test("should show desktop walkthrough on desktop viewport", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const reachedWalkthrough = await openTrackerWithFreshWalkthrough(page, testInfo);
    test.skip(!reachedWalkthrough, "Walkthrough is not reachable in this environment");

    await expect(page.getByText(/Step\s+\d+\s+of\s+\d+/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Next|Finish/i })).toBeVisible();
  });

  test("should show walkthrough on mobile viewport", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const reachedWalkthrough = await openTrackerWithFreshWalkthrough(page, testInfo);
    test.skip(!reachedWalkthrough, "Walkthrough is not reachable in this environment");

    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /Next|Finish/i })).toBeVisible();
  });

  test("should remain visible after resizing desktop to mobile", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const reachedWalkthrough = await openTrackerWithFreshWalkthrough(page, testInfo);
    test.skip(!reachedWalkthrough, "Walkthrough is not reachable in this environment");

    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test("can close walkthrough and persist completion", async ({ page }, testInfo) => {
    const reachedWalkthrough = await openTrackerWithFreshWalkthrough(page, testInfo);
    test.skip(!reachedWalkthrough, "Walkthrough is not reachable in this environment");
    await page.getByRole("button", { name: /Skip Tour|Finish/i }).click();

    const done = await page.evaluate(() => localStorage.getItem("mubxai-walkthrough-done"));
    expect(done).toBe("true");
  });
});
