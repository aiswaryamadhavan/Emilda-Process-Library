"use client";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { TenantLink } from "@/components/tenant-link";
const stages = [
  [
    "Problem",
    "What business problem are we solving?",
    "Symptoms, owner concern, affected people, and impact",
  ],
  [
    "Current state",
    "How does work happen today?",
    "Describe the real process, including workarounds and constraints",
  ],
  [
    "Root cause",
    "What appears to create the problem?",
    "Name the condition beneath the visible symptoms",
  ],
  [
    "Target outcome",
    "What should improve?",
    "Use a measurable outcome where possible",
  ],
  [
    "Future process",
    "What is the agreed new way of working?",
    "Describe the change before arranging the process map",
  ],
  [
    "Responsibilities",
    "Who owns the outcome?",
    "Use exactly one accountable Process Owner",
  ],
  [
    "Exceptions",
    "What can realistically go wrong?",
    "Capture the most likely exceptions and escalation",
  ],
  [
    "Success metrics",
    "How will we know this works?",
    "Add a metric, target, evidence source, and cadence",
  ],
  [
    "Review",
    "Is the process ready for review?",
    "Check purpose, graph, owner, approver, metric, cadence, and audit checkpoint",
  ],
  [
    "Owner approval",
    "Who will approve this release?",
    "The approver receives a concise mobile review",
  ],
] as const;
const seed = [
  "Routine purchase approvals are delayed by a manager dependency.",
  "Requests arrive digitally, but approval still moves through WhatsApp.",
  "Only one manager can approve every amount.",
  "Approve routine purchases within 24 hours.",
  "Delegate approval below ₹25,000 to the Operations Lead.",
  "Aishwarya Menon",
  "Escalate purchases near the threshold or with missing evidence.",
  "95% of routine requests approved within 24 hours.",
  "",
  "Aishwarya Menon",
];
export function DesignWizard({ isNew = false }: { isNew?: boolean }) {
  const storageKey = isNew ? "emilda:design:new" : "emilda:design:purchase-v21";
  const [stage, setStage] = useState(0);
  const [values, setValues] = useState(seed);
  const [saved, setSaved] = useState("Saved just now");
  const loaded = useRef(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const state = JSON.parse(raw);
        setStage(state.stage ?? 0);
        setValues(state.values ?? seed);
      }
      loaded.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey]);
  useEffect(() => {
    if (!loaded.current) return;
    const savingFrame = window.requestAnimationFrame(() => setSaved("Saving…"));
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ stage, values }),
      );
      setSaved("Saved just now");
    }, 750);
    return () => {
      window.cancelAnimationFrame(savingFrame);
      window.clearTimeout(timeout);
    };
  }, [stage, values, storageKey]);
  const current = stages[stage];
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>
          Step {stage + 1} of {stages.length}
        </span>
        <span className="text-muted-foreground" aria-live="polite">
          {saved}
        </span>
      </div>
      <Progress
        value={((stage + 1) / stages.length) * 100}
        aria-label="Process design completion"
        className="mt-3 h-2"
      />
      <div className="mt-7 rounded-2xl border bg-white p-5 sm:p-7">
        <p className="eyebrow">{current[0]}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--navy)]">
          {current[1]}
        </h2>
        <p className="mt-2 leading-7 text-muted-foreground">{current[2]}</p>
        <div className="mt-6">
          <Label htmlFor="stage-answer">Your answer</Label>
          {stage === 5 || stage === 9 ? (
            <Input
              id="stage-answer"
              className="mt-2 h-12 rounded-xl"
              value={values[stage]}
              onChange={(e) =>
                setValues((state) =>
                  state.map((value, index) =>
                    index === stage ? e.target.value : value,
                  ),
                )
              }
            />
          ) : (
            <Textarea
              id="stage-answer"
              className="mt-2 min-h-36 rounded-xl"
              value={values[stage]}
              onChange={(e) =>
                setValues((state) =>
                  state.map((value, index) =>
                    index === stage ? e.target.value : value,
                  ),
                )
              }
            />
          )}
        </div>
        {stage === 8 && (
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            {[
              "Purpose and goal complete",
              "One Process Owner assigned",
              "Success metric defined",
              "Audit checkpoint configured",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <Check className="size-4 text-emerald-700" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex gap-3">
        {stage > 0 && (
          <Button
            variant="outline"
            size="lg"
            className="min-h-12 rounded-xl"
            onClick={() => setStage((value) => value - 1)}
          >
            <ChevronLeft />
            Back
          </Button>
        )}
        {stage < 4 ? (
          <Button
            size="lg"
            className="min-h-12 flex-1 rounded-xl"
            disabled={!values[stage].trim()}
            onClick={() => setStage((value) => value + 1)}
          >
            Save & continue
            <ArrowRight />
          </Button>
        ) : stage === 4 ? (
          <Button asChild size="lg" className="min-h-12 flex-1 rounded-xl">
            <TenantLink href="/processes/purchase-approval/versions/demo/builder">
              Build process map
              <ArrowRight />
            </TenantLink>
          </Button>
        ) : stage < 9 ? (
          <Button
            size="lg"
            className="min-h-12 flex-1 rounded-xl"
            disabled={stage !== 8 && !values[stage].trim()}
            onClick={() => setStage((value) => value + 1)}
          >
            Save & continue
            <ArrowRight />
          </Button>
        ) : (
          <Button asChild size="lg" className="min-h-12 flex-1 rounded-xl">
            <TenantLink href="/approvals/purchase-v21">
              Send for approval
              <ArrowRight />
            </TenantLink>
          </Button>
        )}
      </div>
    </div>
  );
}
