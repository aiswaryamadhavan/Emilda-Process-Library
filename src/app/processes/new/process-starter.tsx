"use client";

import {
  ArrowRight,
  Check,
  ChevronLeft,
  FileCode2,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  createProcessFromStarter,
  reviseProcessFromStarter,
} from "@/app/actions/process-actions";
import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProcessResourceLinkInput,
  ProcessStarterDraft,
  ProcessStarterInput,
} from "@/lib/domain/process-starter";

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
  auditQuestions: "",
  resourceLinks: [],
};

const steps = [
  ["Process details", "Goal, ownership, trigger, ending, and governance"],
  ["Templates & links", "Document, message, and sheet templates"],
  ["Process map", "Attach HTML, review, and save"],
] as const;

const resourceTypeOptions: {
  value: ProcessResourceLinkInput["resourceType"];
  label: string;
}[] = [
  { value: "TEMPLATE", label: "Message template" },
  { value: "DOCUMENT", label: "Document template" },
  { value: "FORM", label: "Form" },
  { value: "EXAMPLE", label: "Example" },
  { value: "OTHER", label: "Other link" },
];

const isHtmlFile = (file: File) =>
  file.type === "text/html" || /\.html?$/i.test(file.name);

export type ProcessStarterInitial = {
  input: ProcessStarterInput;
  guardianName: string;
  existingHtmlFilename?: string | null;
};

