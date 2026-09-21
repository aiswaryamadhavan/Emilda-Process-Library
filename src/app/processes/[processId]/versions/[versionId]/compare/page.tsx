import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
const changes = [
  {
    kind: "ADDED",
    field: "Approval rule",
    after: "Operations Lead may approve below ₹25,000",
  },
  {
    kind: "REMOVED",
    field: "Approval channel",
    before: "Manager approval through WhatsApp",
  },
  { kind: "CHANGED", field: "SLA", before: "48 hours", after: "24 hours" },
] as const;
export default function ComparePage() {
  return (
    <AppShell
      title="Compare versions"
      description="Purchase Approval · v2.0 ↔ v2.1"
    >
      <div className="space-y-4">
        {changes.map((change) => (
          <Card key={change.field} className="shadow-none">
            <CardContent className="p-5">
              <Badge
                variant="outline"
                className={
                  change.kind === "ADDED"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : change.kind === "REMOVED"
                      ? "border-red-200 bg-red-50 text-red-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                }
              >
                {change.kind}
              </Badge>
              <h2 className="mt-3 font-semibold">{change.field}</h2>
              {"before" in change && (
                <p className="mt-2 text-sm text-red-800 line-through">
                  {change.before}
                </p>
              )}
              {"after" in change && (
                <p className="mt-2 text-sm text-emerald-800">{change.after}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
