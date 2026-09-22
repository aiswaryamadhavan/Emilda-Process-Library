"use client";

import { LogOut, UserRound } from "lucide-react";
import { useTenantTheme } from "@/components/tenant-provider";
import { Button } from "@/components/ui/button";

export function FocusAccountActions() {
  const { localPrefix } = useTenantTheme();
  const signOutPath = `${localPrefix}/auth/sign-out`;

  return (
    <div className="flex items-center gap-1 rounded-xl border bg-white p-1 shadow-sm">
      <form action={signOutPath} method="post">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <UserRound className="size-3.5" aria-hidden="true" />
          Change user
        </Button>
      </form>
      <form action={signOutPath} method="post">
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
        >
          <LogOut className="size-3.5" aria-hidden="true" />
          Log out
        </Button>
      </form>
    </div>
  );
}
