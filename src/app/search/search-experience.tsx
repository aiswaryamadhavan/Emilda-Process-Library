"use client";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTenantTheme } from "@/components/tenant-provider";
import type { SearchHit } from "@/lib/domain/types";

export function SearchExperience({
  initialQuery = "invoice",
  initialHits,
}: {
  initialQuery?: string;
  initialHits: SearchHit[];
}) {
  const { localPrefix } = useTenantTheme();
  return (
    <div>
      <form
        action={`${localPrefix}/search`}
        className="flex items-stretch gap-2"
        role="search"
      >
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            name="q"
            defaultValue={initialQuery}
            className="h-14 rounded-2xl bg-white pl-12 text-base"
            aria-label="Search Emilda"
            placeholder="Search processes, steps, issues, people…"
          />
        </div>
        <Button type="submit" className="min-h-14 rounded-2xl px-5">
          Search
        </Button>
      </form>
      <p className="mt-5 text-sm text-muted-foreground" aria-live="polite">
        {initialHits.length} result{initialHits.length === 1 ? "" : "s"}
      </p>
      <div className="mt-3 divide-y rounded-2xl border bg-white">
        {initialHits.map((hit) => (
          <Link
            key={hit.id}
            href={`${localPrefix}${hit.href}`}
            className="flex min-h-24 items-center gap-4 p-4 hover:bg-muted/50"
          >
            <div className="min-w-0 flex-1">
              <Badge variant="outline" className="rounded-full">
                {hit.type}
              </Badge>
              <h2 className="mt-2 font-semibold text-[var(--navy)]">
                {hit.title}
              </h2>
              <p className="mt-1 truncate text-sm text-muted-foreground">
                {hit.excerpt}
              </p>
            </div>
            <ArrowRight className="size-5 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
      {initialQuery && !initialHits.length && (
        <div className="mt-4 rounded-2xl border border-dashed bg-white p-8 text-center">
          <p className="font-semibold">Nothing found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Try a process name, person, step, or issue title.
          </p>
        </div>
      )}
    </div>
  );
}
