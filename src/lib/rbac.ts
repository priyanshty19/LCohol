/**
 * Role-based access control. Enforcement is APP-LAYER (Prisma connects with full
 * DB creds, so Supabase RLS does not gate it) — every mutation must re-check here.
 * Functions take the role string directly so they compose with Prisma's enum.
 */

export type Role = "USER" | "MODERATOR" | "ADMIN";

const RANK: Record<string, number> = { USER: 0, MODERATOR: 1, ADMIN: 2 };

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** The global admins, sourced from env (server-controlled — no self-escalation). */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isAdmin(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

/** Admins are implicitly moderators. */
export function isModerator(role: string | null | undefined): boolean {
  return role === "ADMIN" || role === "MODERATOR";
}

/** True when `role` meets or exceeds the required minimum role. */
export function hasRole(role: string | null | undefined, min: Role): boolean {
  if (!role) return false;
  return (RANK[role] ?? -1) >= RANK[min];
}

/**
 * A moderator may act on a target only if the target is a plain USER.
 * Mods cannot touch admins or other mods; admins can act on anyone but admins.
 */
export function canModerate(
  actorRole: string | null | undefined,
  targetRole: string | null | undefined
): boolean {
  if (actorRole === "ADMIN") return targetRole !== "ADMIN";
  if (actorRole === "MODERATOR") return targetRole === "USER";
  return false;
}
