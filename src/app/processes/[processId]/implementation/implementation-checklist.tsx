"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
const labels = [
  "Configuration complete",
  "Training complete",
  "Required users onboarded",
  "Old method closed",
  "Pilot complete",
  "Evidence attached",
];
export function ImplementationChecklist() {
  const [done, setDone] = useState([true, true, true, false, false, false]);
  const ready = done.every(Boolean);
  return (
    <div>
      <Card className="shadow-none">
        <CardContent className="divide-y p-0">
          {labels.map((label, index) => (
            <label
              key={label}
              className="flex min-h-16 cursor-pointer items-center gap-3 p-4"
            >
              <Checkbox
                checked={done[index]}
                onCheckedChange={(checked) =>
                  setDone((value) =>
                    value.map((item, i) =>
                      i === index ? checked === true : item,
                    ),
                  )
                }
              />
              <span className="font-medium">{label}</span>
            </label>
          ))}
        </CardContent>
      </Card>
      <Button
        size="lg"
        className="mt-5 min-h-12 w-full rounded-xl sm:w-auto"
        disabled={!ready}
        onClick={() =>
          toast.success("Go-live decision recorded. Release scheduled.")
        }
      >
        Record go-live decision
      </Button>
      {!ready && (
        <p className="mt-2 text-sm text-muted-foreground">
          Complete the required handoff before scheduling go-live.
        </p>
      )}
    </div>
  );
}
