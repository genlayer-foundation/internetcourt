import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { buildAlternates, localizedUrl } from "@/lib/i18n-metadata";

const TITLE = "Privacy Policy · Internet Court";
const DESCRIPTION =
  "How GenLayer Foundation collects, uses, and discloses information in connection with Internet Court, the trust layer for agent-to-agent commerce.";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: buildAlternates("/privacy", locale),
    openGraph: {
      title: TITLE,
      description: DESCRIPTION,
      url: localizedUrl("/privacy", locale),
      type: "website",
    },
    twitter: {
      title: TITLE,
      description: DESCRIPTION,
    },
  };
}

/** Red-accent inline link styling, matching the long-form prose spec. */
const linkClass =
  "text-[#c0362b] underline underline-offset-2 hover:opacity-80";

/** External link with the standard security rel. */
function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClass}
    >
      {children}
    </a>
  );
}

/** Top-level section wrapper: hairline separator + generous spacing. */
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12 border-t border-[#e7e1d4] pt-10">
      <h2 className="font-heading text-xl md:text-2xl text-[#1c1a16]">
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

/** Numbered / minor sub-heading inside a section. */
function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-8 text-lg font-semibold text-[#1c1a16]">{children}</h3>
  );
}

/** Body paragraph, readable ink slightly darker than muted. */
function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[15px] md:text-base leading-relaxed text-[#3a352d]">
      {children}
    </p>
  );
}

