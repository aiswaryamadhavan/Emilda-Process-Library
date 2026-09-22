"use client";

import { ExternalLink, FileCode2 } from "lucide-react";

import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";

export function HtmlProcessMap({
  attachmentId,
  filename,
}: {
  attachmentId: string;
  filename: string;
}) {
  const { localPrefix } = useTenantTheme();
  const downloadUrl = `${localPrefix}/api/attachments/${attachmentId}/download`;

  return (
    <div id="html-process-map" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm">
        <span className="flex min-w-0 items-center gap-2 font-medium">
          <FileCode2 className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{filename}</span>
        </span>
        <Button asChild variant="outline" size="sm">
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            Open original HTML <ExternalLink aria-hidden="true" />
          </a>
        </Button>
      </div>
      <iframe
        title="Uploaded HTML process map"
        src={`${downloadUrl}?inline=1`}
        sandbox=""
        referrerPolicy="no-referrer"
        className="h-[680px] w-full rounded-xl border bg-white"
      />
    </div>
  );
}
