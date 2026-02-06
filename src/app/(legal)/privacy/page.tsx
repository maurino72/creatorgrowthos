import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Growth OS collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="space-y-10">
      {/* Title block */}
      <header className="space-y-3 border-b border-border pb-8">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Legal
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: February 6, 2026 &middot; Last updated: February 6,
          2026
        </p>
      </header>

      {/* Introduction */}
      <Section>
        <p>
          Growth OS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
          operates the Growth OS platform, a social media management and
          analytics tool designed to help content creators grow their audience.
          This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you use our service.
        </p>
        <p>
          By accessing or using Growth OS, you agree to this Privacy Policy. If
          you do not agree with the terms of this policy, please do not access
          the platform.
        </p>
      </Section>

      {/* 1. Information We Collect */}
      <Section number="1" title="Information We Collect">
        <H3>1.1 Account Information</H3>
        <p>
          When you create an account, we collect your email address, display
          name, and profile picture. If you sign up through a third-party
          authentication provider, we receive the profile information you
          authorize that provider to share with us.
        </p>

        <H3>1.2 Connected Platform Data</H3>
        <p>
          When you connect a social media account (such as Twitter/X), we
          collect and store:
        </p>
        <ul>
          <li>
            OAuth access tokens and refresh tokens, which are encrypted at rest
            using AES-256-GCM encryption
          </li>
          <li>Your platform username and profile information</li>
          <li>
            Post performance metrics including impressions, likes, replies,
            reposts, clicks, and profile visits
          </li>
        </ul>
        <p>
          We only request the minimum permissions necessary to publish content
          and retrieve analytics on your behalf.
        </p>

        <H3>1.3 Content You Create</H3>
        <p>
          We store the content you compose within Growth OS, including post text,
          uploaded images, scheduling preferences, and publishing history. Images
          are stored securely and deleted from our storage after successful
          publication to your connected platforms.
        </p>

        <H3>1.4 AI-Processed Data</H3>
        <p>
          Growth OS uses artificial intelligence to provide content
          classification, performance insights, content improvement suggestions,
          and experiment recommendations. To deliver these features, your post
          content and aggregated performance data are processed by third-party AI
          providers (currently OpenAI). We send only the minimum data necessary
          for each AI operation and do not send your authentication credentials
          or personal identifiers to AI providers.
        </p>

        <H3>1.5 Usage Data</H3>
        <p>
          We automatically collect information about how you interact with our
          platform, including pages visited, features used, and timestamps. This
          data helps us improve the service and diagnose technical issues.
        </p>
      </Section>

      {/* 2. How We Use Your Information */}
      <Section number="2" title="How We Use Your Information">
        <p>We use the information we collect to:</p>
        <ul>
          <li>Provide, operate, and maintain the Growth OS platform</li>
          <li>
            Publish content to your connected social media accounts at your
            direction
          </li>
          <li>
            Collect and display performance metrics for your published content
          </li>
          <li>
            Generate AI-powered insights, content suggestions, and growth
            experiments
          </li>
          <li>
            Classify your content by intent, type, and topic to improve
            analytics
          </li>
          <li>
            Refresh expired authentication tokens to maintain your platform
            connections
          </li>
          <li>Send you service-related notifications</li>
          <li>Detect, prevent, and address technical issues</li>
        </ul>
      </Section>

      {/* 3. Data Storage and Security */}
      <Section number="3" title="Data Storage and Security">
        <p>
          Your data is stored using Supabase, which provides enterprise-grade
          PostgreSQL databases with row-level security policies. All data is
          encrypted in transit using TLS and at rest.
        </p>
        <p>
          Platform authentication tokens are additionally encrypted using
          AES-256-GCM before storage. Encryption keys are stored separately from
          the encrypted data.
        </p>
        <p>
          Uploaded media files are stored in a dedicated, access-controlled
          storage bucket. Files that are not associated with any post are
          automatically cleaned up within 24 hours.
        </p>
        <p>
          While we implement commercially reasonable security measures, no method
          of electronic storage or transmission over the Internet is 100% secure.
          We cannot guarantee absolute security.
        </p>
      </Section>

      {/* 4. Third-Party Services */}
      <Section number="4" title="Third-Party Services">
        <p>
          Growth OS integrates with the following categories of third-party
          services:
        </p>

        <H3>4.1 Social Media Platforms</H3>
        <p>
          We connect to social media platforms (currently Twitter/X) using their
          official APIs and OAuth 2.0 with PKCE for secure authorization. These
          platforms have their own privacy policies governing how they handle
          your data.
        </p>

        <H3>4.2 AI Providers</H3>
        <p>
          We use OpenAI to power our content classification, insights
          generation, content improvement, and experiment suggestion features.
          Data sent to OpenAI is subject to their data usage policies. We do not
          opt in to having your data used for model training.
        </p>

        <H3>4.3 Infrastructure Providers</H3>
        <p>
          Our platform is hosted on Vercel and uses Supabase for database and
          authentication services. Background job processing is handled by
          Inngest. Each of these providers maintains their own privacy and
          security practices.
        </p>
      </Section>

      {/* 5. Data Retention */}
      <Section number="5" title="Data Retention">
        <p>
          We retain your account information and content for as long as your
          account is active. Performance metrics are collected over a 30-day
          window following publication and retained for the lifetime of your
          account.
        </p>
        <p>
          AI-generated insights, classifications, and experiment suggestions are
          stored alongside your account data and can be dismissed or removed at
          your discretion.
        </p>
        <p>
          When you delete your account, we will delete or anonymize all
          personally identifiable information within 30 days, except where
          retention is required by law.
        </p>
      </Section>

      {/* 6. Your Rights */}
      <Section number="6" title="Your Rights">
        <p>Depending on your jurisdiction, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent for optional data processing</li>
          <li>Object to automated decision-making</li>
        </ul>
        <p>
          You can exercise your data export and account deletion rights directly
          from the Settings page within the platform. For other requests, please
          contact us at the address below.
        </p>
      </Section>

      {/* 7. Cookies and Tracking */}
      <Section number="7" title="Cookies and Tracking">
        <p>
          Growth OS uses essential cookies to maintain your authentication
          session. We do not use advertising cookies, third-party tracking
          pixels, or behavioral analytics tools. Session data is stored securely
          and is not shared with any third party.
        </p>
      </Section>

      {/* 8. Children's Privacy */}
      <Section number="8" title="Children&rsquo;s Privacy">
        <p>
          Growth OS is not directed to individuals under the age of 16. We do
          not knowingly collect personal information from children. If we become
          aware that we have collected data from a child under 16, we will take
          steps to delete that information promptly.
        </p>
      </Section>

      {/* 9. International Data Transfers */}
      <Section number="9" title="International Data Transfers">
        <p>
          Your information may be transferred to and processed in countries other
          than your own. Our infrastructure providers operate data centers
          globally. By using Growth OS, you consent to the transfer of your data
          to these locations, where data protection laws may differ from those in
          your jurisdiction.
        </p>
      </Section>

      {/* 10. Changes to This Policy */}
      <Section number="10" title="Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. We will notify you
          of any material changes by posting the updated policy on this page with
          a revised effective date. Your continued use of Growth OS after changes
          are posted constitutes acceptance of the updated policy.
        </p>
      </Section>

      {/* 11. Contact */}
      <Section number="11" title="Contact Us">
        <p>
          If you have questions or concerns about this Privacy Policy or our data
          practices, please contact us at:
        </p>
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">Growth OS</p>
          <p>
            Email:{" "}
            <a
              href="mailto:privacy@creatorgrowthos.com"
              className="text-foreground underline decoration-foreground/30 underline-offset-2 transition-colors hover:decoration-foreground"
            >
              privacy@creatorgrowthos.com
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
