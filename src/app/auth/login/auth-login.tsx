"use client";

import { Chrome, Mail } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthLogin({
  defaultDestination = "/",
}: {
  defaultDestination?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("owner@acme.emilda.test");
  const [password, setPassword] = useState("EmildaDemo!2026");
  const destination = searchParams.get("next") ?? defaultDestination;
  const login = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push(destination);
      return;
    }
    setLoading("google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (error) {
      setLoading(null);
      toast.error(
        "Sign-in could not start. Check the tenant provider configuration.",
      );
    }
  };
  const emailLogin = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      router.push(destination);
      return;
    }
    setLoading("email");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(null);
    if (error) return toast.error("Email or password was not recognized.");
    router.replace(destination);
    router.refresh();
  };
  return (
    <div className="mt-8 grid gap-3">
      <Button
        variant="outline"
        size="lg"
        className="min-h-12 rounded-xl"
        disabled={Boolean(loading)}
        onClick={login}
      >
        <Chrome />
        Continue with Google
      </Button>
      {process.env.NODE_ENV !== "production" && (
        <div className="mt-3 rounded-2xl border bg-muted/40 p-4">
          <p className="text-sm font-semibold">Local development sign-in</p>
          <Label htmlFor="dev-email" className="mt-3">
            Email
          </Label>
          <Input
            id="dev-email"
            type="email"
            className="mt-1 h-11 bg-white"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Label htmlFor="dev-password" className="mt-3">
            Password
          </Label>
          <Input
            id="dev-password"
            type="password"
            className="mt-1 h-11 bg-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            className="mt-3 min-h-11 w-full rounded-xl"
            disabled={Boolean(loading)}
            onClick={emailLogin}
          >
            <Mail />
            {loading === "email" ? "Signing in…" : "Sign in with email"}
          </Button>
        </div>
      )}
      {!process.env.NEXT_PUBLIC_SUPABASE_URL && (
        <p className="mt-1 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Demo mode: any sign-in option opens the seeded local experience.
        </p>
      )}
    </div>
  );
}
