import type { HealthComputation } from "./types";

export interface HealthInput {
  adherence?: number[];
  outcome?: Array<"MET" | "AT_RISK" | "MISSED">;
  evidence?: boolean[];
  sla?: boolean[];
  openIssueSeverities?: Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">;
  failedCriticalCheckpoint?: boolean;
}

const weights = {
  adherence: 35,
  outcome: 30,
  evidence: 15,
  sla: 10,
  issues: 10,
} as const;

const average = (values: number[]) =>
  values.reduce((total, value) => total + value, 0) / values.length;

export function calculateHealth(input: HealthInput): HealthComputation {
  const factors: HealthComputation["factors"] = {};
  if (input.adherence?.length) factors.adherence = average(input.adherence);
  if (input.outcome?.length)
    factors.outcome = average(
      input.outcome.map((value) =>
        value === "MET" ? 1 : value === "AT_RISK" ? 0.5 : 0,
      ),
    );
  if (input.evidence?.length)
    factors.evidence = average(input.evidence.map(Number));
  if (input.sla?.length) factors.sla = average(input.sla.map(Number));
  if (input.openIssueSeverities) {
    const severity = input.openIssueSeverities;
    factors.issues = severity.includes("CRITICAL")
      ? 0
      : severity.includes("HIGH")
        ? 0.3
        : severity.includes("MEDIUM")
          ? 0.65
          : severity.includes("LOW")
            ? 0.85
            : 1;
  }

  const availableWeight = Object.keys(factors).reduce(
    (sum, key) => sum + weights[key as keyof typeof weights],
    0,
  );
  const coverage = availableWeight / 100;
  const forcedCritical = Boolean(
    input.failedCriticalCheckpoint ||
      input.openIssueSeverities?.includes("CRITICAL"),
  );
  if (coverage < 0.5)
    return {
      status: "NOT_ENOUGH_DATA",
      score: null,
      coverage,
      factors,
      forcedCritical,
    };

  const score =
    (Object.entries(factors).reduce(
      (sum, [key, value]) =>
        sum + (value ?? 0) * weights[key as keyof typeof weights],
      0,
    ) /
      availableWeight) *
    100;
  return {
    status:
      forcedCritical || score < 60
        ? "CRITICAL"
        : score < 85
          ? "NEEDS_ATTENTION"
          : "HEALTHY",
    score: Math.round(score * 100) / 100,
    coverage,
    factors,
    forcedCritical,
  };
}
