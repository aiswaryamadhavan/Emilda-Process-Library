"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useTenantTheme } from "@/components/tenant-provider";

type TenantLinkProps = ComponentProps<typeof Link>;

function resolveTenantHref(href: string, localPrefix: string) {
  if (
    !localPrefix ||
    !href.startsWith("/") ||
    href.startsWith(`${localPrefix}/`) ||
    href === localPrefix
  )
    return href;
  return href === "/" ? `${localPrefix}/` : `${localPrefix}${href}`;
}

export function TenantLink({ href, ...props }: TenantLinkProps) {
  const { localPrefix } = useTenantTheme();
  const resolvedHref =
    typeof href === "string" ? resolveTenantHref(href, localPrefix) : href;

  return <Link href={resolvedHref} {...props} />;
}

export function TenantForm({ action, ...props }: ComponentProps<"form">) {
  const { localPrefix } = useTenantTheme();
  const resolvedAction =
    typeof action === "string"
      ? resolveTenantHref(action, localPrefix)
      : action;

  return <form action={resolvedAction} {...props} />;
}
