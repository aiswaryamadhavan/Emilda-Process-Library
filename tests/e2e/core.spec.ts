import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { processHtml } from "./process-starter-fixture";
test("owner sees business health and no horizontal overflow", async ({
  page,
}) => {
  await page.goto("/t/acme/");
  await expect(
    page.getByRole("heading", { name: /Good morning/ }),
  ).toBeVisible();
  await expect(
    page.getByText("12 active processes", { exact: false }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
test("core UI uses the product sans font and Mermaid renders live", async ({
  page,
}) => {
  await page.goto("/t/acme/");
  const fontFamily = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(fontFamily.toLowerCase()).toContain("geist");
  expect(fontFamily.toLowerCase()).not.toMatch(/times|serif/);
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/mermaid");
  await expect(
    page.locator('[aria-label="Mermaid diagram preview"] svg'),
  ).toBeVisible();
});
test("production sign-in offers Google only", async ({ page }) => {
  await page.goto("/t/acme/auth/login");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(page.getByText(/Microsoft|Entra/i)).toHaveCount(0);
});
test("mobile owner deliberately approves the current version", async ({
  page,
}) => {
  await page.goto("/t/acme/approvals/purchase-v21");
  await page.evaluate(() =>
    localStorage.removeItem("emilda:approval:purchase-v21"),
  );
  await page.reload();
  await page.getByRole("button", { name: "Approve process" }).click();
  await expect(
    page.getByRole("heading", { name: "Approve Purchase Approval v2.1?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I have reviewed and approve" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Process approved" }),
  ).toBeVisible();
});
test("audit saves and resumes", async ({ page }) => {
  await page.goto("/t/acme/audits/scorecard-week-38");
  await page.evaluate(() => localStorage.removeItem("emilda:audit:week38"));
  await page.reload();
  await page.getByText("Yes", { exact: true }).click();
  await page.getByRole("button", { name: "Save & next" }).click();
  await page.reload();
  await expect(page.getByText("2 of 6 checkpoints")).toBeVisible();
});
test("invalid Mermaid explains the line", async ({ page }) => {
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/mermaid");
  await page
    .getByLabel("Mermaid source")
    .fill("flowchart TD\nsubgraph Hidden\nA --> B\nend");
  await expect(page.getByText(/Line 2, column 1/)).toBeVisible();
  await expect(page.getByText(/not supported/)).toBeVisible();
});
test("two tenant portals render isolated names, data, and branding", async ({
  page,
}) => {
  await page.goto("/t/acme/");
  const acmeColor = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--brand-primary").trim(),
  );
  await expect(page.getByText("12 active processes")).toBeVisible();
  await page.goto("/t/northstar/");
  const northstarColor = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--brand-primary").trim(),
  );
  await expect(
    page.getByRole("heading", { name: "Good morning, Nina." }),
  ).toBeVisible();
  await expect(page.getByText("2 active processes")).toBeVisible();
  expect(northstarColor).not.toBe(acmeColor);
  await expect(page.getByText("12 active processes")).toHaveCount(0);
});
test("super admin completes tenant onboarding", async ({ page }) => {
  await page.goto("/admin/tenants/new?sample=1");
  await page.evaluate(() => localStorage.removeItem("emilda:tenant:northstar"));
  for (let step = 0; step < 9; step += 1)
    await page.getByRole("button", { name: /Continue/ }).click();
  await page.getByRole("button", { name: "Create tenant" }).click();
  await expect(page).toHaveURL(/\/admin\/tenants$/);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("emilda:tenant:northstar") ?? "null"),
  );
  expect(saved).toMatchObject({
    name: "Northstar Services",
    firstProcess: "Customer enquiry handoff",
    firstProcessDepartment: "Operations",
    accessScope: "EVERYONE",
    departments: ["Operations", "Sales", "Finance", "Service"],
    profile: {
      industry: "Professional services",
      ownerName: "Nina Thomas",
      ownerDependencies: "Complex escalations wait for the founder.",
    },
  });
});

test("client profile can be reviewed and amended later", async ({ page }) => {
  await page.goto("/t/acme/more/client-profile");
  await expect(
    page.getByRole("heading", { name: "Client profile" }),
  ).toBeVisible();
  await expect(page.getByLabel("Legal name")).toHaveValue(
    "Acme Operations Private Limited",
  );
  await page.getByRole("button", { name: "4. Priorities" }).click();
  await expect(page.getByLabel("Owner dependencies")).toHaveValue(
    /Purchase approvals/,
  );
  await page
    .getByLabel("Owner dependencies")
    .fill("Routine exceptions should be delegated below an agreed threshold.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Client profile updated")).toBeVisible();
});

test("process library is grouped by department", async ({ page }) => {
  await page.goto("/t/acme/processes");
  await expect(
    page.getByRole("navigation", { name: "Departments" }),
  ).toBeVisible();
  for (const department of ["Operations", "Finance", "Fulfilment"])
    await expect(
      page.getByRole("heading", { name: department, exact: true }),
    ).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/t\/acme\/?$/);
});

