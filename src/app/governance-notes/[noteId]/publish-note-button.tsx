"use client";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
export function PublishNoteButton() {
  const [published, setPublished] = useState(false);
  return (
    <Button
      size="lg"
      className="mt-5 min-h-12 w-full rounded-xl sm:w-auto"
      disabled={published}
      onClick={() => {
        setPublished(true);
        toast.success("Governance note published as immutable revision 1");
      }}
    >
      {published ? (
        <>
          <CheckCircle2 />
          Published
        </>
      ) : (
        "Publish governance note"
      )}
    </Button>
  );
}
