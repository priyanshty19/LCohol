import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Email notifications via Resend. Inert (silent no-op) until RESEND_API_KEY is
// set, so push + the rest of the app work without an email provider configured.

const KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM ?? "Sip Stories <onboarding@resend.dev>";
const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://staging.mysipstories.com";

const resend = KEY ? new Resend(KEY) : null;

export function emailEnabled(): boolean {
  return resend !== null;
}

// Send a single notification email — gated on the recipient's emailNotifications
// preference. Best-effort: never throws into the caller.
export async function sendNotificationEmail(
  userId: string,
  data: { actorName: string; label: string; url: string },
): Promise<void> {
  if (!resend) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, profile: { select: { emailNotifications: true } } },
  });
  if (!user?.email || user.profile?.emailNotifications === false) return;

  try {
    await resend.emails.send({
      from: FROM,
      to: user.email,
      subject: `${data.actorName} ${data.label} · Sip Stories`,
      html: emailHtml({ ...data, link: `${BASE}${data.url}` }),
    });
  } catch (e) {
    console.error("[sendNotificationEmail]", e);
  }
}

function emailHtml({ actorName, label, link }: { actorName: string; label: string; link: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#1a1012;font-family:'Segoe UI',Arial,sans-serif;color:#f0e6d6;padding:24px">
  <div style="max-width:480px;margin:0 auto;background:#241619;border:1px solid rgba(201,162,75,.25);border-radius:16px;padding:28px">
    <p style="font-family:Georgia,serif;font-size:22px;font-weight:700;color:#c43049;margin:0 0 16px">Sip Stories</p>
    <p style="font-size:16px;line-height:24px;margin:0 0 20px">
      <strong style="color:#c9a24b">${escapeHtml(actorName)}</strong> ${escapeHtml(label)}.
    </p>
    <a href="${link}" style="display:inline-block;background:#c43049;color:#fbefe3;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:600">View on Sip Stories</a>
    <p style="font-size:12px;color:#9b8f7e;margin:24px 0 0">You're receiving this because email notifications are on. Turn them off any time in Settings.</p>
  </div></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
