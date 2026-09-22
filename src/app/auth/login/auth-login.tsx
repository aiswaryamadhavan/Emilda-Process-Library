"use client";

import { Chrome, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  allowedUsers,
  DEMO_USER_COOKIE,
  isAllowedLoginEmail,
} from "@/lib/allowed-users";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function AuthLogin({
  defaultDestination = "/processes",
  demoMode = true,
}: {
  defaultDestination?: string;
  demoMode?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const destination = defaultDestination;

  const loginWithGoogle = async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
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

  const loginWithEmail = async () => {
    const normalized = email.trim().toLowerCase();
    if (!isAllowedLoginEmail(normalized)) {
      toast.error("That email is not recognized.");
      return;
    }

    if (demoMode) {
      setLoading("email");
      document.cookie = `${DEMO_USER_COOKIE}=${encodeURIComponent(normalized)}; Path=/; SameSite=Lax`;
      window.location.assign(destination);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;
    setLoading("email");
    const { error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });
    setLoading(null);
    if (error) return toast.error("Email or password was not recognized.");
    router.replace(destination);
    router.refresh();
  };

  return (
    <div className="mt-8 grid gap-3">
      {!demoMode && (
        <Button
          variant="outline"
          size="lg"
          className="min-h-12 rounded-xl"
          disabled={Boolean(loading)}
          onClick={loginWithGoogle}
        >
          <Chrome />
          Continue with Google
        </Button>
      )}

      <div className={demoMode ? "" : "mt-3 rounded-2xl border bg-muted/40 p-4"}>
        {!demoMode && (
          <p className="text-sm font-semibold">Local development sign-in</p>
        )}
        <Label htmlFor="sign-in-email" className={demoMode ? "" : "mt-3"}>
          Email
        </Label>
        <Input
          id="sign-in-email"
          type="email"
          autoComplete="email"
          className="mt-1 h-11 bg-white"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={`${allowedUsers[0].email}`}
        />
        {!demoMode && process.env.NODE_ENV !== "production" && (
          <>
            <Label htmlFor="sign-in-password" className="mt-3">
              Password
            </Label>
            <Input
              id="sign-in-password"
              type="password"
              className="mt-1 h-11 bg-white"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </>
        )}
        <Button
          className="mt-3 min-h-12 w-full rounded-xl"
          disabled={Boolean(loading) || !email.trim()}
          onClick={loginWithEmail}
        >
          <Mail />
          {loading === "email" ? "Signing in…" : "Sign in with email"}
        </Button>
      </div>
    </div>
  );
}
