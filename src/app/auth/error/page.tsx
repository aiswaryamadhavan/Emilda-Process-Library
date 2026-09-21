import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function AuthErrorPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--surface-subtle)] p-4">
      <div className="max-w-md rounded-2xl border bg-white p-7 text-center">
        <AlertTriangle className="mx-auto size-8 text-amber-700" />
        <h1 className="mt-4 text-2xl font-semibold">Sign-in did not finish</h1>
        <p className="mt-2 text-muted-foreground">
          Try again. If this continues, ask your Tenant Admin to check the
          enabled sign-in provider.
        </p>
        <Button asChild className="mt-6 min-h-11 rounded-xl">
          <Link href="/auth/login">Return to sign in</Link>
        </Button>
      </div>
    </main>
  );
}
