import { addDays, addMonths } from "date-fns";

export type AuditFrequency =
  | "WEEKLY"
  | "BIWEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "CUSTOM";

export function nextAuditDate(
  anchor: Date,
  completedAt: Date,
  frequency: AuditFrequency,
  customDays?: number,
): Date {
  let next = new Date(anchor);
  const advance = (date: Date) =>
    frequency === "WEEKLY"
      ? addDays(date, 7)
      : frequency === "BIWEEKLY"
        ? addDays(date, 14)
        : frequency === "MONTHLY"
          ? addMonths(date, 1)
          : frequency === "QUARTERLY"
            ? addMonths(date, 3)
            : addDays(date, Math.max(1, customDays ?? 30));
  while (next <= completedAt) next = advance(next);
  return next;
}