export function ProcessStarter({
  departments,
  mode = "create",
  processId,
  initial,
}: {
  departments: string[];
  mode?: "create" | "edit";
  processId?: string;
  initial?: ProcessStarterInitial;
}) {
  const router = useRouter();
  const { localPrefix } = useTenantTheme();
  const [step, setStep] = useState(0);
  const [mapPhase, setMapPhase] = useState<"upload" | "review">("upload");
  const [input, setInput] = useState<ProcessStarterInput>(() => ({
    ...emptyInput,
    ...initial?.input,
    department: initial?.input.department ?? departments[0] ?? "Operations",
  }));
  const [guardianName, setGuardianName] = useState(initial?.guardianName ?? "");
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [existingHtmlName] = useState(initial?.existingHtmlFilename ?? null);
  const [creating, setCreating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const update = (key: keyof ProcessStarterInput, value: string) =>
    setInput((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(
        "emilda:process-starter:draft",
        JSON.stringify({ step, input, guardianName, mode, processId }),
      );
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [guardianName, input, mode, processId, step]);

  useEffect(() => {
    if (!htmlFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(htmlFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [htmlFile]);

  const hasProcessMap = Boolean(htmlFile || (mode === "edit" && existingHtmlName));

  const stepValid = [
    input.name.trim().length >= 2 &&
      input.goal.trim().length >= 5 &&
      input.ownerRole.trim().length >= 2 &&
      guardianName.trim().length >= 2 &&
      input.trigger.trim().length >= 2 &&
      input.output.trim().length >= 2 &&
      input.cadence.trim().length >= 2 &&
      input.auditQuestions.trim().length >= 5,
    input.resourceLinks.every(
      (item) =>
        (!item.label.trim() && !item.url.trim()) ||
        (item.label.trim().length >= 2 && /^https?:\/\//i.test(item.url)),
    ),
    hasProcessMap,
  ];

  const valid = stepValid[step] && (step !== 2 || mapPhase === "upload" || hasProcessMap);

  const hint = [
    "Add the process name, goal, owner, guardian, trigger, ending point, audit frequency, and audit questions.",
    "Complete each template row or remove empty rows. Links must start with http:// or https://.",
    mapPhase === "upload"
      ? "Attach the HTML process map, then continue to review."
      : "Review everything below, then save.",
  ][step];

  const filteredLinks = useMemo(
    () =>
      input.resourceLinks.filter(
        (link) => link.label.trim() && link.url.trim(),
      ),
    [input.resourceLinks],
  );

  const addTemplate = () =>
    setInput((current) => ({
      ...current,
      resourceLinks: [
        ...current.resourceLinks,
        { label: "", resourceType: "TEMPLATE", url: "", description: "" },
      ],
    }));

  const updateTemplate = (
    index: number,
    key: "label" | "url" | "resourceType",
    value: string,
  ) =>
    setInput((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [key]:
                key === "resourceType"
                  ? (value as ProcessResourceLinkInput["resourceType"])
                  : value,
            }
          : item,
      ),
    }));

  const removeTemplate = (index: number) =>
    setInput((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.filter(
        (_, itemIndex) => itemIndex !== index,
      ),
    }));

  const selectHtml = (file: File | null) => {
    if (!file) return setHtmlFile(null);
    if (!isHtmlFile(file) || file.size > 25 * 1024 * 1024)
      return toast.error("Choose an HTML file (.html or .htm) up to 25 MB.");
    setHtmlFile(file);
    setMapPhase("upload");
  };

  const buildDraft = (fileName: string): ProcessStarterDraft => ({
    purpose: input.goal,
    businessProblem: input.problem || input.goal,
    goal: input.goal,
    trigger: input.trigger,
    inScope: "The workflow shown in the uploaded HTML process map.",
    outOfScope: "Editing or generating a replacement process map.",
    ownerRole: input.ownerRole,
    contributors: [guardianName],
    inputs: ["Uploaded HTML process map"],
    output: input.output,
    metrics: [
      {
        name: "Governance review completed",
        target: input.auditQuestions.slice(0, 280),
        cadence: input.cadence,
        dataSource: fileName,
      },
    ],
    exceptions: [],
    graph: {
      direction: "LR",
      nodes: [
        {
          id: "start",
          type: "START",
          title: input.trigger,
          position: { x: 0, y: 120 },
        },
        {
          id: "end",
          type: "END",
          title: input.output,
          position: { x: 360, y: 120 },
        },
      ],
      edges: [{ id: "start_to_end", source: "start", target: "end" }],
    },
    assumptions: [
      "The uploaded HTML file is the complete process map and remains the source of truth.",
    ],
    unansweredQuestions: [],
  });

  const persistProcess = async () => {
    if (!hasProcessMap || creating) return;
    setCreating(true);
    const payloadInput = { ...input, resourceLinks: filteredLinks };
    const mapName = htmlFile?.name ?? existingHtmlName ?? "process-map.html";
    const draft = buildDraft(mapName);

    const result =
      mode === "edit" && processId
        ? await reviseProcessFromStarter({
            processId,
            input: payloadInput,
            draft,
            guardianName,
          })
        : await createProcessFromStarter({
            input: payloadInput,
            draft,
            guardianName,
          });

    if (!result.ok || !result.processId || !result.versionId) {
      setCreating(false);
      toast.error(
        result.ok ? "The process could not be opened." : result.error,
      );
      return;
    }

    if (htmlFile) {
      const attachment = new FormData();
      attachment.set("file", htmlFile);
      attachment.set("processId", result.processId);
      attachment.set("entityType", "VERSION");
      attachment.set("entityId", result.versionId);
      const upload = await fetch(`${localPrefix}/api/attachments`, {
        method: "POST",
        body: attachment,
      });
      if (!upload.ok) {
        setCreating(false);
        const detail = await upload
          .json()
          .then((body: { error?: string }) => body.error)
          .catch(() => undefined);
        toast.error(
          detail ??
            "The process was saved, but the HTML file could not be attached. Please try again.",
        );
        return;
      }
    }

    localStorage.removeItem("emilda:process-starter:draft");
    toast.success(
      mode === "edit"
        ? "New version saved to the Process Library"
        : "Process added to the Process Library",
    );
    router.push(`${localPrefix}/processes/${result.processId}`);
  };

  const goNext = () => {
    if (step === 2 && mapPhase === "upload" && hasProcessMap) {
      setMapPhase("review");
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          {step + 1} of {steps.length} · {steps[step][0]}
          {step === 2 && mapPhase === "review" ? " · Review" : ""}
        </span>
        <span className="text-muted-foreground" aria-live="polite">
          {mode === "edit" ? "Editing creates a new version" : "Saved locally"}
        </span>
      </div>
      <Progress value={((step + 1) / steps.length) * 100} className="mt-3" />
      <section className="mt-6 rounded-2xl border bg-white p-5 sm:p-7">
        <p className="eyebrow">{steps[step][1]}</p>
        {step === 0 && (
          <div className="mt-5 grid gap-5">
            <Field
              id="name"
              label="Process name"
              value={input.name}
              onChange={(value) => update("name", value)}
              placeholder="e.g. Daily client update"
            />
            <Field
              id="goal"
              label="Process goal"
              value={input.goal}
              onChange={(value) => update("goal", value)}
              placeholder="What outcome should this process achieve?"
              multiline
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="owner"
                label="Process owner"
                value={input.ownerRole}
                onChange={(value) => update("ownerRole", value)}
                placeholder="Name or role"
              />
              <Field
                id="guardian"
                label="Process guardian"
                value={guardianName}
                onChange={setGuardianName}
                placeholder="Name"
              />
            </div>
            <Field
              id="trigger"
              label="Trigger"
              value={input.trigger}
              onChange={(value) => update("trigger", value)}
              placeholder="What starts this process?"
            />
            <Field
              id="ending"
              label="Ending point"
              value={input.output}
              onChange={(value) => update("output", value)}
              placeholder="What does complete look like?"
            />
            <Field
              id="cadence"
              label="Auditing frequency"
              value={input.cadence}
              onChange={(value) => update("cadence", value)}
              placeholder="e.g. Weekly, Monthly, Quarterly"
            />
            <Field
              id="audit-questions"
              label="Auditing questions"
              value={input.auditQuestions}
              onChange={(value) => update("auditQuestions", value)}
              placeholder="List the checkpoints you will review during governance."
              multiline
            />
          </div>
        )}
        {step === 1 && (
          <div className="mt-5">
            <p className="text-sm leading-6 text-muted-foreground">
              Add templates and links your team uses—Google Docs, Google Sheets,
              message templates, or any other reference. This step is optional.
            </p>
            <div className="mt-5 space-y-3">
              {input.resourceLinks.length === 0 && (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No templates yet. Add one when you are ready.
                </p>
              )}
              {input.resourceLinks.map((template, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.4fr)_auto]"
                >
                  <Input
                    aria-label={`Template ${index + 1} name`}
                    value={template.label}
                    onChange={(event) =>
                      updateTemplate(index, "label", event.target.value)
                    }
                    placeholder="Template name"
                  />
                  <Select
                    value={template.resourceType}
                    onValueChange={(value) =>
                      updateTemplate(index, "resourceType", value)
                    }
                  >
                    <SelectTrigger aria-label={`Template ${index + 1} type`}>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {resourceTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    aria-label={`Template ${index + 1} link`}
                    value={template.url}
                    onChange={(event) =>
                      updateTemplate(index, "url", event.target.value)
                    }
                    placeholder="https://docs.google.com/..."
                    type="url"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove template ${index + 1}`}
                    onClick={() => removeTemplate(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={addTemplate}
            >
              <Plus aria-hidden="true" /> Add template or link
            </Button>
          </div>
        )}
        {step === 2 && mapPhase === "upload" && (
          <div className="mt-5">
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm leading-6 text-teal-950">
              <p className="flex items-center gap-2 font-semibold">
                <FileCode2 className="size-4" aria-hidden="true" /> HTML process
                map
              </p>
              <p className="mt-1">
                Upload the exported HTML file. It is stored as-is and shown on
                the process page.
              </p>
            </div>
            {existingHtmlName && !htmlFile && (
              <p className="mt-4 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
                Current map: <strong>{existingHtmlName}</strong>. Upload a new
                file only if you want to replace it in this version.
              </p>
            )}
            <Label
              htmlFor="process-html"
              className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-[var(--surface-subtle)] p-5 text-center hover:border-[var(--brand-primary)]"
            >
              <FileCode2 className="size-8 text-[var(--brand-primary)]" />
              <span className="mt-3 font-semibold">
                {htmlFile ? "Replace HTML file" : "Attach HTML file"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                .html or .htm · maximum 25 MB
              </span>
              <input
                id="process-html"
                type="file"
                accept="text/html,.html,.htm"
                className="sr-only"
                onChange={(event) =>
                  selectHtml(event.target.files?.[0] ?? null)
                }
              />
            </Label>
            {htmlFile && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border bg-white p-4 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <FileCode2 className="size-5 shrink-0" />
                  <span className="truncate font-semibold">{htmlFile.name}</span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => selectHtml(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>
        )}
        {step === 2 && mapPhase === "review" && (
          <div className="mt-5 space-y-5">
            <ReviewSection title="Process details">
              <ReviewRow label="Name" value={input.name} />
              <ReviewRow label="Goal" value={input.goal} />
              <ReviewRow label="Owner" value={input.ownerRole} />
              <ReviewRow label="Guardian" value={guardianName} />
              <ReviewRow label="Trigger" value={input.trigger} />
              <ReviewRow label="Ending point" value={input.output} />
              <ReviewRow label="Auditing frequency" value={input.cadence} />
              <ReviewRow
                label="Auditing questions"
                value={input.auditQuestions}
              />
            </ReviewSection>
            <ReviewSection title="Templates & links">
              {filteredLinks.length ? (
                <ul className="space-y-2 text-sm">
                  {filteredLinks.map((link, index) => (
                    <li key={index} className="rounded-lg border px-3 py-2">
                      <p className="font-medium">{link.label}</p>
                      <a
                        href={link.url}
                        className="mt-1 block truncate text-[var(--brand-primary)] underline-offset-2 hover:underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {link.url}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No templates added.
                </p>
              )}
            </ReviewSection>
            <ReviewSection title="Process map">
              <p className="mb-3 text-sm text-muted-foreground">
                {htmlFile?.name ?? existingHtmlName ?? "No map attached"}
              </p>
              {previewUrl ? (
                <iframe
                  title="HTML process map preview"
                  src={previewUrl}
                  sandbox="allow-scripts"
                  className="h-[420px] w-full rounded-xl border bg-white"
                />
              ) : (
                <p className="rounded-xl border border-dashed py-10 text-center text-sm text-muted-foreground">
                  The existing map from the previous version will stay attached
                  unless you uploaded a replacement file.
                </p>
              )}
            </ReviewSection>
          </div>
        )}
      </section>
      <div className="mt-4 flex gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              if (step === 2 && mapPhase === "review") {
                setMapPhase("upload");
                return;
              }
              setStep(step - 1);
            }}
          >
            <ChevronLeft /> Back
          </Button>
        )}
        {step < steps.length - 1 || (step === 2 && mapPhase === "upload") ? (
          <Button
            size="lg"
            className="flex-1"
            disabled={!stepValid[step]}
            onClick={goNext}
          >
            {step === 2 ? "Continue to review" : "Continue"} <ArrowRight />
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            disabled={!hasProcessMap || creating}
            onClick={persistProcess}
          >
            {creating ? <LoaderCircle className="animate-spin" /> : <Check />}
            {creating
              ? "Saving…"
              : mode === "edit"
                ? "Save new version"
                : "Save to Process Library"}
          </Button>
        )}
      </div>
      {!valid && stepValid.slice(0, step + 1).some((item) => !item) && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          To continue: {hint}
        </p>
      )}
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b py-2 last:border-b-0 sm:grid-cols-[10rem_1fr]">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm leading-6 whitespace-pre-wrap">{value || "—"}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2 min-h-24"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="mt-2"
        />
      )}
    </div>
  );
}
