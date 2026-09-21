import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  HelpCircle,
} from "lucide-react";
import type { HealthStatus } from "@/lib/domain/types";

const health = {
  HEALTHY: {
    label: "Healthy",
    className: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  NEEDS_ATTENTION: {
    label: "Needs attention",
    className: "border-amber-200 bg-amber-50 text-amber-900",
    icon: AlertTriangle,
  },
  CRITICAL: {
    label: "Critical",
    className: "border-red-200 bg-red-50 text-red-900",
    icon: CircleDot,
  },
  NOT_ENOUGH_DATA: {
    label: "Not enough data",
    className: "border-slate-200 bg-slate-50 text-slate-700",
    icon: HelpCircle,
  },
};
export function HealthBadge({ status }: { status: HealthStatus }) {
  const item = health[status];
  const Icon = item.icon;
  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold ${item.className}`}
    >
      <Icon className="size-3.5" />
      {item.label}
    </span>
  );
}
