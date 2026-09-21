"use client";

import {
  ArrowRightLeft,
  Blocks,
  CirclePlay,
  Clock3,
  Database,
  Flag,
  GitBranch,
  ListChecks,
} from "lucide-react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";

import type { ProcessNodeType } from "@/lib/domain/types";

export type ProcessFlowData = Record<string, unknown> & {
  label: string;
  processType: ProcessNodeType;
  actor?: string;
  timing?: string;
  why?: string;
  evidence?: string;
};

export type ProcessFlowNodeType = Node<ProcessFlowData, "processStep">;

const visual = {
  START: {
    icon: CirclePlay,
    label: "Start",
    shell: "border-emerald-300 bg-emerald-50/95",
    badge: "bg-emerald-100 text-emerald-800",
  },
  ACTION: {
    icon: ListChecks,
    label: "Action",
    shell: "border-slate-300 bg-white",
    badge: "bg-slate-100 text-slate-700",
  },
  DECISION: {
    icon: GitBranch,
    label: "Decision",
    shell: "border-amber-300 bg-amber-50/95",
    badge: "bg-amber-100 text-amber-900",
  },
  HANDOFF: {
    icon: ArrowRightLeft,
    label: "Handoff",
    shell: "border-blue-300 bg-blue-50/95",
    badge: "bg-blue-100 text-blue-800",
  },
  WAIT: {
    icon: Clock3,
    label: "Wait",
    shell: "border-violet-300 bg-violet-50/95",
    badge: "bg-violet-100 text-violet-800",
  },
  DATA: {
    icon: Database,
    label: "Record",
    shell: "border-cyan-300 bg-cyan-50/95",
    badge: "bg-cyan-100 text-cyan-900",
  },
  SUBPROCESS: {
    icon: Blocks,
    label: "Subprocess",
    shell: "border-indigo-300 bg-indigo-50/95",
    badge: "bg-indigo-100 text-indigo-800",
  },
  END: {
    icon: Flag,
    label: "End",
    shell: "border-slate-700 bg-slate-800 text-white",
    badge: "bg-white/12 text-white",
  },
} as const;

export function ProcessFlowNode({
  data,
  selected,
}: NodeProps<ProcessFlowNodeType>) {
  const style = visual[data.processType];
  const Icon = style.icon;
  const isStart = data.processType === "START";
  const isEnd = data.processType === "END";

  return (
    <div
      className={`w-56 rounded-xl border-2 px-4 py-3 shadow-[0_5px_16px_rgba(15,23,42,0.08)] transition-shadow ${style.shell} ${
        selected ? "ring-4 ring-[var(--brand-primary)]/20" : ""
      }`}
    >
      {!isStart && (
        <Handle
          type="target"
          position={Position.Left}
          className="!size-3 !border-2 !border-white !bg-slate-500"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${style.badge}`}
        >
          <Icon className="size-3" aria-hidden="true" />
          {style.label}
        </span>
      </div>
      <p className="mt-2.5 text-[14px] font-semibold leading-5 tracking-[-0.015em]">
        {data.label}
      </p>
      {(data.actor || data.timing) && (
        <p
          className={`mt-2 text-[11px] leading-4 ${isEnd ? "text-white/65" : "text-muted-foreground"}`}
        >
          {data.actor}
          {data.actor && data.timing ? " · " : ""}
          {data.timing}
        </p>
      )}
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Right}
          className="!size-3 !border-2 !border-white !bg-[var(--brand-primary)]"
        />
      )}
    </div>
  );
}

export const processFlowNodeTypes = { processStep: ProcessFlowNode };
