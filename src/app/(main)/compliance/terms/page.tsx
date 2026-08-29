import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms governing use of Sip Stories, an adults-only community platform.",
  alternates: { canonical: "/Terms-and-Condition" },
};

export default function TermsPage() {
  return (
    <div className="prose prose-invert mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold text-primary">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">
        Last updated: June 2026
      </p>

      <div className="mt-8 space-y-6 text-sm text-foreground/80">
        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using SIPSTORIES (&ldquo;the Platform&rdquo;), you
            agree to be bound by these Terms of Service. If you do not agree,
            do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            2. Eligibility
          </h2>
          <p>
            You must be at least 21 years of age to use this Platform. By
            creating an account, you confirm that you are of legal drinking age
            in your jurisdiction. SIPSTORIES reserves the right to verify your
            age and terminate accounts that do not meet this requirement.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            3. Nature of the Platform
          </h2>
          <p>
            SIPSTORIES is an informational and community platform. It is NOT:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>An alcohol marketplace or delivery service</li>
            <li>An alcohol advertising platform</li>
            <li>A platform that promotes or encourages alcohol consumption</li>
          </ul>
          <p className="mt-2">
            The Platform provides a space for adults to share experiences,
            discover information about beverages, and engage in community
            discussions. All content is user-generated and represents
            individual opinions, not endorsements by SIPSTORIES.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            4. User-Generated Content
          </h2>
          <p>
            As an intermediary platform under Section 79 of the Information
            Technology Act, 2000, SIPSTORIES is not liable for content posted
            by users. However, users must not post content that:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Promotes excessive or irresponsible alcohol consumption</li>
            <li>Targets or involves minors</li>
            <li>Glorifies drunk driving or dangerous behavior</li>
            <li>Facilitates the purchase, sale, or delivery of alcohol</li>
            <li>Contains hate speech, harassment, or threats</li>
            <li>Violates any applicable laws</li>
            <li>Is spam, misleading, or fraudulent</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            5. Content Moderation
          </h2>
          <p>
            SIPSTORIES reserves the right to remove content that violates these
            Terms. We will respond to government and court-ordered takedown
            requests within 36 hours, and to user complaints within 72 hours,
            in compliance with the IT Rules, 2021.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            6. Intellectual Property
          </h2>
          <p>
            Users retain ownership of their content. By posting on SIPSTORIES,
            you grant the Platform a non-exclusive, worldwide license to
            display, distribute, and promote your content within the Platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            7. Disclaimer
          </h2>
          <p>
            SIPSTORIES does not provide medical, legal, or professional advice.
            Information about beverages is for educational and entertainment
            purposes only. Drink responsibly and in accordance with the laws of
            your jurisdiction.
          </p>
          <p className="mt-2">
            <strong>
              Alcohol consumption is prohibited in certain Indian states
              including Gujarat, Bihar, Mizoram, Nagaland, and Lakshadweep.
            </strong>{" "}
            Users in these jurisdictions should be aware that consumption,
            possession, or promotion of alcohol may be illegal.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            8. Account Termination
          </h2>
          <p>
            SIPSTORIES may suspend or terminate accounts that violate these
            Terms, engage in abusive behavior, or are found to belong to
            users under the minimum age requirement.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            9. Governing Law
          </h2>
          <p>
            These Terms are governed by the laws of India. Any disputes shall
            be subject to the exclusive jurisdiction of courts in Bengaluru,
            Karnataka.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">
            10. Contact
          </h2>
          <p>
            For questions about these Terms, contact us at{" "}
            <span className="text-primary">legal@sipstories.in</span>
          </p>
        </section>
      </div>
    </div>
  );
}
