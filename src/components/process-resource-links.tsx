"use client";

import {
  ExternalLink,
  FileText,
  Link2,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  addProcessResourceLink,
  removeProcessResourceLink,
} from "@/app/actions/process-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProcessWorkspace } from "@/lib/data/processes";
import type { ProcessResourceLinkInput } from "@/lib/domain/process-starter";

type ResourceLink = ProcessWorkspace["resourceLinks"][number];

const emptyResource: ProcessResourceLinkInput = {
  label: "",
  resourceType: "TEMPLATE",
  url: "",
  description: "",
};

export function ProcessResourceLinks({
  processId,
  versionId,
  initialLinks,
  editable,
}: {
  processId: string;
  versionId: string;
  initialLinks: ResourceLink[];
  editable: boolean;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [resource, setResource] = useState(emptyResource);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    const result = await addProcessResourceLink({
      processId,
      versionId,
      resource,
    });
    setSaving(false);
    if (!result.ok || !result.linkId) {
      toast.error(result.error);
      return;
    }
    setLinks((current) => [...current, { ...resource, id: result.linkId }]);
    setResource(emptyResource);
    setAdding(false);
    toast.success("Process link saved");
  };

  const remove = async (link: ResourceLink) => {
    if (!window.confirm(`Remove “${link.label}” from this draft?`)) return;
    setRemovingId(link.id);
    const result = await removeProcessResourceLink({
      processId,
      linkId: link.id,
    });
    setRemovingId(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setLinks((current) => current.filter((item) => item.id !== link.id));
    toast.success("Link removed from this draft");
  };

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow">Templates & links</p>
            <h2 className="mt-1 text-lg font-semibold text-[var(--navy)]">
              Everything people need to run this process
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Open the approved template, form, example, or closure document
              from here. Files stay in their original Google Drive, SharePoint,
              or other document system.
            </p>
          </div>
          {editable && !adding && (
            <Button
              type="button"
              className="min-h-11 shrink-0 rounded-xl"
              onClick={() => setAdding(true)}
            >
              <Plus aria-hidden="true" />
              Add link
            </Button>
          )}
        </div>

        {links.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed bg-[var(--surface-subtle)] px-5 py-8 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-[var(--brand-primary)] shadow-sm">
              <Link2 className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-3 font-semibold">
              No templates or document links yet
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
              Add the exact links staff should use, so nobody has to search old
              messages or guess which document is current.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {links.map((link) => (
              <article
                key={link.id}
                className="flex min-w-0 flex-col rounded-xl border bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--accent)] text-[var(--accent-foreground)]">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="text-[10px]">
                      {link.resourceType.toLowerCase()}
                    </Badge>
                    <h3 className="mt-2 font-semibold leading-5">
                      {link.label}
                    </h3>
                    {link.description && (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {link.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t pt-3">
                  <Button asChild variant="outline" className="min-h-11 flex-1">
                    <a href={link.url} target="_blank" rel="noreferrer">
                      Open / download
                      <ExternalLink aria-hidden="true" />
                    </a>
                  </Button>
                  {editable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0"
                      aria-label={`Remove ${link.label}`}
                      disabled={removingId === link.id}
                      onClick={() => remove(link)}
                    >
                      {removingId === link.id ? (
                        <LoaderCircle className="animate-spin" />
                      ) : (
                        <Trash2 aria-hidden="true" />
                      )}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}

        {!editable && (
          <p className="mt-5 rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground">
            These links belong to this approved process version. Create a new
            draft version to change them.
          </p>
        )}
      </section>

      {editable && adding && (
        <section className="rounded-xl border bg-white p-5 sm:p-6">
          <p className="eyebrow">New process link</p>
          <h2 className="mt-1 text-lg font-semibold">
            What should people open?
          </h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="resource-label">Name</Label>
              <Input
                id="resource-label"
                value={resource.label}
                onChange={(event) =>
                  setResource((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
                placeholder="Closure message template"
                className="mt-2 h-12 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="resource-type">Type</Label>
              <select
                id="resource-type"
                value={resource.resourceType}
                onChange={(event) =>
                  setResource((current) => ({
                    ...current,
                    resourceType: event.target
                      .value as typeof current.resourceType,
                  }))
                }
                className="mt-2 h-12 w-full rounded-xl border bg-white px-3 text-sm"
              >
                <option value="TEMPLATE">Template</option>
                <option value="DOCUMENT">Document</option>
                <option value="FORM">Form</option>
                <option value="EXAMPLE">Example</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="resource-url">Link</Label>
              <Input
                id="resource-url"
                type="url"
                value={resource.url}
                onChange={(event) =>
                  setResource((current) => ({
                    ...current,
                    url: event.target.value,
                  }))
                }
                placeholder="https://docs.google.com/..."
                className="mt-2 h-12 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="resource-description">
                When should people use it? (optional)
              </Label>
              <Textarea
                id="resource-description"
                value={resource.description}
                onChange={(event) =>
                  setResource((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Use this when closing a completed customer request."
                className="mt-2 min-h-24 rounded-xl"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-h-11"
              onClick={() => {
                setAdding(false);
                setResource(emptyResource);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="min-h-11"
              disabled={
                saving ||
                resource.label.trim().length < 2 ||
                !/^https?:\/\//i.test(resource.url)
              }
              onClick={save}
            >
              {saving ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Link2 aria-hidden="true" />
              )}
              {saving ? "Saving link…" : "Save link"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
