import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json(
      { error: "Cron authorization failed." },
      { status: 401 },
    );
  }
  const admin = createSupabaseAdminClient();
  if (!admin)
    return Response.json(
      { error: "Supabase is not configured." },
      { status: 503 },
    );

  const { data: activated, error: activationError } = await admin.rpc(
    "activate_due_releases",
  );
  if (activationError)
    return Response.json(
      { error: "Scheduled releases could not be processed." },
      { status: 500 },
    );

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const { data: overdue } = await admin
    .from("processes")
    .select("id,tenant_id,name,guardian_membership_id,next_audit_at")
    .lt("next_audit_at", now.toISOString())
    .not("guardian_membership_id", "is", null)
    .is("retired_at", null)
    .is("deleted_at", null);
  let reminders = 0;
  for (const process of overdue ?? []) {
    const digestKey = `audit-overdue:${process.id}:${day}`;
    const { data: existing } = await admin
      .from("notifications")
      .select("id")
      .eq("tenant_id", process.tenant_id)
      .eq("digest_key", digestKey)
      .maybeSingle();
    if (existing) continue;
    const { error } = await admin.from("notifications").insert({
      tenant_id: process.tenant_id,
      membership_id: process.guardian_membership_id,
      type: "AUDIT_OVERDUE",
      title: `${process.name} audit is overdue`,
      body: "Continue the saved audit or schedule the next governance check.",
      href: "/governance",
      priority: "NEEDS_ATTENTION",
      digest_key: digestKey,
    });
    if (!error) reminders += 1;
  }

  return Response.json(
    {
      activated: activated ?? 0,
      overdueRemindersCreated: reminders,
      completedAt: now.toISOString(),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
