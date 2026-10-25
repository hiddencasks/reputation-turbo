import type { Metadata } from "next";
import { addressOneLine, site } from "@/lib/site";
import { Container, PageHeader } from "@/components/ui";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy Policy" intro="Last updated October 25, 2026" />
      <section className="py-14">
        <Container>
          <Prose>
            <p>
              This policy explains what information {site.name} (&quot;we&quot;, &quot;us&quot;) collects through this website and
              how we use it.
            </p>
            <h2>Information we collect</h2>
            <ul>
              <li>Details you submit in our forms: your name, business name, phone number, email address, website address and any message you write.</li>
              <li>Public information about your business that we review to prepare an audit, such as your website, Google listing, reviews and social media profiles.</li>
              <li>Basic technical information your browser sends, such as IP address, which we use in a scrambled form to block spam and abuse.</li>
            </ul>
            <h2>How we use it</h2>
            <ul>
              <li>To prepare and send the audit or information you asked for.</li>
              <li>To follow up with you about your request. You can ask us to stop at any time.</li>
              <li>To provide services you buy from us, and to keep records of our communications.</li>
              <li>To protect our website from spam and misuse.</li>
            </ul>
            <p>We do not sell your personal information.</p>
            <h2>Service providers</h2>
            <p>
              We use trusted providers to run our business, including website hosting, database, email delivery and payment
              processing. They process information only to provide their services to us.
            </p>
            <h2>Emails</h2>
            <p>
              Every marketing email we send includes a way to opt out. If you opt out, we add you to a do-not-contact list so you
              are not emailed again.
            </p>
            <h2>How long we keep information</h2>
            <p>
              We keep lead and customer records for as long as needed to serve you and meet legal and accounting requirements,
              and delete information you ask us to remove unless we must keep it.
            </p>
            <h2>Your choices</h2>
            <p>
              You can ask us what information we hold about you, ask us to correct or delete it, or opt out of communications by
              emailing <a href={`mailto:${site.email}`}>{site.email}</a>{site.showPhone ? ` or calling ${site.phoneDisplay}` : ""}.
            </p>
            <h2>Contact</h2>
            <p>
              {site.name}, {addressOneLine}. Email <a href={`mailto:${site.email}`}>{site.email}</a>.
            </p>
          </Prose>
        </Container>
      </section>
    </>
  );
}
