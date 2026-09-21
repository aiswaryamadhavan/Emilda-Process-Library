"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  CircleAlert,
  FileCode2,
  GitBranch,
  Lightbulb,
  Link2,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createProcessFromStarter } from "@/app/actions/process-actions";
import { useTenantTheme } from "@/components/tenant-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProcessStarterDraft,
  ProcessStarterInput,
} from "@/lib/domain/process-starter";

const sections = [
  ["Outcome", "Name the result"],
  ["Reality", "Explain what happens today"],
  ["People", "Make ownership and handoffs clear"],
  ["Proof", "Define evidence and exceptions"],
  ["Resources", "Keep the right templates close"],
  ["HTML file", "Attach your existing process map"],
] as const;

function isHtmlFile(file: File) {
  return file.type === "text/html" || /\.html?$/i.test(file.name);
}

const emptyInput: ProcessStarterInput = {
  name: "",
  department: "Operations",
  goal: "",
  problem: "",
  currentMethod: "",
  trigger: "",
  ownerRole: "",
  contributors: "",
  inputs: "",
  output: "",
  evidence: "",
  exceptions: "",
  cadence: "",
  constraints: "",
  resourceLinks: [],
};

const exampleInput: ProcessStarterInput = {
  name: "Customer enquiry handoff",
  department: "Sales",
  goal: "Every qualified enquiry reaches an accountable service owner within four business hours.",
  problem:
    "Enquiries arrive through email and WhatsApp. The owner is asked who should handle them, and some follow-ups are missed.",
  currentMethod:
    "Sales forwards a message to whichever manager is available. The receiving person sometimes replies, but ownership is not recorded.",
  trigger: "A new qualified customer enquiry is received",
  ownerRole: "Sales Operations Lead",
  contributors: "Sales Coordinator, Service Lead",
  inputs: "Customer details, request summary, priority, promised response time",
  output:
    "The enquiry has a named service owner and a recorded first-response deadline",
  evidence: "CRM assignment record and customer acknowledgement",
  exceptions:
    "No service owner is available or the request is outside the normal service scope",
  cadence: "Within four business hours",
  constraints:
    "The team currently uses Microsoft 365 and a lightweight service desk.",
  resourceLinks: [
    {
      label: "Customer handoff message template",
      resourceType: "TEMPLATE",
      url: "https://docs.google.com/",
      description: "Copy this before sending the customer handoff message.",
    },
  ],
};

