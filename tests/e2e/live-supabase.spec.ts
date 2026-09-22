import { expect, test } from "@playwright/test";
import { processHtml } from "./process-starter-fixture";

test.skip(
  !process.env.LIVE_SUPABASE_E2E,
  "Runs only against the disposable local Supabase stack.",
);

test.describe.configure({ timeout: 90000 });

async function signIn(
  page: import("@playwright/test").Page,
  email: string,
  next = "/t/acme/",
) {
  await page.goto(next);
  await expect(page).toHaveURL(/\/auth\/login/);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("EmildaDemo!2026");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  const canonicalNext = next.endsWith("/") ? next.slice(0, -1) : next;
  await expect(page).toHaveURL(
    new RegExp(`${canonicalNext.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?$`),
  );
}

test("direct tenant sign-in preserves local navigation context", async ({
  page,
}) => {
  await page.goto("/t/acme/auth/login");
  await page.getByLabel("Email").fill("owner@acme.emilda.test");
  await page.getByLabel("Password").fill("EmildaDemo!2026");
  await page.getByRole("button", { name: "Sign in with email" }).click();
  await expect(page).toHaveURL(/\/t\/acme\/?$/);

  await page
    .getByRole("link", { name: "Processes", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/t\/acme\/processes$/);
  await expect(
    page.getByRole("heading", { name: "Processes", level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create process" }),
  ).toHaveAttribute("href", "/t/acme/processes/new");
  await expect(
    page.getByRole("link", { name: "Open Purchase Approval" }),
  ).toHaveAttribute(
    "href",
    "/t/acme/processes/50000000-0000-4000-8000-000000000002",
  );
});

test("live owner approval is immutable and cross-tenant access is hidden", async ({
  page,
}) => {
  await signIn(page, "owner@acme.emilda.test");
  await expect(
    page.getByRole("heading", { name: /Good morning/ }),
  ).toBeVisible();
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/builder");
  await expect(
    page.getByRole("heading", { name: "You can view this process" }),
  ).toBeVisible();
  const crossTenant = await page.goto("/t/northstar/processes/service-handoff");
  expect(crossTenant?.status()).toBe(404);
  await page.goto("/t/acme/approvals/purchase-v21");
  await page.getByRole("button", { name: "Approve process" }).click();
  await page
    .getByRole("button", { name: "I have reviewed and approve" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Process approved" }),
  ).toBeVisible();
});

test("live Guardian can edit, resume an audit, and attach tenant-scoped evidence", async ({
  page,
}) => {
  await signIn(page, "guardian@acme.emilda.test");
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/builder");
  await expect(
    page.getByRole("heading", { name: "Editable process map", level: 1 }),
  ).toBeVisible();
  await page.goto("/t/acme/audits/scorecard-week-38");
  await page.getByText("Yes", { exact: true }).click();
  await page.getByRole("button", { name: "Save & next" }).click();
  await page.reload();
  await expect(page.getByText("2 of 6 checkpoints")).toBeVisible();
  const upload = page.locator('input[type="file"]').first();
  await upload.setInputFiles({
    name: "dispatch.png",
    mimeType: "image/png",
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0]),
  });
  await expect(
    page.getByRole("status").filter({
      hasText: "dispatch.png attached securely",
    }),
  ).toBeVisible();
});

test("live Viewer cannot discover a restricted process URL", async ({
  page,
}) => {
  await signIn(page, "viewer@acme.emilda.test");
  await page.goto("/t/acme/processes/purchase-approval");
  await expect(
    page.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();
  await expect(
    page.getByText("Purchase Approval", { exact: true }),
  ).toHaveCount(0);
});

test("live Guardian stores an attached HTML map in a process draft", async ({
  page,
}) => {
  await signIn(page, "guardian@acme.emilda.test", "/t/acme/processes/new");
  await page.getByRole("button", { name: "Use example" }).click();
  for (let section = 0; section < 4; section += 1)
    await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Attach HTML file/).setInputFiles(processHtml);
  await page
    .getByRole("button", { name: "Add HTML process to Process Library" })
    .click();
  await expect(page).toHaveURL(/\/t\/acme\/processes\/[0-9a-f-]{36}$/);
  const processUrl = new URL(page.url());
  const processId = processUrl.pathname.split("/")[4];
  await page.goto(`/t/acme/processes/${processId}`);
  await page.getByRole("tab", { name: /Templates/ }).click();
  await expect(
    page.getByRole("heading", { name: "Customer handoff message template" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Open / download" }),
  ).toHaveAttribute("href", "https://docs.google.com/");
  await page.getByRole("button", { name: "Delete process" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Delete “Customer enquiry handoff”?",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete draft" }).click();
  await expect(page).toHaveURL(/\/t\/acme\/processes$/);
  await page.goto(`/t/acme/processes/${processId}`);
  await expect(
    page.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();
});
