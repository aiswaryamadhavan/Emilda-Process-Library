"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardCheck, FolderKanban, LogOut, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";
import { EMILDA_PROCESS_LIBRARY } from "@/lib/branding";
import { stripTenantPathPrefix } from "@/lib/tenant";

const nav = [
  { label: "Process", href: "/processes", icon: FolderKanban },
  { label: "Governance", href: "/governance", icon: ClipboardCheck },
];

const platformNav = nav;

type Viewer = { name: string; role: string };

export function AppShell({
  children,
  title,
  description,
  action,
  viewer,
  mode = "tenant",
  platformTenantPrefix = "",
}: {
  children: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  viewer?: Viewer;
  mode?: "tenant" | "platform";
  /** e.g. `/emilda-co` on gov.emilda.co when DEFAULT_TENANT_SLUG is set */
  platformTenantPrefix?: string;
}) {
  const router = useRouter();
  const [pendingNavigation, setPendingNavigation] = useState<{
    href: string;
    fromPathname: string;
  } | null>(null);
  const tenant = useTenantTheme();
  const { name: tenantName, localPrefix } = tenant;
  const pathname = stripTenantPathPrefix(usePathname(), localPrefix);
  const displayedViewer = viewer ?? tenant.viewer;
  const navigation = mode === "platform" ? platformNav : nav;
  const tenantHref = (href: string) => {
    if (mode === "platform") {
      return platformTenantPrefix
        ? `${platformTenantPrefix}${href}`
        : href;
    }
    return `${localPrefix}${href === "/" ? "/" : href}`;
  };
  const active = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  useEffect(() => {
    const destinations = mode === "platform" ? platformNav : nav;
    destinations.forEach(({ href }) =>
      router.prefetch(tenantHref(href)),
    );
  }, [localPrefix, mode, platformTenantPrefix, router]);

  const startNavigation = (href: string) => {
    if (!active(href)) setPendingNavigation({ href, fromPathname: pathname });
  };

  const navigationIsPending =
    pendingNavigation !== null &&
    pendingNavigation.fromPathname === pathname &&
    !active(pendingNavigation.href);

  return (
    <div className="min-h-dvh bg-[var(--surface-subtle)]">
      {navigationIsPending && (
        <div
          role="status"
          aria-label="Opening page"
          className="fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden bg-[color-mix(in_srgb,var(--brand-primary)_16%,white)]"
        >
          <span className="block h-full w-1/2 animate-pulse rounded-r-full bg-[var(--brand-primary)]" />
        </div>
      )}
      <a
        href="#main-content"
        className="sr-only z-50 rounded-lg bg-white p-3 shadow-lg focus:fixed focus:left-3 focus:top-3 focus:not-sr-only"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] md:flex">
        <Link
          href={tenantHref("/processes")}
          className="flex min-h-20 items-center gap-3 border-b border-[var(--sidebar-border)] px-5"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-[var(--brand-primary)] text-base font-bold text-white shadow-sm">
            E
          </span>
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold tracking-[-0.02em]">
              Emilda
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {EMILDA_PROCESS_LIBRARY}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary" className="space-y-1 px-3 py-5">
          {navigation.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={tenantHref(href)}
              prefetch
              onClick={() => startNavigation(href)}
              aria-current={active(href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                active(href)
                  ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)]"
                  : "text-[var(--ink-soft)] hover:bg-[var(--sidebar-accent)] hover:text-foreground"
              }`}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="mx-3 mt-auto border-t border-[var(--sidebar-border)] py-4">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-foreground)]">
              <UserRound className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">
                {displayedViewer.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {displayedViewer.role}
              </span>
            </span>
          </div>
          {mode === "tenant" && (
            <form action={tenantHref("/auth/sign-out")} method="post">
              <Button
                type="submit"
                variant="ghost"
                className="mt-1 min-h-10 w-full justify-start gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Log out
              </Button>
            </form>
          )}
        </div>
      </aside>

      <main
        id="main-content"
        className="mx-auto max-w-[1240px] px-4 pb-28 pt-5 sm:px-6 md:ml-60 md:px-8 md:pb-12 md:pt-7 lg:px-10"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border/80 pb-6">
          <div className="min-w-0">
            <p className="mb-1 text-xs font-medium text-muted-foreground md:hidden">
              {EMILDA_PROCESS_LIBRARY}
            </p>
            <h1 className="text-[1.75rem] font-semibold leading-tight tracking-[-0.04em] text-foreground sm:text-[2rem]">
              {title}
            </h1>
            {description && (
              <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">{action}</div>
        </header>
        <div className="mt-6 md:mt-8">{children}</div>
      </main>

      <nav
        aria-label="Mobile primary"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 border-t border-border bg-white/95 px-1 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-6px_24px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
      >
        {navigation.map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={tenantHref(href)}
            prefetch
            onClick={() => startNavigation(href)}
            aria-current={active(href) ? "page" : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium ${
              active(href)
                ? "text-[var(--brand-primary)]"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
