import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
export function FocusShell({
  eyebrow,
  title,
  subtitle,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-4 sm:px-7 sm:py-6">
      <div className={`mx-auto ${wide ? "max-w-[1400px]" : "max-w-2xl"}`}>
        <header className="flex items-center justify-between">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-11 rounded-xl border bg-white"
          >
            <Link href="/" aria-label="Leave focus view">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="size-3.5 text-[var(--brand-primary)]" />
            Focus view
          </div>
        </header>
        <div className="mt-6 border-b border-border/80 pb-5">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 max-w-3xl text-[15px] leading-6 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