test("tenant administration exposes real Google access controls", async ({
  page,
}) => {
  await page.goto("/t/acme/more/users");
  await expect(
    page.getByRole("heading", { name: "Users & roles" }),
  ).toBeVisible();
  await expect(page.getByText("Google account only")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create Google access" }),
  ).toBeVisible();
  await expect(page.getByText(/User ID ·/).first()).toBeVisible();
});

test("process creation keeps setup short and HTML-only", async ({ page }) => {
  await page.goto("/t/acme/processes/new");
  if (await page.getByLabel("Email").isVisible()) {
    await page.getByLabel("Email").fill("guardian@acme.emilda.test");
    await page.getByLabel("Password").fill("EmildaDemo!2026");
    await page.getByRole("button", { name: "Sign in with email" }).click();
  }
  await expect(page).toHaveURL(/\/t\/acme\/processes\/new$/);
  await expect(page.getByRole("button", { name: "Change user" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Process name").fill("Customer enquiry handoff");
  await page
    .getByLabel("What is the goal of this process?")
    .fill("Give every customer enquiry a clear owner and response.");
  await page
    .getByLabel("Who is the process owner?")
    .fill("Client success lead");
  await page.getByLabel("Who is the process guardian?").fill("Sam Taylor");
  await page
    .getByLabel("What starts this process?")
    .fill("New enquiry received");
  await page
    .getByLabel("What is the ending?")
    .fill("Customer receives a response");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Add a template" }).click();
  await page.getByLabel("Template 1 name").fill("Customer update");
  await page.getByLabel("Template 1 link").fill("https://docs.google.com/");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel(/Attach HTML file/).setInputFiles(processHtml);
  await expect(page.getByText("customer-enquiry-process.html")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save to Process Library" }),
  ).toBeVisible();
  await expect(page.getByText(/No AI and no manual map editing/)).toBeVisible();
});
test("Guardian uploads photo evidence", async ({ page }) => {
  await page.goto("/t/acme/audits/scorecard-week-38");
  const upload = page.locator('input[type="file"]').first();
  await upload.setInputFiles({
    name: "dispatch.png",
    mimeType: "image/png",
    buffer: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
    ]),
  });
  await expect(
    page.getByRole("status").filter({
      hasText: "dispatch.png attached securely",
    }),
  ).toBeVisible();
});
test("issue evidence leads to a linked improvement draft", async ({ page }) => {
  await page.goto("/t/acme/issues/invoice-delay");
  await expect(page.getByText("4 of the last 7")).toBeVisible();
  await page.getByRole("link", { name: /Create improvement/ }).click();
  await expect(
    page.getByRole("heading", { name: "Delegated purchase approval" }),
  ).toBeVisible();
  await expect(page.getByText("Purchase Approval v2.1 draft")).toBeVisible();
});
test("search query stays explicit and permission-safe", async ({ page }) => {
  await page.goto("/t/acme/search?q=dispatch");
  await expect(page.getByLabel("Search Emilda")).toHaveValue("dispatch");
  await expect(page.getByText("Dispatch Confirmation")).toBeVisible();
  await expect(page.getByText("Invoice Approval")).toHaveCount(0);
});
test("builder supports editing without horizontal document overflow", async ({
  page,
}) => {
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/builder");
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
  if ((await page.viewportSize())!.width < 768) {
    await page.getByRole("button", { name: /^1 Request submitted$/ }).click();
    await page.getByLabel("Selected step").fill("Request captured");
    await page.getByRole("button", { name: "Save map" }).click();
    await expect(page.getByText("Process map saved")).toBeVisible();
  }
});
test("major pages have no serious axe violations", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("desktop"));
  for (const path of [
    "/",
    "/processes",
    "/processes/new",
    "/governance",
    "/search",
    "/more/client-profile",
    "/approvals/purchase-v21",
    "/audits/scorecard-week-38",
  ]) {
    await page.goto(`/t/acme${path}`);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      ),
      path,
    ).toEqual([]);
  }
});
