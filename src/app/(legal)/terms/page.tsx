import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms and conditions governing the use of AiGrow.",
};

export default function TermsOfUsePage() {
  return (
    <article className="space-y-10">
      {/* Title block */}
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Legal
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Terms of Use
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: February 6, 2026 &middot; Last updated: February 6,
          2026
        </p>
      </header>

      {/* Introduction */}
      <Section>
        <p>
          These Terms of Use (&ldquo;Terms&rdquo;) govern your access to and use
          of the AiGrow platform (&ldquo;Service&rdquo;), operated by Growth
          OS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By
          creating an account or using the Service, you agree to be bound by
          these Terms. If you do not agree, you must not use the Service.
        </p>
      </Section>

      {/* 1. Eligibility */}
      <Section number="1" title="Eligibility">
        <p>
          You must be at least 16 years old to use AiGrow. By using the
          Service, you represent and warrant that you meet this age requirement
          and have the legal capacity to enter into these Terms. If you are using
          the Service on behalf of an organization, you represent that you have
          the authority to bind that organization to these Terms.
        </p>
      </Section>

      {/* 2. Account Registration */}
      <Section number="2" title="Account Registration">
        <p>
          To use AiGrow, you must create an account using a valid email
          address or through a supported third-party authentication provider. You
          are responsible for:
        </p>
        <ul>
          <li>
            Maintaining the confidentiality of your account credentials
          </li>
          <li>All activity that occurs under your account</li>
          <li>
            Notifying us immediately of any unauthorized access to your account
          </li>
        </ul>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these Terms or that we reasonably believe are being used fraudulently.
        </p>
      </Section>

      {/* 3. Permitted Use */}
      <Section number="3" title="Permitted Use">
        <p>
          AiGrow is provided for the purpose of managing, scheduling,
          publishing, and analyzing social media content. You agree to use the
          Service only for its intended purpose and in compliance with all
          applicable laws and regulations.
        </p>
        <p>You may not:</p>
        <ul>
          <li>
            Use the Service to distribute spam, malware, or any harmful or
            deceptive content
          </li>
          <li>
            Attempt to gain unauthorized access to any part of the Service, other
            users&rsquo; accounts, or connected systems
          </li>
          <li>
            Use automated scripts, bots, or scrapers to access the Service
            beyond the provided interface and APIs
          </li>
          <li>
            Reverse engineer, decompile, or disassemble any part of the Service
          </li>
          <li>
            Resell, sublicense, or redistribute access to the Service without our
            written consent
          </li>
          <li>
            Use the Service in any way that violates the terms of service of
            connected social media platforms
          </li>
          <li>
            Publish content that infringes on intellectual property rights,
            promotes violence, or is otherwise unlawful
          </li>
        </ul>
      </Section>

      {/* 4. Content Ownership */}
      <Section number="4" title="Content Ownership">
        <H3>4.1 Your Content</H3>
        <p>
          You retain full ownership of all content you create, upload, or publish
          through AiGrow, including post text, images, and media files. By
          using the Service, you grant us a limited, non-exclusive license to
          store, process, and transmit your content solely for the purpose of
          operating the Service on your behalf.
        </p>

        <H3>4.2 AI-Generated Content</H3>
        <p>
          AiGrow provides AI-powered features including content suggestions,
          improvement recommendations, insights, and experiment ideas. Any
          content generated or suggested by AI features is provided as a
          recommendation only. You are solely responsible for reviewing, editing,
          and approving all content before publication. We do not claim ownership
          of AI-generated suggestions that you choose to use.
        </p>

        <H3>4.3 Our Content</H3>
        <p>
          The AiGrow platform, including its design, code, features,
          documentation, and branding, is our proprietary property. These Terms
          do not grant you any rights to our intellectual property except the
          limited right to use the Service as described herein.
        </p>
      </Section>

      {/* 5. Connected Platforms */}
      <Section number="5" title="Connected Platforms">
        <p>
          AiGrow allows you to connect third-party social media accounts to
          publish content and retrieve analytics. By connecting a platform
          account, you:
        </p>
        <ul>
          <li>
            Authorize AiGrow to access that platform on your behalf using
            OAuth 2.0
          </li>
          <li>
            Acknowledge that your use of connected platforms is also governed by
            their respective terms of service
          </li>
          <li>
            Understand that platform API changes, rate limits, or policy updates
            may affect Service functionality
          </li>
          <li>
            Accept that we store encrypted authentication tokens to maintain your
            connections
          </li>
        </ul>
        <p>
          You may disconnect a platform at any time from the Connections page.
          Upon disconnection, we will revoke the stored tokens and cease
          accessing that platform on your behalf.
        </p>
      </Section>

      {/* 6. Scheduling and Publishing */}
      <Section number="6" title="Scheduling and Publishing">
        <p>
          AiGrow provides content scheduling and automated publishing
          features. While we make commercially reasonable efforts to publish your
          content at the scheduled times, we cannot guarantee exact delivery
          times due to factors including platform API availability, rate limits,
          and system processing.
        </p>
        <p>
          You are solely responsible for the content you publish through the
          Service. AiGrow does not pre-screen, review, or moderate content
          before publication. You acknowledge that published content is subject
          to the content policies of the destination platform and applicable
          laws.
        </p>
      </Section>

      {/* 7. AI Features and Limitations */}
      <Section number="7" title="AI Features and Limitations">
        <p>
          AiGrow incorporates AI-powered features to help you improve your
          content strategy. These features include content classification,
          performance insights, content improvement suggestions, content
          ideation, and growth experiments.
        </p>
        <p>You acknowledge that:</p>
        <ul>
          <li>
            AI-generated suggestions are automated recommendations and may not
            always be accurate, appropriate, or suitable for your audience
          </li>
          <li>
            You are responsible for reviewing and approving all AI suggestions
            before acting on them
          </li>
          <li>
            AI features process your content and performance data through
            third-party AI providers
          </li>
          <li>
            AI-generated insights are based on historical data and do not
            guarantee future performance
          </li>
          <li>
            We may update or modify AI features at any time to improve accuracy
            and functionality
          </li>
        </ul>
      </Section>

      {/* 8. Availability and Support */}
      <Section number="8" title="Service Availability">
        <p>
          We strive to maintain high availability of the Service but do not
          guarantee uninterrupted or error-free access. The Service may be
          temporarily unavailable due to maintenance, updates, or circumstances
          beyond our reasonable control.
        </p>
        <p>
          We reserve the right to modify, suspend, or discontinue any part of
          the Service at any time. We will make reasonable efforts to provide
          advance notice of significant changes that may affect your use of the
          platform.
        </p>
      </Section>

      {/* 9. Fees and Payment */}
      <Section number="9" title="Fees and Payment">
        <p>
          AiGrow may offer free and paid subscription tiers. If you subscribe
          to a paid plan, you agree to pay the applicable fees as described at
          the time of purchase. Fees are non-refundable except where required by
          law or as expressly stated in our refund policy.
        </p>
        <p>
          We reserve the right to change our pricing with reasonable advance
          notice. Continued use of paid features after a price change constitutes
          acceptance of the new pricing.
        </p>
      </Section>

      {/* 10. Limitation of Liability */}
      <Section number="10" title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, AiGrow and its officers,
          directors, employees, and agents shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising out of
          or relating to your use of the Service, including but not limited to:
        </p>
        <ul>
          <li>Loss of revenue, data, or business opportunities</li>
          <li>
            Content that is published incorrectly, at the wrong time, or not at
            all
          </li>
          <li>
            Unauthorized access to your account due to compromise of your
            credentials
          </li>
          <li>Inaccurate AI-generated suggestions or analytics</li>
          <li>
            Suspension or termination of your connected platform accounts by
            those platforms
          </li>
        </ul>
        <p>
          Our total aggregate liability for any claims arising from the Service
          shall not exceed the amount you paid us in the twelve (12) months
          preceding the claim.
        </p>
      </Section>

      {/* 11. Disclaimer of Warranties */}
      <Section number="11" title="Disclaimer of Warranties">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; without warranties of any kind, whether express or
          implied, including but not limited to implied warranties of
          merchantability, fitness for a particular purpose, and
          non-infringement.
        </p>
        <p>
          We do not warrant that the Service will meet your specific
          requirements, that results obtained from AI features will be accurate
          or reliable, or that the Service will be available at all times.
        </p>
      </Section>

      {/* 12. Indemnification */}
      <Section number="12" title="Indemnification">
        <p>
          You agree to indemnify and hold harmless AiGrow and its affiliates,
          officers, directors, employees, and agents from any claims, damages,
          losses, liabilities, and expenses (including reasonable legal fees)
          arising out of or relating to:
        </p>
        <ul>
          <li>Your use of the Service</li>
          <li>Content you publish through the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any third-party rights</li>
        </ul>
      </Section>

      {/* 13. Termination */}
      <Section number="13" title="Termination">
        <p>
          You may stop using the Service and delete your account at any time
          through the Settings page. Upon account deletion, we will remove your
          personal data in accordance with our Privacy Policy.
        </p>
        <p>
          We may suspend or terminate your account if we reasonably believe you
          have violated these Terms, engaged in fraudulent activity, or if
          required by law. We will make reasonable efforts to notify you before
          termination, except where prohibited by law or where immediate action
          is necessary to protect the Service or other users.
        </p>
      </Section>

      {/* 14. Governing Law */}
      <Section number="14" title="Governing Law">
        <p>
          These Terms shall be governed by and construed in accordance with the
          laws of the jurisdiction in which AiGrow is incorporated, without
          regard to conflict of law principles. Any disputes arising from these
          Terms or the Service shall be resolved in the courts of that
          jurisdiction.
        </p>
      </Section>

      {/* 15. Changes to Terms */}
      <Section number="15" title="Changes to These Terms">
        <p>
          We may revise these Terms from time to time. If we make material
          changes, we will notify you by posting the updated Terms on this page
          with a revised effective date. For significant changes, we may also
          provide notice through the platform interface.
        </p>
        <p>
          Your continued use of AiGrow after the revised Terms take effect
          constitutes your acceptance of the changes. If you do not agree with
          the revised Terms, you should discontinue use of the Service.
        </p>
      </Section>

      {/* 16. Severability */}
      <Section number="16" title="Severability">
        <p>
          If any provision of these Terms is found to be unenforceable or
          invalid, that provision shall be limited or eliminated to the minimum
          extent necessary, and the remaining provisions shall remain in full
          force and effect.
        </p>
      </Section>

      {/* 17. Contact */}
      <Section number="17" title="Contact Us">
        <p>
          If you have questions about these Terms, please contact us at:
        </p>
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">AiGrow</p>
          <p>
            Email:{" "}
            <a
              href="mailto:legal@creatorgrowthos.com"
              className="text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground"
            >
              legal@creatorgrowthos.com
            </a>
          </p>
        </div>
      </Section>
    </article>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_li]:text-muted-foreground">
      {title && (
        <h2 className="text-base font-semibold text-foreground">
          {number && (
            <span className="mr-1.5 font-mono text-xs text-muted-foreground/60">
              {number.padStart(2, "0")}
            </span>
          )}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-1 text-sm font-semibold text-foreground/80">
      {children}
    </h3>
  );
}
