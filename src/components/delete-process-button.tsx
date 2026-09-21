"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteDraftProcess } from "@/app/actions/process-actions";
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
import { useTenantTheme } from "@/components/tenant-provider";

export function DeleteProcessButton({
  processId,
  processName,
}: {
  processId: string;
  processName: string;
}) {
  const { localPrefix } = useTenantTheme();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    setDeleting(true);
    const result = await deleteDraftProcess({ processId });
    if (!result.ok) {
      toast.error(result.error);
      setDeleting(false);
      return;
    }
    toast.success("Draft process deleted");
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${localPrefix}/processes`);
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="min-h-11 w-full text-destructive hover:text-destructive sm:w-auto"
        >
          <Trash2 aria-hidden="true" /> Delete process
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{processName}”?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes this unapproved draft from the Process Library. It is
            not available for processes with approvals, audits, issues, or a
            live version.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>
            Keep process
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={deleting}
            onClick={(event) => {
              event.preventDefault();
              void remove();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
            Delete draft
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
