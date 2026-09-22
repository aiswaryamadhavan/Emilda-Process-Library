import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PwaRegister } from "@/components/pwa-register";
import { TenantProvider } from "@/components/tenant-provider";
import {
  DEMO_USER_COOKIE,
  findAllowedUser,
} from "@/lib/allowed-users";
import { EMILDA_PROCESS_LIBRARY } from "@/lib/branding";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decodeTenantShellContext } from "@/lib/tenant";

import "@xyflow/react/dist/style.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function displayRole(role: string, email?: string | null) {
  const allowed = findAllowedUser(email);
  if (allowed) return allowed.role;
  return (
    {
      "Tenant Admin": "Admin",
      "Process Owner": "Owner",
      Viewer: "Employee",
    }[role] ?? role
  );
}

export const metadata: Metadata = {
  title: {
    default: "Emilda Governance OS",
    template: "%s · Emilda",
  },
  description: "Process governance for owner-led businesses.",
  applicationName: "Emilda Governance OS",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const requestHeaders = await headers();
  const shellContext = decodeTenantShellContext(
    requestHeaders.get("x-tenant-shell-context"),
  );
  const databaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const supabase =
    databaseConfigured && !shellContext
      ? await createSupabaseServerClient()
      : null;
  const explicitTenantSlug = requestHeaders.get("x-tenant-slug");
  const tenantSlug = explicitTenantSlug ?? (supabase ? "" : "acme");
  const host = requestHeaders.get("host") ?? "";
  const hostname = host.split(":")[0];
  const rootDomain = process.env.ROOT_DOMAIN ?? "emildaos.com";
  const isTenantSubdomain = Boolean(
    tenantSlug && hostname === `${tenantSlug}.${rootDomain}`,
  );
  const localPrefix =
    requestHeaders.get("x-tenant-path-prefix") ??
    (!tenantSlug || isTenantSubdomain ? "" : `/t/${tenantSlug}`);
  let tenant = tenantSlug
    ? {
        name: EMILDA_PROCESS_LIBRARY,
        primary: tenantSlug === "northstar" ? "#5b4fa3" : "#1f6d62",
        accent: tenantSlug === "northstar" ? "#9b8ce0" : "#74d1bf",
        navy: tenantSlug === "northstar" ? "#302b52" : "#17324d",
      }
    : {
        name: EMILDA_PROCESS_LIBRARY,
        primary: "#145e66",
        accent: "#8bd3c7",
        navy: "#17324d",
      };
  const demoUser = findAllowedUser(
    (await cookies()).get(DEMO_USER_COOKIE)?.value,
  );
  let viewer = supabase
    ? { name: "Emilda user", role: "Team member" }
    : demoUser
      ? { name: demoUser.name, role: demoUser.role }
      : { name: "Paul", role: "Owner" };
  let supportAccess: { reason: string; expiresAt: string } | null = null;

  if (shellContext) {
    tenant = {
      name: shellContext.tenantName,
      primary: shellContext.primaryColor,
      accent: shellContext.accentColor,
      navy: tenant.navy,
    };
    viewer = {
      name: shellContext.viewerName,
      role: displayRole(shellContext.viewerRole),
    };
    if (shellContext.supportExpiresAt) {
      supportAccess = {
        reason: shellContext.supportReason ?? "Temporary client setup",
        expiresAt: shellContext.supportExpiresAt,
      };
    }
  }

  if (supabase && !shellContext) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name,email")
        .eq("id", user.id)
        .maybeSingle();
      const name =
        profile?.display_name ||
        String(
          user.user_metadata?.full_name || user.user_metadata?.name || "",
        ) ||
        user.email?.split("@")[0] ||
        "Emilda user";
      const role = tenantSlug
        ? "Employee"
        : displayRole("Employee", user.email);

      viewer = {
        name: findAllowedUser(user.email)?.name ?? name,
        role: displayRole(role, user.email),
      };
    }
  }
  const tenantStyle = {
    "--brand-primary": tenant.primary,
    "--brand-accent": tenant.accent,
    "--primary": tenant.primary,
    "--ring": tenant.primary,
    "--navy": tenant.navy,
  } as CSSProperties;
  return (
    <html
      lang="en"
      className={`${geistSans.className} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={tenantStyle}
        data-tenant-name={tenant.name}
        data-tenant-slug={tenantSlug}
      >
        <TooltipProvider>
          <TenantProvider
            name={tenant.name}
            slug={tenantSlug}
            localPrefix={localPrefix}
            viewer={viewer}
            supportAccess={supportAccess}
          >
            <PwaRegister />
            {children}
            <Toaster richColors position="top-center" />
          </TenantProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
