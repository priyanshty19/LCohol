import { prisma } from "@/lib/prisma";

// DPDP data-minimization windows. Personal data is not kept longer than needed for
// its stated purpose. Tune these to whatever the published Privacy Policy commits to.
export const DELETION_EMAIL_RETENTION_DAYS = 180; // consented exit-feedback emails
export const INTERACTION_RETENTION_DAYS = 365; // raw behavioral logs

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// Scheduled purge (run by the daily cron). Two jobs:
//  1) Null the email on aged AccountDeletionFeedback rows — the anonymized feedback
//     text is kept (not personal data), but the identifier is erased after the window.
//  2) Delete raw UserInteraction rows past their TTL (data minimization).
export async function runRetentionPurge(): Promise<{
  emailsPurged: number;
  interactionsPurged: number;
}> {
  const [emails, interactions] = await Promise.all([
    prisma.accountDeletionFeedback.updateMany({
      where: { email: { not: null }, createdAt: { lt: daysAgo(DELETION_EMAIL_RETENTION_DAYS) } },
      data: { email: null, emailConsent: false },
    }),
    prisma.userInteraction.deleteMany({
      where: { createdAt: { lt: daysAgo(INTERACTION_RETENTION_DAYS) } },
    }),
  ]);
  return { emailsPurged: emails.count, interactionsPurged: interactions.count };
}

// On-demand erasure (DPDP right to erasure / grievance request). A former user can
// no longer log in, so an admin erases the retained email for them. Keeps the
// anonymized feedback row; only the identifier is removed.
export async function eraseDeletionFeedbackByEmail(email: string): Promise<number> {
  const res = await prisma.accountDeletionFeedback.updateMany({
    where: { email },
    data: { email: null, emailConsent: false },
  });
  return res.count;
}
