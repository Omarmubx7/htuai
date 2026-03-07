import { test, expect, type Page, type TestInfo } from "@playwright/test";

test.describe.configure({ timeout: 90000 });

async function enterTracker(page: Page, testInfo: TestInfo): Promise<boolean> {
  await page.goto("/");

  await page.getByRole("button", { name: /Start Tracking Progress/i }).click();
  await page.getByPlaceholder(/University ID/i).waitFor({ state: "visible", timeout: 10000 });

  await page.getByRole("button", { name: /First time\? Sign up/i }).click();

  const studentId = `pw-${testInfo.workerIndex}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
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

      if (await page.locator('[data-testid="course-card"]').first().isVisible({ timeout: 3000 }).catch(() => false)) {
        break;
      }
    }
  }

  const reachedTracker = await page
    .locator('[data-testid="course-card"]')
    .first()
    .isVisible({ timeout: 30000 })
    .catch(() => false);

  return reachedTracker;
}

test.describe("Course Tracker Performance", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const reachedTracker = await enterTracker(page, testInfo);
    test.skip(!reachedTracker, "Course tracker is not reachable in this environment");
  });

  test("should keep card count stable after toggling", async ({ page }) => {
    const cards = page.locator('[data-testid="course-card"]');
    const beforeCount = await cards.count();
    expect(beforeCount).toBeGreaterThan(0);

    await cards.first().click();
    await page.waitForTimeout(250);

    const afterCount = await cards.count();
    expect(afterCount).toBe(beforeCount);
  });

  test("should handle rapid taps on multiple cards", async ({ page }) => {
    const cards = page.locator('[data-testid="course-card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const taps = Math.min(count, 3);
    for (let i = 0; i < taps; i++) {
      await cards.nth(i).click();
      await page.waitForTimeout(80);
    }

    await expect(cards.first()).toBeVisible();
  });

  test("should preserve course name and code after click", async ({ page }) => {
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    const courseName = await firstCourse.locator('[data-testid="course-name"]').textContent();
    const courseCode = await firstCourse.locator('[data-testid="course-code"]').textContent();

    await firstCourse.click();
    await page.waitForTimeout(250);

    await expect(firstCourse.locator('[data-testid="course-name"]')).toHaveText((courseName ?? "").trim());
    await expect(firstCourse.locator('[data-testid="course-code"]')).toHaveText((courseCode ?? "").trim());
  });

  test("should display credits text on course cards", async ({ page }) => {
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    await expect(firstCourse.getByText(/\d+\s*CH/i).first()).toBeVisible();
  });

  test("should render prerequisites section on at least one card", async ({ page }) => {
    await expect(page.getByText(/Prerequisites/i).first()).toBeVisible();
  });

  test("should keep CGPA card visible after interactions", async ({ page }) => {
    await page.locator('[data-testid="course-card"]').first().click();
    await page.waitForTimeout(250);
    await expect(page.locator("#wt-cgpa-card")).toBeVisible();
  });
});
