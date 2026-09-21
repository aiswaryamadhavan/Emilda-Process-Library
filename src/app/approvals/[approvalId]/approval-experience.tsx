"use client";
import { Check, FileText, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TenantLink } from "@/components/tenant-link";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { respondToApproval } from "@/app/actions/process-actions";
type Decision = "PENDING" | "APPROVED" | "CHANGES_REQUESTED";
export function ApprovalExperience() {
  const [decision, setDecision] = useState<Decision>("PENDING");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem("emilda:approval:purchase-v21");
      if (saved === "APPROVED" || saved === "CHANGES_REQUESTED")
        setDecision(saved);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  const record = async (next: Decision) => {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      setSubmitting(true);
      const result = await respondToApproval({
        approvalId: "c0000000-0000-4000-8000-000000000001",
        decision: next,
        acknowledgementText:
          next === "APPROVED"
            ? "I reviewed Purchase Approval version 2.1 and approve it for the stated effective date."
            : "Changes requested by the assigned approver.",
        note,
      });
      setSubmitting(false);
      if (!result.ok) return toast.error(result.error);
    }
    setDecision(next);
    window.localStorage.setItem("emilda:approval:purchase-v21", next);
    toast.success(
      next === "APPROVED"
        ? "Version 2.1 approved and locked"
        : "Changes requested from the Process Guardian",
    );
  };
  if (decision !== "PENDING")
    return (
      <Card className="border-0 bg-white shadow-none">
        <CardContent className="p-7 text-center">
          <span
            className={`mx-auto grid size-14 place-items-center rounded-full ${decision === "APPROVED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}
          >
            <Check />
          </span>
          <h2 className="mt-5 text-xl font-semibold">
            {decision === "APPROVED" ? "Process approved" : "Changes requested"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {decision === "APPROVED"
              ? "Your immutable acknowledgement has been recorded for this exact revision."
              : "The current approval is closed. A revised version will need a new approval."}
          </p>
          <Button asChild className="mt-6 min-h-11 rounded-xl">
            <TenantLink href="/">Return home</TenantLink>
          </Button>
          {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
            <Button
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => {
                window.localStorage.removeItem("emilda:approval:purchase-v21");
                setDecision("PENDING");
              }}
            >
              Reset demo
            </Button>
          )}
        </CardContent>
      </Card>
    );
  return (
    <div className="space-y-4">
      <Card className="shadow-none">
        <CardHeader>
          <p className="eyebrow">Why this change?</p>
        </CardHeader>
        <CardContent className="text-lg leading-7">
          Approvals are taking longer than 48 hours.
        </CardContent>
      </Card>
      <Card className="shadow-none">
        <CardHeader>
          <p className="eyebrow">What is changing?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Plus className="mt-0.5 size-5 shrink-0 text-emerald-700" />
            <span>Delegated approval below ₹25,000</span>
          </div>
          <div className="flex gap-3">
            <Minus className="mt-0.5 size-5 shrink-0 text-red-700" />
            <span>Manual WhatsApp approval</span>
          </div>
        </CardContent>
      </Card>
      <Button asChild variant="outline" className="min-h-12 w-full rounded-xl">
        <TenantLink href="/processes/purchase-approval">
          <FileText />
          View full process
        </TenantLink>
      </Button>
      <div className="pt-3">
        <Label htmlFor="approval-note">Optional note</Label>
        <Textarea
          id="approval-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add context for the Process Guardian"
          className="mt-2 min-h-24 rounded-xl bg-white"
        />
      </div>
      <div className="grid gap-3 pt-2 sm:grid-cols-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="lg" className="min-h-12 rounded-xl">
              Request changes
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send this back for changes?</AlertDialogTitle>
              <AlertDialogDescription>
                This closes the current approval. The Process Guardian must
                revise the process and request approval again.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
              <AlertDialogAction
                disabled={submitting}
                onClick={() => record("CHANGES_REQUESTED")}
              >
                Request changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" className="min-h-12 rounded-xl">
              Approve process
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Approve Purchase Approval v2.1?
              </AlertDialogTitle>
              <AlertDialogDescription>
                By confirming, you acknowledge that you reviewed version 2.1 for
                go-live on 20 September. This is an operational acknowledgement,
                not a legal digital signature.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go back</AlertDialogCancel>
              <AlertDialogAction
                disabled={submitting}
                onClick={() => record("APPROVED")}
              >
                I have reviewed and approve
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