/** Disc-bullet list in muted ink. */
function List({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-2 pl-6 text-[15px] md:text-base leading-relaxed text-[#6c665a]">
      {children}
    </ul>
  );
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="bg-[#f7f4ec] pt-16 md:pt-20">
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-16 md:py-24">
        <h1 className="font-heading text-3xl md:text-4xl text-[#1c1a16]">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-[#6c665a]">
          Last updated: July 9, 2026
        </p>

        {locale !== "en" && (
          <p className="mt-6 italic text-[#6c665a]">
            This Privacy Policy is available in English only.
          </p>
        )}

        <Section title="Who we are">
          <P>
            GenLayer Foundation (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;) operates Internet Court and wants you to
            understand how we collect, use, and disclose information.
          </P>
          <P>
            Internet Court is the trust layer for agent-to-agent commerce: a
            single, open, catch-all skill that provides natural-language
            mandates, delegated permissions, x402 payments, escrow, and dispute
            resolution, and that loads roughly seventy vendored protocol and
            connector sub-skills on demand. It connects the fragmented
            agentic-commerce stack (identity, negotiation, contracts, payment,
            execution, and disputes) and adds a verification and
            dispute-resolution layer built on x402, ERC-7710, and GenLayer
            supervision.
          </P>
        </Section>

        <Section title="What this policy covers">
          <P>
            This Privacy Policy describes our practices in connection with
            information collected through:
          </P>
          <List>
            <li>
              The Internet Court website at internetcourt.org, including the
              skill.md endpoint used for distribution;
            </li>
            <li>
              The Internet Court skill package as distributed through package
              registries (for example via &ldquo;npx skill install
              &hellip;&rdquo;, Claude Code&rsquo;s &ldquo;/plugin add
              &hellip;&rdquo;, and other registries that list the package);
            </li>
            <li>
              The Internet Court Telegram bot (&ldquo;Telegram Agent&rdquo;),
              which delivers updates to users who choose to interact with it; and
            </li>
            <li>Communications between you and us.</li>
          </List>
          <P>
            Collectively, we refer to these as the &ldquo;Services.&rdquo;
          </P>
          <P>This policy does not cover:</P>
          <List>
            <li>
              The public blockchains, wallets, node providers, or third-party
              protocols the skill interacts with when you use it. On-chain
              activity is public by nature and governed by the rules of the
              relevant network, not by us.
            </li>
            <li>
              Anthropic&rsquo;s Claude products, or any AI model provider,
              through which the skill may run. Their handling of your prompts and
              conversations is governed by their own policies.
            </li>
            <li>
              Third-party connectors or protocols invoked by sub-skills, each of
              which is operated by its respective provider under its own terms
              and privacy policy.
            </li>
          </List>
        </Section>

        <Section title="Information we collect">
          <P>
            We aim to collect as little personal information as possible. The
            categories below reflect current practice.
          </P>

          <SubHeading>
            1. Information collected automatically on our website
          </SubHeading>
          <P>
            When you visit internetcourt.org (including to retrieve skill.md), we
            and our analytics provider automatically collect standard technical
            and usage information through cookies and similar technologies,
            including your IP address, approximate location derived from it,
            browser and device type, operating system, referring/exit pages,
            pages viewed, and interaction data.
          </P>
          <P>
            We use Google Analytics for this purpose. Information collected by
            Google Analytics is subject to Google&rsquo;s privacy practices; see{" "}
            <ExtLink href="https://policies.google.com/privacy">
              https://policies.google.com/privacy
            </ExtLink>
            .
          </P>

          <SubHeading>2. Distribution and download statistics</SubHeading>
          <P>
            When you install the skill through a public package registry (for
            example npm via &ldquo;npx skill install &hellip;&rdquo;), the
            registry records installation and download activity. These statistics
            are generated and published by the registry operator, not by us; we
            may view the aggregate public statistics the registry makes
            available. Any personal data (such as an IP address) associated with
            a download is collected by the registry under its own privacy policy.
          </P>

          <SubHeading>3. Telegram bot and communications</SubHeading>
          <P>
            If you choose to start or interact with our Telegram Agent, Telegram
            and we may process your Telegram username or user ID, your public
            Telegram profile information, and the content and metadata of
            messages you send to or receive from the bot. We use this to deliver
            updates and respond to you. Your use of Telegram is also governed by
            Telegram&rsquo;s own privacy policy at{" "}
            <ExtLink href="https://telegram.org/privacy">
              https://telegram.org/privacy
            </ExtLink>
            . If you contact us directly (for example by email or through the
            website), we collect the information you choose to provide, such as
            your name, contact details, and the content of your message.
          </P>

          <SubHeading>4. On-chain and transaction information</SubHeading>
          <P>
            The skill facilitates delegated permissions (ERC-7710), x402
            payments, escrow, and dispute resolution supervised by GenLayer.
            Using these features necessarily involves blockchain transactions,
            which are public and permanent on the relevant network and may
            include wallet addresses, transaction hashes, amounts, and
            smart-contract interactions. We do not control public blockchains and
            cannot alter or delete on-chain data.
          </P>

          <SubHeading>5. Information we do not collect</SubHeading>
          <P>
            The skill is designed to run within your own agent/Claude
            environment. We do not collect the contents of your conversations,
            prompts, or files with your AI assistant, and we do not collect data
            from your context beyond what is necessary to perform a requested
            function.
          </P>
        </Section>

        <Section title="How we use information">
          <P>We use the information we collect to:</P>
          <List>
            <li>
              Provide, operate, maintain, debug, and improve the Services,
              including the website, the skill package, and the Telegram Agent;
            </li>
            <li>
              Understand how the Services are used through aggregated analytics
              and download statistics, so we can improve quality and reliability;
            </li>
            <li>
              Send you product updates, release notes, and related information
              via the Telegram Agent where you have chosen to receive them;
            </li>
            <li>Respond to your inquiries and support requests;</li>
            <li>
              Protect the security and integrity of the Services, including
              detecting, preventing, and investigating fraud, abuse, and
              technical issues;
            </li>
            <li>
              Comply with applicable law, legal process, and enforceable
              governmental requests, and to establish, exercise, or defend legal
              claims; and
            </li>
            <li>
              Aggregate or de-identify information so that it no longer
              identifies you, which we may then use for any lawful purpose.
            </li>
          </List>
        </Section>

        <Section title="Service providers and third parties">
          <P>
            We rely on third-party providers to operate the Services. We are not
            affiliated with these companies and are not responsible for their
            practices; we encourage you to review their policies. They may
            include:
          </P>
          <List>
            <li>
              Google LLC (Google Analytics):{" "}
              <ExtLink href="https://policies.google.com/privacy">
                https://policies.google.com/privacy
              </ExtLink>
            </li>
            <li>
              The npm registry / GitHub, Inc. (package distribution and download
              statistics):{" "}
              <ExtLink href="https://docs.github.com/site-policy/privacy-policies">
                https://docs.github.com/site-policy/privacy-policies
              </ExtLink>
            </li>
            <li>
              Telegram (Telegram Agent messaging):{" "}
              <ExtLink href="https://telegram.org/privacy">
                https://telegram.org/privacy
              </ExtLink>
            </li>
            <li>
              GenLayer (dispute-resolution supervision layer):{" "}
              <ExtLink href="https://genlayer.foundation/privacy-policy">
                https://genlayer.foundation/privacy-policy
              </ExtLink>
            </li>
          </List>
          <P>
            We may also disclose information: to comply with applicable law and
            to cooperate with public authorities or law enforcement; to enforce
            our terms; to protect the rights, safety, and property of Internet
            Court, our users, and others; and in connection with a merger,
            acquisition, financing, reorganization, or sale of assets, in which
            case information may be transferred as a business asset.
          </P>
          <P>We do not sell your personal information.</P>
        </Section>

        <Section title="Communications and how to opt out">
          <P>
            Where you have chosen to receive updates through the Telegram Agent,
            you can stop receiving them at any time by blocking or stopping the
            bot in Telegram. We will still send essential service or legal notices
            where required.
          </P>
        </Section>

        <Section title="Cookies and similar technologies">
          <P>
            Our website uses cookies and similar technologies for analytics and
            to make the site function. You can control non-essential cookies
            through your browser settings or any cookie controls presented on the
            site. If you block cookies, some parts of the site may not work as
            intended.
          </P>
        </Section>

        <Section title="Data retention">
          <P>
            We retain personal information only for as long as necessary for the
            purposes described in this policy and as permitted by law. Criteria we
            use to determine retention periods include the duration of our
            relationship with you, the need to provide the Services, our legal
            and regulatory obligations, and the advisability of retention in light
            of our legal position (such as applicable limitation periods).
          </P>
        </Section>

        <Section title="Security">
          <P>
            We use reasonable organizational, technical, and administrative
            measures to protect personal information under our control. No system
            can be guaranteed to be completely secure. If you believe your
            interaction with us is no longer secure, please contact us
            immediately.
          </P>
        </Section>

        <Section title="Your rights and choices">
          <P>
            Depending on where you live, you may have rights over your personal
            information, including to access, correct, delete, or receive a copy
            of it, to object to or restrict certain processing, and to withdraw
            consent. To exercise any of these rights, contact us using the details
            below. We will respond consistent with applicable law and may need to
            verify your identity before acting on a request. We will not
            discriminate against you for exercising these rights.
          </P>

          <SubHeading>Additional information for the EEA and UK</SubHeading>
          <P>
            If you are in the European Economic Area or the United Kingdom, our
            processing relies on the legal bases noted above, and you have the
            rights described in the GDPR/UK GDPR. Where we transfer personal data
            outside the EEA/UK to a country not recognized as providing adequate
            protection, we put appropriate safeguards in place, such as Standard
            Contractual Clauses. You may also lodge a complaint with your local
            data protection authority.
          </P>
        </Section>

        <Section title="International transfers">
          <P>
            Your information may be stored and processed in any country where we
            or our service providers operate, including the United States. These
            countries may have data-protection rules different from those where
            you live. Where required, we implement appropriate safeguards for
            cross-border transfers.
          </P>
        </Section>

        <Section title="Minors">
          <P>
            The Services are not directed to individuals under the age of
            eighteen (18), and we do not knowingly collect personal information
            from anyone under 18. If you believe a minor has provided us with
            personal information, please contact us.
          </P>
        </Section>

        <Section title="Sensitive information">
          <P>
            Unless we specifically request it, please do not send us sensitive
            personal information (such as government identifiers, health data,
            biometric or genetic data, or information revealing racial or ethnic
            origin, political opinions, religion, or trade-union membership)
            through the Services.
          </P>
        </Section>

        <Section title="Changes to this policy">
          <P>
            The &ldquo;Last updated&rdquo; date at the top indicates when this
            policy was last revised. Changes take effect when we post the revised
            policy. We encourage you to review it periodically.
          </P>
        </Section>

        <Section title="Contacting us">
          <P>
            GenLayer Foundation is located at Quality Corporate Services Ltd.,
            P.O. Box 712, Suite 102, Cannon Place, North Sound Road, George Town,
            Grand Cayman KY1-9006, Cayman Islands, and is responsible for the
            collection, use, and disclosure of your personal information under
            this Privacy Policy.
          </P>
          <P>
            If you have any questions about this Privacy Policy, please contact
            us through our website at internetcourt.org.
          </P>
        </Section>
      </div>
    </div>
  );
}
