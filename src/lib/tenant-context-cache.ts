import { createHmac, timingSafeEqual } from "node:crypto";

import { parseTenantShellContext, type TenantShellContext } from "@/lib/tenant";

export const tenantContextCookieName = "emilda_tenant_context";
const tenantContextTtlMs = 5 * 60 * 1000;

type SignedTenantContext = {
  context: TenantShellContext;
  userId: string;
  expiresAt: number;
};

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createTenantContextCookie(
  context: TenantShellContext,
  userId: string,
  secret: string,
  now = Date.now(),
  tokenExpiresAt?: number,
) {
  if (secret.length < 24 || !userId) return null;
  const supportExpiresAt = context.supportExpiresAt
    ? Date.parse(context.supportExpiresAt)
    : Number.POSITIVE_INFINITY;
  const sessionExpiresAt = tokenExpiresAt
    ? tokenExpiresAt * 1000
    : Number.POSITIVE_INFINITY;
  const expiresAt = Math.min(
    now + tenantContextTtlMs,
    supportExpiresAt,
    sessionExpiresAt,
  );
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  const signed: SignedTenantContext = { context, userId, expiresAt };
  const payload = Buffer.from(JSON.stringify(signed)).toString("base64url");
  return {
    value: `${payload}.${signature(payload, secret)}`,
    expiresAt,
  };
}

export function readTenantContextCookie(
  value: string | undefined,
  expectedUserId: string,
  expectedSlug: string,
  secret: string,
  now = Date.now(),
) {
  if (!value || value.length > 4096 || secret.length < 24) return null;
  const [payload, suppliedSignature, ...extra] = value.split(".");
  if (!payload || !suppliedSignature || extra.length) return null;
  const expectedSignature = signature(payload, secret);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  )
    return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SignedTenantContext>;
    const context = parseTenantShellContext(parsed.context);
    if (
      !context ||
      parsed.userId !== expectedUserId ||
      context.tenantSlug !== expectedSlug ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= now ||
      (context.supportExpiresAt && Date.parse(context.supportExpiresAt) <= now)
    )
      return null;
    return context;
  } catch {
    return null;
  }
}
