import type { Page } from "@playwright/test";

export const processHtml = {
  name: "customer-enquiry-process.html",
  mimeType: "text/html",
  buffer: Buffer.from(
    '<html><body><div class="mermaid">flowchart LR\\nStart --> Handoff --> Complete</div></body></html>',
  ),
};

export async function mockDiagramCleanup(page: Page) {
  await page.route("**/api/process-starter", async (route) => {
    const request = route.request();
    if (request.method() !== "POST") return route.continue();
    const body = request.postDataBuffer()?.toString("utf8") ?? "";
    if (!body.includes('name="diagram"'))
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Diagram photo is required." }),
      });

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        source: "AI",
        configured: true,
        notice:
          "AI cleaned the diagram you supplied without inventing workflow logic.",
        draft: {
          purpose:
            "Ensure every qualified enquiry reaches an accountable service owner.",
          businessProblem: "Ownership is not consistently recorded.",
          goal: "Assign every qualified enquiry within four business hours.",
          trigger: "A new qualified customer enquiry is received",
          inScope: "Receive, assign, and acknowledge the enquiry.",
          outOfScope: "Service delivery after the handoff.",
          ownerRole: "Sales Operations Lead",
          contributors: ["Sales Coordinator", "Service Lead"],
          inputs: ["Customer details", "Request summary"],
          output: "A named service owner and first-response deadline",
          metrics: [
            {
              name: "Enquiries assigned on time",
              target: "Within four business hours",
              cadence: "Weekly",
              dataSource: "CRM assignment record",
            },
          ],
          exceptions: [
            {
              scenario: "No service owner is available",
              response: "Escalate to the Sales Operations Lead",
              escalation: "Record the exception",
            },
          ],
          graph: {
            direction: "LR",
            nodes: [
              {
                id: "start",
                type: "START",
                title: "Qualified enquiry received",
                position: { x: 0, y: 120 },
              },
              {
                id: "assign_owner",
                type: "ACTION",
                title: "Assign service owner",
                actor: "Sales Coordinator",
                position: { x: 300, y: 120 },
              },
              {
                id: "end",
                type: "END",
                title: "Customer acknowledged",
                position: { x: 600, y: 120 },
              },
            ],
            edges: [
              { id: "e1", source: "start", target: "assign_owner" },
              { id: "e2", source: "assign_owner", target: "end" },
            ],
          },
          assumptions: ["Confirm the cleaned wording against the photo."],
          unansweredQuestions: [],
        },
      }),
    });
  });
}
