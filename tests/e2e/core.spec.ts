import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { processHtml } from "./process-starter-fixture";
test("owner sees an empty process library", async ({ page }) => {
  await page.goto("/t/acme/");
  await expect(page.getByRole("heading", { name: "Processes" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No processes yet" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Process", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Governance", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Home", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
test("core UI uses the product sans font", async ({ page }) => {
  await page.goto("/t/acme/processes");
  const fontFamily = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(fontFamily.toLowerCase()).toContain("geist");
  expect(fontFamily.toLowerCase()).not.toMatch(/times|serif/);
});
test("sign-in accepts email for Paul and Aishwarya", async ({ page }) => {
  await page.goto("/t/acme/auth/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in with email" }),
  ).toBeVisible();
  await expect(page.getByText(/Only Paul/i)).toHaveCount(0);
});
test.skip("mobile owner deliberately approves the current version", async ({
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
test.skip("audit saves and resumes", async ({ page }) => {
  await page.goto("/t/acme/audits/scorecard-week-38");
  await page.evaluate(() => localStorage.removeItem("emilda:audit:week38"));
  await page.reload();
  await page.getByText("Yes", { exact: true }).click();
  await page.getByRole("button", { name: "Save & next" }).click();
  await page.reload();
  await expect(page.getByText("2 of 6 checkpoints")).toBeVisible();
});
test.skip("invalid Mermaid explains the line", async ({ page }) => {
  await page.goto("/t/acme/processes/purchase-approval/versions/demo/mermaid");
  await page
    .getByLabel("Mermaid source")
    .fill("flowchart TD\nsubgraph Hidden\nA --> B\nend");
  await expect(page.getByText(/Line 2, column 1/)).toBeVisible();
  await expect(page.getByText(/not supported/)).toBeVisible();
});
test("two tenant portals stay on empty process libraries", async ({ page }) => {
  await page.goto("/t/acme/");
  const acmeColor = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--brand-primary").trim(),
  );
  await expect(
    page.getByRole("heading", { name: "No processes yet" }),
  ).toBeVisible();
  await page.goto("/t/northstar/");
  const northstarColor = await page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--brand-primary").trim(),
  );
  await expect(page.getByRole("heading", { name: "Processes" })).toBeVisible();
  expect(northstarColor).not.toBe(acmeColor);
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

test("process library starts empty", async ({ page }) => {
  await page.goto("/t/acme/processes");
  await expect(
    page.getByRole("heading", { name: "No processes yet" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Governance", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/\/t\/acme\/governance$/);
  await expect(
    page.getByRole("heading", { name: "No governance work yet" }),
  ).toBeVisible();
});

test("tenant administration exposes real Google access controls", async ({
  page,
}) => {
  await page.goto("/t/acme/more/users");
  if (await page.getByLabel("Email").isVisible()) {
    await page.getByLabel("Email").fill("admin@acme.emilda.test");
    await page.getByLabel("Password").fill("EmildaDemo!2026");
    await page.getByRole("button", { name: "Sign in with email" }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Users & roles" }),
  ).toBeVisible();
  await expect(page.getByText("Paul")).toBeVisible();
  await expect(page.getByText("Aishwarya")).toBeVisible();
  await expect(page.getByText("Create user access")).toHaveCount(0);
});

test("process creation keeps setup short and HTML-only", async ({ page }) => {
  await page.goto("/t/acme/processes/new");
  if (await page.getByLabel("Email").isVisible()) {
    await page.getByLabel("Email").fill("guardian@acme.emilda.test");
    await page.getByLabel("Password").fill("EmildaDemo!2026");
    await page.getByRole("button", { name: "Sign in with email" }).click();
  }
  await expect(page).toHaveURL(/\/t\/acme\/processes\/new$/);
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
test.skip("Guardian uploads photo evidence", async ({ page }) => {
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
test.skip("issue evidence leads to a linked improvement draft", async ({
  page,
}) => {
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
  await expect(page.getByText("Dispatch Confirmation")).toHaveCount(0);
});
test.skip("builder supports editing without horizontal document overflow", async ({
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
  for (const path of ["/approvals/purchase-v21", "/audits/scorecard-week-38"]) {
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
