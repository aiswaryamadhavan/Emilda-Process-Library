"use client";

import { createContext, useContext, type ReactNode } from "react";

const TenantContext = createContext({
  name: "Acme Operations",
  slug: "acme",
  localPrefix: "",
  viewer: { name: "Aishwarya Menon", role: "Client Owner" },
  supportAccess: null as { reason: string; expiresAt: string } | null,
});

export function TenantProvider({
  name,
  slug,
  localPrefix,
  viewer,
  supportAccess = null,
  children,
}: {
  name: string;
  slug: string;
  localPrefix: string;
  viewer: { name: string; role: string };
  supportAccess?: { reason: string; expiresAt: string } | null;
  children: ReactNode;
}) {
  return (
    <TenantContext.Provider
      value={{ name, slug, localPrefix, viewer, supportAccess }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantTheme() {
  return useContext(TenantContext);
}
