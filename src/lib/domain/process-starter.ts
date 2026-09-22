import { z } from "zod";
import { processGraphSchema } from "@/lib/domain/types";

const answer = z.string().trim().max(4000);

export const processResourceLinkInputSchema = z.object({
  label: z.string().trim().min(2).max(160),
  resourceType: z.enum(["TEMPLATE", "DOCUMENT", "FORM", "EXAMPLE", "OTHER"]),
  url: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine((value) => /^https?:\/\//i.test(value), {
      message: "Use an http or https link.",
    }),
  description: z.string().trim().max(500),
});

export type ProcessResourceLinkInput = z.infer<
  typeof processResourceLinkInputSchema
>;

export const processStarterInputSchema = z.object({
  name: z.string().trim().min(2).max(160),
  department: z.string().trim().min(2).max(120),
  goal: z.string().trim().min(5).max(2000),
  problem: answer,
  currentMethod: answer,
  trigger: answer,
  ownerRole: answer,
  contributors: answer,
  inputs: answer,
  output: answer,
  evidence: answer,
  exceptions: answer,
  cadence: z.string().trim().max(120),
  constraints: answer,
  auditQuestions: z.string().trim().max(4000).default(""),
  resourceLinks: z.array(processResourceLinkInputSchema).max(20).default([]),
});

export type ProcessStarterInput = z.infer<typeof processStarterInputSchema>;

export const processStarterDraftSchema = z.object({
  purpose: z.string().min(3).max(2000),
  businessProblem: z.string().max(2000),
  goal: z.string().min(3).max(2000),
  trigger: z.string().min(2).max(1000),
  inScope: z.string().max(2000),
  outOfScope: z.string().max(2000),
  ownerRole: z.string().min(2).max(160),
  contributors: z.array(z.string().min(1).max(160)).max(20),
  inputs: z.array(z.string().min(1).max(300)).max(20),
  output: z.string().min(2).max(1000),
  metrics: z
    .array(
      z.object({
        name: z.string().min(2).max(200),
        target: z.string().min(1).max(300),
        cadence: z.string().min(1).max(120),
        dataSource: z.string().max(300),
      }),
    )
    .min(1)
    .max(8),
  exceptions: z
    .array(
      z.object({
        scenario: z.string().min(2).max(500),
        response: z.string().min(2).max(1000),
        escalation: z.string().max(500),
      }),
    )
    .max(10),
  graph: processGraphSchema,
  assumptions: z.array(z.string().min(2).max(500)).max(15),
  unansweredQuestions: z.array(z.string().min(2).max(500)).max(15),
});

export type ProcessStarterDraft = z.infer<typeof processStarterDraftSchema>;

function list(value: string) {
  return value
    .split(/\n|,|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function createStarterDraft(
  input: ProcessStarterInput,
): ProcessStarterDraft {
  const contributors = list(input.contributors);
  const inputs = list(input.inputs);
  const owner = input.ownerRole || `${input.department} Process Owner`;
  const trigger =
    input.trigger || `A new ${input.name.toLowerCase()} request is ready`;
  const output = input.output || `${input.name} is completed and recorded`;
  const evidence = input.evidence || "Completion record";
  const hasException = Boolean(input.exceptions.trim());

  const nodes: ProcessStarterDraft["graph"]["nodes"] = [
    {
      id: "start",
      type: "START",
      title: trigger,
      position: { x: 0, y: 120 },
    },
    {
      id: "prepare",
      type: "ACTION",
      title: `Check the request is ready`,
      actor: contributors[0] || owner,
      action: `Confirm the required information is present before work begins.`,
      timing: "At the start",
      why: "Avoid preventable rework and unclear handoffs.",
      evidence,
      position: { x: 270, y: 120 },
    },
    {
      id: "complete_work",
      type: "ACTION",
      title: `Complete ${input.name.toLowerCase()}`,
      actor: contributors[1] || owner,
      action:
        input.currentMethod ||
        `Complete the agreed work using the approved method.`,
      timing: input.cadence || "Within the agreed service time",
      why: input.goal,
      evidence,
      position: { x: 540, y: 120 },
    },
    {
      id: "verify",
      type: "DECISION",
      title: "Outcome and evidence complete?",
      actor: owner,
      position: { x: 810, y: 120 },
    },
    {
      id: "correct",
      type: "HANDOFF",
      title: "Correct or escalate the exception",
      actor: owner,
      action:
        input.exceptions ||
        "Resolve the gap or escalate when it cannot be corrected.",
      timing: "Before the process is closed",
      evidence: "Exception note and decision",
      position: { x: 810, y: 330 },
    },
    {
      id: "record",
      type: "DATA",
      title: "Record completion and evidence",
      actor: owner,
      evidence,
      position: { x: 1080, y: 120 },
    },
    {
      id: "end",
      type: "END",
      title: output,
      position: { x: 1350, y: 120 },
    },
  ];

  const assumptions = [
    "The suggested sequence is a starting structure and must be checked with the people who do the work.",
    "The 95% success target is a starting suggestion until a real baseline is available.",
    !input.ownerRole && `A ${input.department} Process Owner will be assigned.`,
    !input.trigger && "The exact start trigger still needs confirmation.",
    !input.evidence && "A completion record is acceptable evidence.",
    !input.cadence && "The timing/SLA will be agreed during review.",
    !hasException && "An exception path is needed before approval.",
  ].filter((item): item is string => Boolean(item));

  const unansweredQuestions = [
    "What current baseline should the first success target use?",
    !input.ownerRole && "Who is the one accountable Process Owner?",
    !input.trigger && "What exact event starts this process?",
    !input.evidence &&
      "What evidence proves the outcome was completed correctly?",
    !input.exceptions &&
      "What are the two most common ways this process fails?",
    !input.constraints &&
      "Which system, policy, or resource constraints must the design respect?",
  ].filter((item): item is string => Boolean(item));

  return {
    purpose: `Ensure ${input.name.toLowerCase()} produces a reliable, visible outcome without owner chasing.`,
    businessProblem:
      input.problem ||
      "The current outcome is not consistently visible or dependable.",
    goal: input.goal,
    trigger,
    inScope: `Work from ${trigger.toLowerCase()} through ${output.toLowerCase()}.`,
    outOfScope:
      "Upstream demand creation and downstream work after the recorded outcome.",
    ownerRole: owner,
    contributors,
    inputs: inputs.length
      ? inputs
      : ["Complete request or required source information"],
    output,
    metrics: [
      {
        name: `${input.name} completed correctly and on time`,
        target: "95% or better during the agreed review period",
        cadence: input.cadence || "Monthly",
        dataSource: evidence,
      },
    ],
    exceptions: [
      {
        scenario:
          input.exceptions || "Required information or evidence is missing",
        response:
          "Pause the normal flow, record the gap, and assign a correction owner.",
        escalation: `Escalate to ${owner} when the gap cannot be corrected within the agreed time.`,
      },
    ],
    graph: {
      direction: "LR",
      nodes,
      edges: [
        { id: "e1", source: "start", target: "prepare" },
        { id: "e2", source: "prepare", target: "complete_work" },
        { id: "e3", source: "complete_work", target: "verify" },
        { id: "e4", source: "verify", target: "record", label: "Yes" },
        { id: "e5", source: "verify", target: "correct", label: "No" },
        {
          id: "e6",
          source: "correct",
          target: "complete_work",
          label: "Corrected",
        },
        { id: "e7", source: "record", target: "end" },
      ],
    },
    assumptions,
    unansweredQuestions,
  };
}
