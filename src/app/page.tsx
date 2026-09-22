import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const prefix = (await headers()).get("x-tenant-path-prefix") ?? "";
  redirect(`${prefix}/processes`);
}
