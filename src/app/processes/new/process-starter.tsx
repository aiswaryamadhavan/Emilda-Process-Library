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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createProcessFromStarter } from "@/app/actions/process-actions";
import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import type {
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
  ["Process setup", "Goals, ownership, and governance"],
  ["Templates", "Save useful links"],
  ["Process map", "Upload HTML"],
] as const;
const isHtmlFile = (file: File) =>
  file.type === "text/html" || /\.html?$/i.test(file.name);

export function ProcessStarter({ departments }: { departments: string[] }) {
  const router = useRouter();
  const { localPrefix } = useTenantTheme();
  const [step, setStep] = useState(0);
  const [input, setInput] = useState<ProcessStarterInput>({
    ...emptyInput,
    department: departments[0] ?? "Operations",
  });
  const [guardianName, setGuardianName] = useState("");
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);

  const update = (key: keyof ProcessStarterInput, value: string) =>
    setInput((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      localStorage.setItem(
        "emilda:process-starter:draft",
        JSON.stringify({ step, input, guardianName }),
      );
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [guardianName, input, step]);

  const valid = [
    input.name.trim().length >= 2 &&
      input.goal.trim().length >= 5 &&
      input.problem.trim().length >= 5 &&
      input.ownerRole.trim().length >= 2 &&
      guardianName.trim().length >= 2 &&
      input.trigger.trim().length >= 2 &&
      input.output.trim().length >= 2 &&
      input.cadence.trim().length >= 2 &&
      input.auditQuestions.trim().length >= 5,
    input.resourceLinks.every(
      (item) =>
        !item.label.trim() ||
        (item.label.trim().length >= 2 && /^https?:\/\//i.test(item.url)),
    ),
    Boolean(htmlFile),
  ][step];
  const hint = [
    "Add the process name, goal, problem, owner, guardian, trigger, ending, audit cadence, and audit questions.",
    "Complete each template name and link, or remove empty rows.",
    "Attach the exported HTML process map.",
  ][step];

  const addTemplate = () =>
    setInput((current) => ({
      ...current,
      resourceLinks: [
        ...current.resourceLinks,
        { label: "", resourceType: "TEMPLATE", url: "", description: "" },
      ],
    }));
  const updateTemplate = (index: number, key: "label" | "url", value: string) =>
    setInput((current) => ({
      ...current,
      resourceLinks: current.resourceLinks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
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
  };

  const buildDraft = (fileName: string): ProcessStarterDraft => ({
    purpose: input.goal,
    businessProblem: input.problem,
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

  const createFromHtml = async () => {
    if (!htmlFile || creating) return;
    setCreating(true);
    const result = await createProcessFromStarter({
      input,
      draft: buildDraft(htmlFile.name),
      guardianName,
    });
    if (!result.ok || !result.processId || !result.versionId) {
      setCreating(false);
      toast.error(
        result.ok ? "The process could not be opened." : result.error,
      );
      return;
    }
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
          "The process was created, but the HTML file could not be attached. Please try again.",
      );
      return;
    }
    localStorage.removeItem("emilda:process-starter:draft");
    toast.success("Process added to the Process Library");
    router.push(`${localPrefix}/processes/${result.processId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          {step + 1} of {steps.length} · {steps[step][0]}
        </span>
        <span className="text-muted-foreground" aria-live="polite">
          Saved locally
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
              label="What is the goal of this process?"
              value={input.goal}
              onChange={(value) => update("goal", value)}
              placeholder="What outcome should this process achieve?"
              multiline
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                id="owner"
                label="Who is the process owner?"
                value={input.ownerRole}
                onChange={(value) => update("ownerRole", value)}
                placeholder="Name or role"
              />
              <Field
                id="guardian"
                label="Who is the process guardian?"
                value={guardianName}
                onChange={setGuardianName}
                placeholder="Name"
              />
            </div>
            <Field
              id="trigger"
              label="What starts this process?"
              value={input.trigger}
              onChange={(value) => update("trigger", value)}
              placeholder="e.g. Each morning at 10:00"
            />
            <Field
              id="ending"
              label="What is the ending point?"
              value={input.output}
              onChange={(value) => update("output", value)}
              placeholder="What does complete look like?"
            />
            <Field
              id="problem"
              label="What problem are we solving?"
              value={input.problem}
              onChange={(value) => update("problem", value)}
              placeholder="Describe the business pain this process fixes."
              multiline
            />
            <Field
              id="cadence"
              label="What is the auditing duration?"
              value={input.cadence}
              onChange={(value) => update("cadence", value)}
              placeholder="e.g. Weekly, Monthly, Quarterly"
            />
            <Field
              id="audit-questions"
              label="What are the auditing questions?"
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
              Add message templates, document templates, Google Docs, Google
              Sheets, or any other useful link. This step is optional.
            </p>
            <div className="mt-5 space-y-3">
              {input.resourceLinks.map((template, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"
                >
                  <Input
                    aria-label={`Template ${index + 1} name`}
                    value={template.label}
                    onChange={(event) =>
                      updateTemplate(index, "label", event.target.value)
                    }
                    placeholder="Template name"
                  />
                  <Input
                    aria-label={`Template ${index + 1} link`}
                    value={template.url}
                    onChange={(event) =>
                      updateTemplate(index, "url", event.target.value)
                    }
                    placeholder="Google Doc or Sheet link"
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
              <Plus aria-hidden="true" /> Add a template
            </Button>
          </div>
        )}
        {step === 2 && (
          <div className="mt-5">
            <div className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 text-sm leading-6 text-teal-950">
              <p className="flex items-center gap-2 font-semibold">
                <FileCode2 className="size-4" aria-hidden="true" /> Add the HTML
                process map
              </p>
              <p className="mt-1">
                The original HTML becomes the read-only process map in the
                Process Library. No AI and no manual map editing.
              </p>
            </div>
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
                  <span className="truncate font-semibold">
                    {htmlFile.name}
                  </span>
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
      </section>
      <div className="mt-4 flex gap-3">
        {step > 0 && (
          <Button variant="outline" size="lg" onClick={() => setStep(step - 1)}>
            <ChevronLeft /> Back
          </Button>
        )}
        {step < steps.length - 1 ? (
          <Button
            size="lg"
            className="flex-1"
            disabled={!valid}
            onClick={() => setStep(step + 1)}
          >
            Continue <ArrowRight />
          </Button>
        ) : (
          <Button
            size="lg"
            className="flex-1"
            disabled={!valid || creating}
            onClick={createFromHtml}
          >
            {creating ? <LoaderCircle className="animate-spin" /> : <Check />}
            {creating ? "Saving process…" : "Save to Process Library"}
          </Button>
        )}
      </div>
      {!valid && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          To continue: {hint}
        </p>
      )}
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
