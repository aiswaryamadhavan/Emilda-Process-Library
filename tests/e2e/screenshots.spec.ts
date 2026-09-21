import { expect, test } from "@playwright/test";

async function hideDevelopmentChrome(page: import("@playwright/test").Page) {
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
}

test("capture final delivery screenshots", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/t/acme/");
  await expect(
    page.getByRole("heading", { name: /Good morning/ }),
  ).toBeVisible();
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/mobile-owner-dashboard.png",
    fullPage: true,
  });
  await page.goto("/t/acme/audits/scorecard-week-38");
  await page.evaluate(() => localStorage.removeItem("emilda:audit:week38"));
  await page.reload();
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/mobile-audit.png",
    fullPage: true,
  });
  await page.goto("/t/acme/approvals/purchase-v21");
  await page.evaluate(() =>
    localStorage.removeItem("emilda:approval:purchase-v21"),
  );
  await page.reload();
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/mobile-approval.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/builder");
  await expect(page.locator(".react-flow")).toBeVisible();
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/process-builder.png",
    fullPage: true,
  });
  await page.goto("/t/acme/");
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/process-health-dashboard.png",
    fullPage: true,
  });

  await page.goto("/t/acme/more/client-profile");
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/client-profile.png",
    fullPage: true,
  });

  await page.goto("/t/acme/processes");
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/process-library-by-department.png",
    fullPage: true,
  });

  await page.goto("/t/acme/processes/new");
  await page.getByRole("button", { name: "Use example" }).click();
  for (let section = 0; section < 4; section += 1)
    await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Create starting draft" }).click();
  await expect(
    page.getByRole("heading", { name: "Customer enquiry handoff" }),
  ).toBeVisible();
  await hideDevelopmentChrome(page);
  await page.screenshot({
    path: "docs/screenshots/process-starter-draft.png",
    fullPage: true,
  });
});
