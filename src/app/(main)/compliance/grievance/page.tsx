import type { Metadata } from "next";
import { GRIEVANCE_OFFICER } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Grievance Officer",
};

export default function GrievancePage() {
  return (
    <div className="prose prose-invert mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-foreground">
        Grievance Redressal
      </h1>
      <p className="text-sm text-muted-foreground">
        In compliance with the Information Technology (Intermediary Guidelines
        and Digital Media Ethics Code) Rules, 2021
      </p>

      <div className="mt-8 space-y-6 text-sm text-foreground/80">
        <section className="rounded-lg border border-border/30 bg-card/50 p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Grievance Officer
          </h2>
          <div className="mt-4 space-y-2">
            <p>
              <strong>Name:</strong> {GRIEVANCE_OFFICER.name}
            </p>
            <p>
              <strong>Email:</strong>{" "}
              <span className="text-primary">
                {GRIEVANCE_OFFICER.email}
              </span>
            </p>
            <p>
              <strong>Response Time:</strong>{" "}
              {GRIEVANCE_OFFICER.responseTime}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            How to File a Complaint
          </h2>
          <p>If you have a grievance related to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Content that violates our Terms of Service</li>
            <li>Privacy concerns or data handling</li>
            <li>Harassment or abuse on the Platform</li>
            <li>Any other violation of applicable laws</li>
          </ul>
          <p className="mt-2">Please email the Grievance Officer with:</p>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Your username (or email, if related to account issues)</li>
            <li>
              A clear description of the issue with links to relevant content
            </li>
            <li>Any supporting evidence or screenshots</li>
            <li>The specific action you are requesting</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Response Timeline
          </h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <strong>Government/Court orders:</strong> Action within 36 hours
            </li>
            <li>
              <strong>User complaints:</strong> Acknowledgment within 72
              hours, resolution within 15 days
            </li>
            <li>
              <strong>Content takedown requests:</strong> Reviewed within 72
              hours
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Reporting Content
          </h2>
          <p>
            You can also report individual posts or comments directly using
            the report button available on each piece of content. Reports are
            reviewed by our moderation team.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground">
            Escalation
          </h2>
          <p>
            If you are unsatisfied with our response, you may escalate your
            complaint to the relevant authorities including the Data
            Protection Board of India (for privacy matters) or the appropriate
            court of law.
          </p>
        </section>
      </div>
    </div>
  );
}
