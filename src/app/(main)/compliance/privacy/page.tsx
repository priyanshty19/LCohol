import type { Metadata } from "next";
import { AnalyticsPrivacySetting } from "@/components/settings/analytics-privacy-setting";
import { LegalPageClose } from "@/components/compliance/legal-page-close";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Sip Stories collects, uses, and protects personal and optional analytics data.",
  alternates: { canonical: "/Privacy-Policy" },
};

export default function PrivacyPage() {
  return (
    <div className="prose prose-invert mx-auto max-w-3xl">
      <LegalPageClose pageName="Privacy Policy" />
      <h1 className="font-display text-2xl font-bold text-primary">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: August 2026
      </p>

      <div className="mt-8 space-y-6 text-sm text-foreground/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            1. Introduction
          </h2>
          <p>
            SIPSTORIES (&ldquo;we&rdquo;, &ldquo;our&rdquo;, &ldquo;the
            Platform&rdquo;) is committed to protecting your privacy. This
            Privacy Policy explains how we collect, use, and safeguard your
            personal data in compliance with the Digital Personal Data
            Protection Act (DPDP), 2023 and other applicable laws.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            2. Data We Collect
          </h2>
          <p>We collect the following data:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Account data:</strong> Email address, date of birth
              (for age verification), and username
            </li>
            <li>
              <strong>Profile data:</strong> Display name, bio, city, state,
              drinking style preference (all optional)
            </li>
            <li>
              <strong>Content data:</strong> Posts, comments, votes, and
              reviews you create
            </li>
            <li>
              <strong>Usage data:</strong> Interactions with the Platform
              (views, searches, clicks) for improving recommendations
            </li>
            <li>
              <strong>Optional analytics data:</strong> If you allow analytics,
              Google Analytics receives sanitised screen paths, coarse device and
              browser information, and selected funnel events. We do not send
              emails, dates of birth, OTPs, usernames, invite codes, search text,
              posts, or messages to Google Analytics.
            </li>
          </ul>
          <p className="mt-2">
            <strong>We do NOT collect:</strong> Real names, phone numbers,
            government IDs, financial information, or precise location data.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            3. Purpose of Data Collection
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              Age verification (legal requirement for alcohol-related content)
            </li>
            <li>Account authentication and security</li>
            <li>Providing and improving Platform features</li>
            <li>
              Personalizing drink and content recommendations (with your
              consent)
            </li>
            <li>Content moderation and abuse prevention</li>
            <li>
              Compliance with legal obligations (IT Act, DPDP Act)
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            4. Data Storage and Security
          </h2>
          <p>
            Your data is stored on secure servers provided by Supabase
            (PostgreSQL). We use encryption in transit (TLS) and at rest.
            Access to personal data is restricted to authorized personnel
            only.
          </p>
          <p className="mt-2">
            Your date of birth is used solely for age verification and is not
            displayed publicly. Your email is private and never visible to
            other users.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            5. Data Sharing
          </h2>
          <p>
            We do NOT sell your personal data. We do NOT share your data with
            alcohol brands or advertisers. We may share data only:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              With law enforcement when required by valid legal process
            </li>
            <li>
              With service providers who assist in operating the Platform
              (under strict data processing agreements)
            </li>
            <li>
              With Google Analytics only when you choose to allow optional
              analytics, for measuring aggregate site and funnel performance
            </li>
            <li>In anonymized, aggregated form for research or analytics</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            6. Your Rights (DPDP Act, 2023)
          </h2>
          <p>Under the DPDP Act, you have the right to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Access:</strong> Request a copy of your personal data
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate
              data
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your data (subject
              to legal retention requirements)
            </li>
            <li>
              <strong>Withdraw consent:</strong> Withdraw consent for data
              processing at any time
            </li>
            <li>
              <strong>Grievance redressal:</strong> Lodge complaints with our
              Grievance Officer or the Data Protection Board of India
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            7. Data Retention
          </h2>
          <p>
            We retain your data for as long as your account is active. Upon
            account deletion, we will erase your personal data within 30 days,
            except where retention is required by law (e.g., for moderation
            audit trails).
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            8. Children and Minors
          </h2>
          <p>
            This Platform is strictly for users aged 21 and above. We do not
            knowingly collect data from anyone under 21. If we discover that
            a user is under the minimum age, their account will be immediately
            terminated and all associated data deleted.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            9. Cookies & Optional Analytics
          </h2>
          <p>
            We use essential cookies for authentication, age confirmation,
            preferences, and session management. With your separate permission,
            we also use Google Analytics cookies to understand screen usage and
            signup, login, onboarding, and PWA funnels. Advertising storage,
            advertising personalisation, and Google Signals remain disabled.
          </p>
          <p className="mt-2">
            You can choose &ldquo;Essential only&rdquo; or &ldquo;Allow
            analytics&rdquo; in the one-time consent notice and change that decision at any
            time using the Privacy Choices below. Withdrawing
            analytics consent stops future Analytics events and removes
            first-party Google Analytics cookies available to this site. Google
            may process consented analytics data as our service provider under
            its applicable data-processing terms. We do not use third-party
            advertising cookies.
          </p>
          <div className="not-prose mt-4 rounded-2xl border border-border/70 bg-card/60 p-4 sm:p-5">
            <h3 className="mb-3 font-display text-base font-semibold text-foreground">
              Privacy Choices
            </h3>
            <AnalyticsPrivacySetting />
          </div>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            10. Contact & Grievance Officer
          </h2>
          <p>
            For privacy-related concerns, contact our Grievance Officer:
          </p>
          <p className="mt-2">
            Email:{" "}
            <span className="text-primary">grievance@sipstories.in</span>
          </p>
          <p>
            Response time: 72 hours for user complaints, 36 hours for
            government/court orders.
          </p>
        </section>
      </div>
    </div>
  );
}
