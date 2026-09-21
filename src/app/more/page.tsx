import Link from "next/link";
import {
  Activity,
  Bot,
  Building2,
  ChevronRight,
  Palette,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { TenantLink } from "@/components/tenant-link";
const links = [
  {
    label: "Ask Emilda",
    detail: "Permission-aware operational answers",
    href: "/ask-emilda",
    icon: Bot,
  },
  {
    label: "Client profile",
    detail: "Business context, leadership, systems, and priorities",
    href: "/more/client-profile",
    icon: Building2,
  },
  {
    label: "Users & roles",
    detail: "Tenant members and responsibilities",
    href: "/more/users",
    icon: Users,
  },
  {
    label: "Branding",
    detail: "Logo, colors, and portal name",
    href: "/more/branding",
    icon: Palette,
  },
  {
    label: "Process access",
    detail: "Department, role, and user rules",
    href: "/more/access",
    icon: ShieldCheck,
  },
  {
    label: "Activity log",
    detail: "Immutable governance history",
    href: "/more/activity",
    icon: Activity,
  },
  {
    label: "Tenant setup",
    detail: "Create a separate client portal",
    href: "/admin/tenants/new",
    icon: Building2,
  },
];
export default function MorePage() {
  return (
    <AppShell
      title="More"
      description="Administration stays out of the way until you need it."
    >
      <div className="divide-y overflow-hidden rounded-2xl border bg-white">
        {links.map(({ icon: Icon, ...item }) => {
          const ItemLink = item.href.startsWith("/admin/") ? Link : TenantLink;
          return (
            <ItemLink
              key={item.label}
              href={item.href}
              className="flex min-h-20 items-center gap-4 p-4 hover:bg-muted/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted text-[var(--navy)]">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{item.label}</span>
                <span className="mt-1 block truncate text-sm text-muted-foreground">
                  {item.detail}
                </span>
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </ItemLink>
          );
        })}
      </div>
    </AppShell>
  );
}
