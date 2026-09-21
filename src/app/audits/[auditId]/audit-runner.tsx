"use client";
import Link from "next/link";
import {
  Camera,
  Check,
  FileUp,
  MessageSquareText,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { completeAudit, saveAuditItem } from "@/app/actions/process-actions";
const checkpoints = [
  "Metric values updated before Monday review?",
  "Metric owners verified their values?",
  "Missing metrics were marked visibly?",
  "Operations Lead reviewed exceptions?",
  "Commitments have an accountable owner?",
  "Completed scorecard is available as evidence?",
];
type Answer = "YES" | "PARTIALLY" | "NO" | "NOT_APPLICABLE";
interface AuditState {
  index: number;
  answers: Record<number, Answer>;
  comments: Record<number, string>;
  completed: boolean;
  health?: string;
}
const initial: AuditState = {
  index: 0,
  answers: {},
  comments: {},
  completed: false,
};
export function AuditRunner() {
  const [audit, setAudit] = useState<AuditState>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("emilda:audit:week38");
      if (saved) setAudit(JSON.parse(saved));
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (ready)
      window.localStorage.setItem("emilda:audit:week38", JSON.stringify(audit));
  }, [audit, ready]);
  const answer = audit.answers[audit.index];
  const saveNext = async () => {
    if (!answer) return toast.error("Choose a result before continuing");
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const itemId = `81000000-0000-4000-8000-0000000000${10 + audit.index}`;
      const saved = await saveAuditItem({
        itemId,
        followed: answer,
        comment: audit.comments[audit.index],
      });
      if (!saved.ok) return toast.error(saved.error);
    }
    if (audit.index === checkpoints.length - 1) {
      let health = "NEEDS_ATTENTION";
      if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
        const result = await completeAudit(
          "80000000-0000-4000-8000-000000000002",
        );
        if (!result.ok) return toast.error(result.error);
        health = result.health ?? health;
      }
      setAudit((value) => ({ ...value, completed: true, health }));
      toast.success("Audit completed. Health snapshot recorded.");
    } else setAudit((value) => ({ ...value, index: value.index + 1 }));
  };
  if (audit.completed)
    return (
      <Card className="shadow-none">
        <CardContent className="p-7 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-amber-100 text-amber-900">
            <Check />
          </span>
          <h2 className="mt-5 text-xl font-semibold">Audit completed</h2>
          <p className="mt-2 text-muted-foreground">
            Calculated health:{" "}
            {(audit.health ?? "Needs attention")
              .replaceAll("_", " ")
              .toLowerCase()}{" "}
            · Next audit: 19 September
          </p>
          <Button asChild className="mt-6 min-h-11 rounded-xl">
            <Link href="/issues/invoice-delay">View issue raised</Link>
          </Button>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => {
              setAudit(initial);
              window.localStorage.removeItem("emilda:audit:week38");
            }}
          >
            <RotateCcw />
            Reset demo audit
          </Button>
        </CardContent>
      </Card>
    );
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>
          {audit.index + 1} of {checkpoints.length} checkpoints
        </span>
        <span className="text-muted-foreground">Saved automatically</span>
      </div>
      <Progress
        value={(audit.index / checkpoints.length) * 100}
        aria-label="Audit completion"
        className="mt-3 h-2"
      />
      <Card className="mt-6 shadow-none">
        <CardContent className="p-5 sm:p-7">
          <p className="eyebrow">Current checkpoint</p>
          <h2 className="mt-3 text-xl font-semibold leading-8 text-[var(--navy)]">
            {checkpoints[audit.index]}
          </h2>
          <RadioGroup
            value={answer ?? ""}
            onValueChange={(value) =>
              setAudit((state) => ({
                ...state,
                answers: { ...state.answers, [state.index]: value as Answer },
              }))
            }
            className="mt-6 grid grid-cols-2 gap-3"
          >
            {[
              ["YES", "Yes"],
              ["PARTIALLY", "Partially"],
              ["NO", "No"],
              ["NOT_APPLICABLE", "N/A"],
            ].map(([value, label]) => (
              <Label
                key={value}
                htmlFor={value}
                className={`flex min-h-14 cursor-pointer items-center justify-center rounded-xl border px-3 text-center font-medium ${answer === value ? "border-[var(--brand-primary)] bg-teal-50 text-teal-900 ring-2 ring-teal-100" : "bg-white"}`}
              >
                <RadioGroupItem id={value} value={value} className="sr-only" />
                {label}
              </Label>
            ))}
          </RadioGroup>
          <div className="mt-6">
            <Label htmlFor="audit-comment">Note</Label>
            <Textarea
              id="audit-comment"
              value={audit.comments[audit.index] ?? ""}
              onChange={(event) =>
                setAudit((state) => ({
                  ...state,
                  comments: {
                    ...state.comments,
                    [state.index]: event.target.value,
                  },
                }))
              }
              placeholder="Add only what someone needs to understand"
              className="mt-2 rounded-xl"
            />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <EvidenceButton
              icon={Camera}
              label="Photo"
              accept="image/jpeg,image/png,image/webp"
              capture
            />
            <Button
              type="button"
              variant="outline"
              className="min-h-14 flex-col gap-1 rounded-xl text-xs"
              onClick={() => document.getElementById("audit-comment")?.focus()}
            >
              <MessageSquareText className="size-4" />
              Note
            </Button>
            <EvidenceButton icon={FileUp} label="File" />
          </div>
        </CardContent>
      </Card>
      <Button
        onClick={saveNext}
        size="lg"
        className="mt-4 min-h-12 w-full rounded-xl"
      >
        {audit.index === checkpoints.length - 1
          ? "Complete audit"
          : "Save & next"}
      </Button>
      {audit.index > 0 && (
        <Button
          variant="ghost"
          onClick={() =>
            setAudit((value) => ({ ...value, index: value.index - 1 }))
          }
          className="mt-2 min-h-11 w-full"
        >
          Previous checkpoint
        </Button>
      )}
    </div>
  );
}
function EvidenceButton({
  icon: Icon,
  label,
  accept,
  capture,
}: {
  icon: typeof Camera;
  label: string;
  accept?: string;
  capture?: boolean;
}) {
  return (
    <Label className="flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border bg-white text-xs font-medium">
      <Icon className="size-4" />
      {label}
      <input
        className="sr-only"
        type="file"
        accept={accept}
        capture={capture ? "environment" : undefined}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const form = new FormData();
          form.set("file", file);
          form.set("processId", "50000000-0000-4000-8000-000000000001");
          form.set("entityType", "AUDIT");
          form.set("entityId", "80000000-0000-4000-8000-000000000002");
          const localPrefix =
            /^\/t\/[^/]+/.exec(window.location.pathname)?.[0] ?? "";
          const response = await fetch(`${localPrefix}/api/attachments`, {
            method: "POST",
            body: form,
          });
          const data = await response.json();
          if (response.ok) toast.success(`${data.filename} attached securely`);
          else toast.error(data.error ?? "Upload did not finish.");
        }}
      />
    </Label>
  );
}