export function ProcessStarter({ departments }: { departments: string[] }) {
  const { localPrefix } = useTenantTheme();
  const [section, setSection] = useState(0);
  const [input, setInput] = useState<ProcessStarterInput>({
    ...emptyInput,
    department: departments[0] ?? "Operations",
  });
  const [draft, setDraft] = useState<ProcessStarterDraft | null>(null);
  const [diagramFile, setDiagramFile] = useState<File | null>(null);
  const [diagramPreview, setDiagramPreview] = useState("");
  const [source, setSource] = useState<
    "AI" | "STARTER_TEMPLATE" | "HTML_UPLOAD"
  >("HTML_UPLOAD");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState("Saved just now");

  const update = (key: keyof ProcessStarterInput, value: string) =>
    setInput((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const savingTimeout = window.setTimeout(() => setSaved("Saving…"), 0);
    const timeout = window.setTimeout(() => {
      localStorage.setItem(
        "emilda:process-starter:draft",
        JSON.stringify({ section, input, draft, source, notice }),
      );
      setSaved("Saved just now");
    }, 650);
    return () => {
      window.clearTimeout(savingTimeout);
      window.clearTimeout(timeout);
    };
  }, [draft, input, notice, section, source]);

  const sectionValid = [
    input.name.trim().length >= 2 &&
      input.department.trim().length >= 2 &&
      input.goal.trim().length >= 5,
    Boolean(input.problem.trim() && input.currentMethod.trim()),
    Boolean(input.ownerRole.trim() && input.output.trim()),
    Boolean(input.evidence.trim() && input.exceptions.trim()),
    input.resourceLinks.every(
      (item) => item.label.trim().length >= 2 && /^https?:\/\//i.test(item.url),
    ),
    Boolean(diagramFile),
  ][section];

  const continuationHint = [
    "Add a process name and the outcome it must achieve.",
    "Describe the problem and how the work happens today.",
    "Name the accountable owner and the finished outcome.",
    "Add the evidence and a realistic exception.",
    "Complete each resource link or remove it before continuing.",
    "Attach an HTML file containing your process diagram.",
  ][section];

  const selectDiagram = (file: File | null) => {
    if (diagramPreview) URL.revokeObjectURL(diagramPreview);
    if (!file) {
      setDiagramFile(null);
      setDiagramPreview("");
      return;
    }
    if (!isHtmlFile(file) || file.size > 25 * 1024 * 1024) {
      toast.error("Use an HTML file up to 25 MB.");
      return;
    }
    setDiagramFile(file);
    setDiagramPreview("");
  };

  const addResourceLink = () =>
    setInput((current) => ({
      ...current,
      resourceLinks: [
        ...current.resourceLinks,
        {
          label: "",
          resourceType: "TEMPLATE",
          url: "",
          description: "",
        },
      ],
    }));

  const updateResourceLink = (
    index: number,
    key: "label" | "resourceType" | "url" | "description",
    value: string,
  ) =>
    setInput((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));

  const removeResourceLink = (index: number) =>
    setInput((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));

  const prepareHtmlForLibrary = () => {
    if (!diagramFile) return;
    const trigger = input.trigger || `Start ${input.name.toLowerCase()}`;
    const output = input.output || `${input.name} is completed`;
    setSource("HTML_UPLOAD");
    setNotice(
      "Your original HTML file will be stored with this process in the Process Library. No AI processing has been used.",
    );
    setDraft({
      purpose: `Keep the original HTML process map for ${input.name} in the Process Library.`,
      businessProblem: input.problem,
      goal: input.goal,
      trigger,
      inScope: "The attached HTML process map.",
      outOfScope:
        "Transcribing, changing, or interpreting the uploaded diagram.",
      ownerRole: input.ownerRole,
      contributors: input.contributors
        .split(/\n|,|;/)
        .map((item) => item.trim())
        .filter(Boolean),
      inputs: input.inputs
        .split(/\n|,|;/)
        .map((item) => item.trim())
        .filter(Boolean),
      output,
      metrics: [
        {
          name: "HTML process map available",
          target: "Attached to the process record",
          cadence: input.cadence || "When the process changes",
          dataSource: diagramFile.name,
        },
      ],
      exceptions: [
        {
          scenario: input.exceptions,
          response: "Update and attach a revised HTML file.",
          escalation: input.ownerRole,
        },
      ],
      graph: {
        direction: "LR",
        nodes: [
          {
            id: "start",
            type: "START",
            title: trigger,
            position: { x: 0, y: 120 },
          },
          {
            id: "end",
            type: "END",
            title: output,
            position: { x: 360, y: 120 },
          },
        ],
        edges: [{ id: "e1", source: "start", target: "end" }],
      },
      assumptions: [
        "The uploaded HTML is the source of truth; its diagram has not been transcribed or changed.",
      ],
      unansweredQuestions: [
        "Review the attached HTML file in the Process Library before approving or editing this process.",
      ],
    });
  };

  const createDraft = async () => {
    if (!draft) return;
    setCreating(true);
    const processKey =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `process-${Date.now()}`;
    let processId = processKey;
    let versionId = "draft";

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const result = await createProcessFromStarter({ input, draft });
      if (!result.ok) {
        setCreating(false);
        toast.error(result.error);
        return;
      }
      if (!result.processId || !result.versionId) {
        setCreating(false);
        toast.error("The draft was created but could not be opened.");
        return;
      }
      processId = result.processId;
      versionId = result.versionId;

      if (diagramFile) {
        const attachment = new FormData();
        attachment.set("file", diagramFile);
        attachment.set("processId", processId);
        attachment.set("entityType", "VERSION");
        attachment.set("entityId", versionId);
        const upload = await fetch(`${localPrefix}/api/attachments`, {
          method: "POST",
          body: attachment,
        });
        if (!upload.ok)
          toast.warning(
            "The process was saved, but the original HTML file could not be attached.",
          );
      }
    }

    localStorage.setItem(
      `emilda:starter-graph:${processId}:${versionId}`,
      JSON.stringify(draft.graph),
    );
    localStorage.setItem(
      `emilda:starter-summary:${processId}:${versionId}`,
      JSON.stringify({ name: input.name, department: input.department, draft }),
    );
    localStorage.removeItem("emilda:process-starter:draft");
    toast.success("Editable process draft created");
    // A full navigation avoids stalled RSC transitions while the large builder
    // payload is rendered and preserves the tenant-prefixed destination.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(
      `${localPrefix}/processes/${processId}/versions/${versionId}/builder`,
    );
  };

  if (draft) {
    const operatingSteps = draft.graph.nodes.filter(
      (node) => node.type !== "START" && node.type !== "END",
    );
    return (
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border bg-white">
          <div className="border-b bg-[linear-gradient(135deg,color-mix(in_srgb,var(--brand-primary)_9%,white),white)] p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[var(--brand-primary)] text-white">
                <FileCode2 /> HTML source attached
              </Badge>
              <Badge variant="outline" className="rounded-full bg-white">
                Draft · human review required
              </Badge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--navy)]">
              {input.name}
            </h2>
            <p className="mt-2 max-w-3xl leading-7 text-muted-foreground">
              {draft.purpose}
            </p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {notice}
            </p>
          </div>

          <div className="grid gap-px bg-border sm:grid-cols-3">
            {[
              ["Department", input.department],
              ["Process Owner", draft.ownerRole],
              ["Trigger", draft.trigger],
            ].map(([label, value]) => (
              <div key={label} className="bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 text-sm font-medium leading-6">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Original diagram source</p>
              <h3 className="mt-1 text-xl font-semibold">
                {operatingSteps.length
                  ? `${operatingSteps.length} editable operating steps`
                  : "HTML file retained without AI transcription"}
              </h3>
            </div>
            <GitBranch className="size-6 text-[var(--brand-primary)]" />
          </div>
          {operatingSteps.length > 0 && (
            <ol className="mt-5 space-y-3">
              {operatingSteps.map((node, index) => (
                <li key={node.id} className="flex gap-3 rounded-xl border p-4">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-semibold">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{node.title}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {node.type}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {node.actor || "Role to confirm"}
                      {node.timing ? ` · ${node.timing}` : ""}
                    </p>
                    {node.evidence && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Evidence: {node.evidence}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border bg-white p-5">
            <p className="eyebrow">How success is measured</p>
            {draft.metrics.map((metric) => (
              <div
                key={metric.name}
                className="mt-3 rounded-xl bg-muted/60 p-4"
              >
                <p className="font-semibold">{metric.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {metric.target} · {metric.cadence}
                </p>
              </div>
            ))}
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <p className="eyebrow">Likely exceptions</p>
            {draft.exceptions.map((item) => (
              <div
                key={item.scenario}
                className="mt-3 rounded-xl bg-muted/60 p-4"
              >
                <p className="font-semibold">{item.scenario}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {item.response}
                </p>
              </div>
            ))}
          </section>
        </div>

        {input.resourceLinks.length > 0 && (
          <section className="rounded-2xl border bg-white p-5 sm:p-7">
            <p className="eyebrow">Templates & document links</p>
            <h3 className="mt-1 text-xl font-semibold">
              Ready beside the process
            </h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {input.resourceLinks.map((resource) => (
                <a
                  key={`${resource.label}-${resource.url}`}
                  href={resource.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-16 items-center gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--brand-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                    <Link2 className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {resource.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {resource.resourceType.toLowerCase()} · Open link
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}

        {(draft.assumptions.length > 0 ||
          draft.unansweredQuestions.length > 0) && (
          <section className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-5 lg:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-amber-950">
                <CircleAlert className="size-4" /> Assumptions to confirm
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950/80">
                {draft.assumptions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-amber-950">
                <Lightbulb className="size-4" /> Questions still open
              </h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-950/80">
                {draft.unansweredQuestions.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="sticky bottom-4 flex flex-col-reverse gap-3 rounded-2xl border bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row">
          <Button variant="outline" onClick={() => setDraft(null)}>
            <ChevronLeft /> Change answers
          </Button>
          <Button
            size="lg"
            className="min-h-12 sm:ml-auto"
            onClick={createDraft}
            disabled={creating}
          >
            {creating ? <LoaderCircle className="animate-spin" /> : <Check />}
            {creating ? "Saving to library…" : "Save to Process Library"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          {section + 1} of {sections.length} · {sections[section][0]}
        </span>
        <span className="text-muted-foreground" aria-live="polite">
          {saved}
        </span>
      </div>
      <Progress
        value={((section + 1) / sections.length) * 100}
        aria-label="Process starter completion"
        className="mt-3 h-2"
      />

      <section className="mt-7 rounded-2xl border bg-white p-5 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{sections[section][0]}</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--navy)]">
              {sections[section][1]}
            </h2>
          </div>
          {section === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInput(exampleInput)}
            >
              Use example
            </Button>
          )}
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Answer in plain language. These details describe the process, but
          Emilda will only build the workflow from the diagram you attach in the
          final step.
        </p>

        <div className="mt-6 grid gap-5">
          {section === 0 && (
            <>
              <ShortField
                id="process-name"
                label="Process name"
                value={input.name}
                onChange={(value) => update("name", value)}
                placeholder="For example: Customer enquiry handoff"
              />
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  list="client-departments"
                  value={input.department}
                  onChange={(event) => update("department", event.target.value)}
                  placeholder="Operations"
                  className="mt-2 h-12 rounded-xl"
                />
                <datalist id="client-departments">
                  {departments.map((department) => (
                    <option key={department} value={department} />
                  ))}
                </datalist>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Choose a saved client department so the library stays tidy.
                </p>
              </div>
              <LongField
                id="goal"
                label="What outcome must this process achieve?"
                value={input.goal}
                onChange={(value) => update("goal", value)}
                placeholder="Be specific enough that someone can tell whether it worked."
              />
            </>
          )}
          {section === 1 && (
            <>
              <LongField
                id="problem"
                label="What problem are you solving?"
                value={input.problem}
                onChange={(value) => update("problem", value)}
                placeholder="What is unreliable, slow, invisible, or dependent on the owner?"
              />
              <LongField
                id="current-method"
                label="How does it really work today?"
                value={input.currentMethod}
                onChange={(value) => update("currentMethod", value)}
                placeholder="Include WhatsApp, paper, workarounds, and informal handoffs."
              />
              <ShortField
                id="trigger"
                label="What starts the process?"
                value={input.trigger}
                onChange={(value) => update("trigger", value)}
                placeholder="A request is received…"
              />
            </>
          )}
          {section === 2 && (
            <>
              <ShortField
                id="owner-role"
                label="One accountable Process Owner"
                value={input.ownerRole}
                onChange={(value) => update("ownerRole", value)}
                placeholder="Use a role, for example: Operations Lead"
              />
              <ShortField
                id="contributors"
                label="Other roles involved"
                value={input.contributors}
                onChange={(value) => update("contributors", value)}
                placeholder="Separate roles with commas"
              />
              <LongField
                id="inputs"
                label="What must be available to start?"
                value={input.inputs}
                onChange={(value) => update("inputs", value)}
              />
              <LongField
                id="output"
                label="What must exist when it finishes?"
                value={input.output}
                onChange={(value) => update("output", value)}
              />
            </>
          )}
          {section === 3 && (
            <>
              <LongField
                id="evidence"
                label="What proves it was completed correctly?"
                value={input.evidence}
                onChange={(value) => update("evidence", value)}
                placeholder="A system record, photo, signed form, report…"
              />
              <LongField
                id="exceptions"
                label="What can realistically go wrong?"
                value={input.exceptions}
                onChange={(value) => update("exceptions", value)}
              />
              <ShortField
                id="cadence"
                label="Timing, deadline, or cadence"
                value={input.cadence}
                onChange={(value) => update("cadence", value)}
                placeholder="Within 4 hours, weekly, event-based…"
              />
              <LongField
                id="constraints"
                label="Systems, policies, or limits to respect"
                value={input.constraints}
                onChange={(value) => update("constraints", value)}
              />
            </>
          )}
          {section === 4 && (
            <div>
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm leading-6 text-teal-950">
                <p className="flex items-center gap-2 font-semibold">
                  <Link2 className="size-4" aria-hidden="true" />
                  Links only—no upload needed
                </p>
                <p className="mt-1">
                  Add the Google Doc, Drive file, form, message template, or
                  closure document people should use while running this process.
                  You can also add these later.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {input.resourceLinks.map((resource, index) => (
                  <div
                    key={index}
                    className="rounded-xl border bg-[var(--surface-subtle)] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">Link {index + 1}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeResourceLink(index)}
                      >
                        <Trash2 aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <ShortField
                        id={`resource-label-${index}`}
                        label="Name"
                        value={resource.label}
                        onChange={(value) =>
                          updateResourceLink(index, "label", value)
                        }
                        placeholder="Closure message template"
                      />
                      <div>
                        <Label htmlFor={`resource-type-${index}`}>Type</Label>
                        <select
                          id={`resource-type-${index}`}
                          value={resource.resourceType}
                          onChange={(event) =>
                            updateResourceLink(
                              index,
                              "resourceType",
                              event.target.value,
                            )
                          }
                          className="mt-2 h-12 w-full rounded-xl border bg-white px-3 text-sm"
                        >
                          <option value="TEMPLATE">Template</option>
                          <option value="DOCUMENT">Document</option>
                          <option value="FORM">Form</option>
                          <option value="EXAMPLE">Example</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4">
                      <ShortField
                        id={`resource-url-${index}`}
                        label="Link"
                        value={resource.url}
                        onChange={(value) =>
                          updateResourceLink(index, "url", value)
                        }
                        placeholder="https://docs.google.com/..."
                      />
                      <ShortField
                        id={`resource-description-${index}`}
                        label="When should people use it? (optional)"
                        value={resource.description}
                        onChange={(value) =>
                          updateResourceLink(index, "description", value)
                        }
                        placeholder="Use this when closing a customer request."
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-4 min-h-11"
                onClick={addResourceLink}
                disabled={input.resourceLinks.length >= 20}
              >
                <Plus aria-hidden="true" />
                Add template or document link
              </Button>
              {input.resourceLinks.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  No links yet. You can continue and add them from the process
                  page later.
                </p>
              )}
            </div>
          )}
          {section === 5 && (
            <div>
              <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm leading-6 text-teal-950">
                <p className="flex items-center gap-2 font-semibold">
                  <FileCode2 className="size-4" aria-hidden="true" />
                  Attach the original HTML process map
                </p>
                <p className="mt-1">
                  Attach the exported HTML file. It will be stored with the new
                  process in the Process Library exactly as supplied. This step
                  does not use an OpenAI API key or AI processing.
                </p>
              </div>

              <Label
                htmlFor="diagram-photo"
                className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-[var(--surface-subtle)] p-5 text-center transition-colors hover:border-[var(--brand-primary)]"
              >
                <FileCode2
                  className="size-8 text-[var(--brand-primary)]"
                  aria-hidden="true"
                />
                <span className="mt-3 font-semibold">
                  {diagramFile ? "Replace HTML file" : "Attach HTML file"}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  HTML (.html or .htm) · maximum 25 MB
                </span>
                <input
                  id="diagram-photo"
                  type="file"
                  accept="text/html,.html,.htm"
                  className="sr-only"
                  onChange={(event) =>
                    selectDiagram(event.target.files?.[0] ?? null)
                  }
                />
              </Label>

              {diagramFile && diagramPreview && (
                <div className="mt-4 overflow-hidden rounded-2xl border bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={diagramPreview}
                    alt="Uploaded process diagram preview"
                    className="max-h-80 w-full object-contain"
                  />
                  <div className="flex items-center justify-between gap-3 border-t p-3 text-sm">
                    <span className="min-w-0 truncate">{diagramFile.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => selectDiagram(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
              {diagramFile && !diagramPreview && (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 text-sm">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                      <FileCode2 className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {diagramFile.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        HTML file attached — it will be included in the Process
                        Library without AI processing.
                      </span>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => selectDiagram(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="mt-4 flex gap-3">
        {section > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="min-h-12"
            onClick={() => setSection(section - 1)}
          >
            <ChevronLeft /> Back
          </Button>
        )}
        {section < sections.length - 1 ? (
          <Button
            size="lg"
            className="min-h-12 flex-1"
            disabled={!sectionValid}
            onClick={() => setSection(section + 1)}
          >
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button
            size="lg"
            className="min-h-12 flex-1"
            disabled={!sectionValid}
            onClick={prepareHtmlForLibrary}
          >
            <Check /> Review & save to Process Library
          </Button>
        )}
      </div>
      {!sectionValid && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          To continue: {continuationHint}
        </p>
      )}
    </div>
  );
}

function ShortField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 rounded-xl"
      />
    </div>
  );
}

function LongField(props: Parameters<typeof ShortField>[0]) {
  return (
    <div>
      <Label htmlFor={props.id}>{props.label}</Label>
      <Textarea
        id={props.id}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        className="mt-2 min-h-28 rounded-xl"
      />
    </div>
  );
}
