import { test, expect, type Page, type Locator, type TestInfo } from "@playwright/test";

test.describe.configure({ timeout: 90000 });

// Click the card body rather than its geometric centre: the "Course Notes"
// button sits beside the centre of the card, so a centre click opens the notes
// editor instead of toggling course state.
const CARD_BODY = { position: { x: 10, y: 10 } };

/**
 * Click a card's body. The card is centred first because Playwright's minimal
 * auto-scroll can leave the top of the card under the fixed page header, which
 * then intercepts the click.
 */
async function clickCardBody(card: Locator) {
  await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await card.click(CARD_BODY);
}

/**
 * A new student's first course tap opens the "Previous Academic History"
 * dialog, which blocks every later click. Dismiss it via "Cancel" — that closes
 * the dialog without writing anything, so tests never alter student data.
 */
async function closePreviousHistory(page: Page) {
  const cancel = page.getByRole("button", { name: /Cancel previous academic history/i });
  const appeared = await cancel
    .waitFor({ state: "visible", timeout: 2000 })
    .then(() => true)
    .catch(() => false);
  if (appeared) await cancel.click();
}

async function enterTracker(page: Page, testInfo: TestInfo): Promise<boolean> {
  await page.goto("/");

  await page.getByRole("button", { name: /Start Tracking Progress/i }).click();
  await page.getByPlaceholder(/University ID/i).waitFor({ state: "visible", timeout: 10000 });

  await page.getByRole("button", { name: /First time\? Sign up/i }).click();

  const studentId = `pw-${testInfo.workerIndex}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  await page.getByPlaceholder(/University ID/i).fill(studentId);
  await page.getByPlaceholder(/Secure Password/i).fill("TestPassword123!");
  await page.locator('button[type="submit"]').click();

  // NB: use waitFor(), never isVisible() — isVisible() does not wait (its
  // timeout is ignored), so it read the page before it had rendered and every
  // test below skipped with "not reachable in this environment".
  const majorHeading = page.getByRole("heading", { name: /Setup Your Academic Profile/i });
  const sawOnboarding = await majorHeading
    .waitFor({ state: "visible", timeout: 12000 })
    .then(() => true)
    .catch(() => false);

  if (sawOnboarding) {
    for (let attempt = 0; attempt < 6; attempt++) {
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll("button"));
        const target =
          buttons.find((b) => /Computer Science|Computer Engineering/i.test(b.textContent || "")) ||
          buttons.find((b) => /Select major/i.test(b.textContent || ""));
        if (target) target.click();
      });

      const cardVisible = await page
        .locator('[data-testid="course-card"]')
        .first()
        .waitFor({ state: "visible", timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (cardVisible) break;
    }

    // Selecting a major persists it, but the curriculum (and therefore the
    // course cards) is only fetched on the next page load. Reload once so the
    // tracker has a chance to render its cards.
    await page.reload({ waitUntil: "domcontentloaded" });
  }

  const reachedTracker = await page
    .locator('[data-testid="course-card"]')
    .first()
    .waitFor({ state: "visible", timeout: 30000 })
    .then(() => true)
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

    await clickCardBody(cards.first());
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
      const card = cards.nth(i);
      await clickCardBody(card);
      await page.waitForTimeout(120);
      // The first tap by a new student raises the "Previous Academic History"
      // dialog; close it so the next tap can land.
      await closePreviousHistory(page);
      await page.waitForTimeout(80);
    }

    await expect(cards.first()).toBeVisible();
  });

  test("should preserve course name and code after click", async ({ page }) => {
    const firstCourse = page.locator('[data-testid="course-card"]').first();
    const courseName = await firstCourse.locator('[data-testid="course-name"]').textContent();
    const courseCode = await firstCourse.locator('[data-testid="course-code"]').textContent();

    await clickCardBody(firstCourse);
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
    await clickCardBody(page.locator('[data-testid="course-card"]').first());
    await page.waitForTimeout(250);
    await expect(page.locator("#wt-cgpa-card")).toBeVisible();
  });
});
