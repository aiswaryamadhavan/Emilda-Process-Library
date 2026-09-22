import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { GovernanceProcessRow } from "@/lib/data/governance";
import type { ProcessGraph } from "@/lib/domain/types";
import type {
  ProcessStarterDraft,
  ProcessStarterInput,
} from "@/lib/domain/process-starter";
import type { ProcessSummary, ProcessWorkspace } from "@/lib/data/processes";

type DemoProcessRecord = {
  id: string;
  processKey: string;
  tenantSlug: string;
  name: string;
  department: string;
  owner: string;
  guardian: string;
  versionId: string;
  purpose: string;
  goal: string;
  problemSolved: string;
  trigger: string;
  output: string;
  auditDuration: string;
  auditQuestions: string;
  resourceLinks: ProcessWorkspace["resourceLinks"];
  graph: ProcessGraph;
  htmlMap: { attachmentId: string; filename: string } | null;
  status: string;
  health: ProcessSummary["health"];
  createdAt: string;
  lastGovernanceAt: string | null;
  governanceFindings: string;
};

type StoreFile = {
  processes: DemoProcessRecord[];
};

const storePath = path.join(process.cwd(), "tmp", "emilda-demo-processes.json");
const attachmentDir = path.join(process.cwd(), "tmp", "emilda-demo-attachments");

async function readStore(): Promise<StoreFile> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as StoreFile;
    return { processes: parsed.processes ?? [] };
  } catch {
    return { processes: [] };
  }
}

async function writeStore(store: StoreFile) {
  await mkdir(path.dirname(storePath), { recursive: true });
  await writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
}

function formatDate(value: string | null | undefined, empty: string) {
  if (!value) return empty;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function computeNextDue(
  createdAt: string,
  auditDuration: string,
  lastGovernanceAt: string | null,
) {
  const base = new Date(lastGovernanceAt ?? createdAt);
  const lower = auditDuration.toLowerCase();
  const next = new Date(base);
  if (lower.includes("week")) next.setDate(next.getDate() + 7);
  else if (lower.includes("month")) next.setMonth(next.getMonth() + 1);
  else if (lower.includes("quarter")) next.setMonth(next.getMonth() + 3);
  else if (lower.includes("day")) next.setDate(next.getDate() + 1);
  else next.setDate(next.getDate() + 30);
  return formatDate(next.toISOString(), "Not scheduled");
}

function toSummary(record: DemoProcessRecord): ProcessSummary {
  return {
    id: record.id,
    name: record.name,
    department: record.department,
    owner: record.owner,
    version: "1.0",
    versionId: record.versionId,
    health: record.health,
    lastAudit: formatDate(record.lastGovernanceAt, "Not audited"),
    nextAudit: computeNextDue(
      record.createdAt,
      record.auditDuration,
      record.lastGovernanceAt,
    ),
    status: record.status,
    purpose: record.purpose,
  };
}

function toWorkspace(record: DemoProcessRecord): ProcessWorkspace {
  return {
    ...toSummary(record),
    goal: record.goal,
    trigger: record.trigger,
    currentState: record.problemSolved || "Captured during process setup.",
    futureState: record.output,
    guardian: record.guardian,
    problemSolved: record.problemSolved,
    auditDuration: record.auditDuration,
    auditQuestions: record.auditQuestions,
    endingPoint: record.output,
    graph: record.graph,
    metrics: record.auditDuration
      ? [
          {
            id: "audit-cadence",
            name: "Governance review cadence",
            target: record.auditQuestions || "Complete the agreed audit checklist",
            cadence: record.auditDuration,
          },
        ]
      : [],
    exceptions: [],
    openIssues: [],
    versions: [
      {
        id: record.versionId,
        label: "1.0",
        status: record.status,
        changeReason: "Initial process library entry",
        createdAt: formatDate(record.createdAt, "Recently"),
      },
    ],
    resourceLinks: record.resourceLinks,
    htmlMap: record.htmlMap,
  };
}

export async function listDemoProcessSummaries(
  tenantSlug: string,
): Promise<ProcessSummary[]> {
  const store = await readStore();
  return store.processes
    .filter((item) => item.tenantSlug === tenantSlug)
    .map(toSummary);
}

export async function listDemoGovernanceRows(
  tenantSlug: string,
): Promise<GovernanceProcessRow[]> {
  const store = await readStore();
  return store.processes
    .filter((item) => item.tenantSlug === tenantSlug)
    .map((record) => ({
      processId: record.id,
      processName: record.name,
      department: record.department,
      lastGovernance: formatDate(record.lastGovernanceAt, "Not yet reviewed"),
      nextDue: computeNextDue(
        record.createdAt,
        record.auditDuration,
        record.lastGovernanceAt,
      ),
      findings:
        record.governanceFindings ||
        "No governance review completed yet. Use the audit questions captured during setup.",
      health: record.health,
    }));
}

export async function getDemoProcessWorkspace(
  tenantSlug: string,
  processId: string,
): Promise<ProcessWorkspace | null> {
  const store = await readStore();
  const record = store.processes.find(
    (item) => item.tenantSlug === tenantSlug && item.id === processId,
  );
  return record ? toWorkspace(record) : null;
}

export async function createDemoProcessFromStarter(
  tenantSlug: string,
  input: ProcessStarterInput,
  draft: ProcessStarterDraft,
  guardianName: string,
) {
  const store = await readStore();
  const id = randomUUID();
  const versionId = randomUUID();
  const processKey = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  const record: DemoProcessRecord = {
    id,
    processKey: processKey || id.slice(0, 8),
    tenantSlug,
    name: input.name.trim(),
    department: input.department,
    owner: input.ownerRole.trim(),
    guardian: guardianName.trim(),
    versionId,
    purpose: draft.purpose,
    goal: draft.goal,
    problemSolved: input.problem.trim(),
    trigger: draft.trigger,
    output: input.output.trim(),
    auditDuration: input.cadence.trim() || "Monthly",
    auditQuestions: input.auditQuestions.trim(),
    resourceLinks: input.resourceLinks.map((link, index) => ({
      id: `demo-link-${index}`,
      label: link.label,
      resourceType: link.resourceType,
      url: link.url,
      description: link.description ?? "",
    })),
    graph: draft.graph,
    htmlMap: null,
    status: "DRAFT",
    health: "NOT_ENOUGH_DATA",
    createdAt: new Date().toISOString(),
    lastGovernanceAt: null,
    governanceFindings: "",
  };

  store.processes.push(record);
  await writeStore(store);

  return {
    processId: id,
    versionId,
    processKey: record.processKey,
  };
}

export async function attachDemoHtmlMap(
  tenantSlug: string,
  processId: string,
  versionId: string,
  attachmentId: string,
  filename: string,
  htmlContent?: string,
) {
  const store = await readStore();
  const record = store.processes.find(
    (item) =>
      item.tenantSlug === tenantSlug &&
      item.id === processId &&
      item.versionId === versionId,
  );
  if (!record) return false;
  record.htmlMap = { attachmentId, filename };
  if (htmlContent) {
    await mkdir(attachmentDir, { recursive: true });
    await writeFile(path.join(attachmentDir, `${attachmentId}.html`), htmlContent, "utf8");
  }
  await writeStore(store);
  return true;
}

export async function readDemoAttachment(attachmentId: string) {
  try {
    return await readFile(path.join(attachmentDir, `${attachmentId}.html`), "utf8");
  } catch {
    return null;
  }
}
