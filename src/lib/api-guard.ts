import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasRole, type Role } from "@/lib/rbac";

type DbUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

type Guard =
  | { ok: true; user: DbUser }
  | { ok: false; response: NextResponse };

/**
 * Gate an API route by minimum role. Re-checks the live DB record every call
 * (no trusting client claims) and blocks banned accounts from mutating.
 */
export async function requireRole(min: Role): Promise<Guard> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (user.isBanned) {
    return { ok: false, response: NextResponse.json({ error: "Account suspended." }, { status: 403 }) };
  }
  if (!hasRole(user.role, min)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, user };
}
