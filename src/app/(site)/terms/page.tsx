import type { Metadata } from "next";
import { addressOneLine, site } from "@/lib/site";
import { Container, PageHeader } from "@/components/ui";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Terms of Use" };

export default function TermsPage() {
  return (
    <>
      <PageHeader title="Terms of Use" intro="Last updated October 25, 2026" />
      <section className="py-14">
        <Container>
          <Prose>
            <p>By using this website you agree to these terms. If you do not agree, please do not use the site.</p>
            <h2>Information on this site</h2>
            <p>
              We work to keep the information here accurate, but it is provided for general information and may change. Prices
              and package details are confirmed in a written proposal before any work begins.
            </p>
            <h2>Free online audits</h2>
            <p>
              Our free audits are based on publicly available information and automated checks at the time of review. They are
              recommendations, not guarantees of search rankings, traffic or sales.
            </p>
            <h2>Services</h2>
            <p>
              Paid work is governed by the proposal and service agreement you accept. Third-party products such as domains,
              hosting, business email and software are purchased by you directly from their providers under their own terms.
            </p>
            <h2>Acceptable use</h2>
            <p>Do not misuse the site, submit false information, or attempt to disrupt or gain unauthorized access to it.</p>
            <h2>Intellectual property</h2>
            <p>The {site.name} name, logo and site content belong to us. Content you provide to us remains yours.</p>
            <h2>Trademarks</h2>
            <p>
              Google, ChatGPT, Claude, Gemini, Perplexity, Copilot and other product names mentioned on this site are trademarks of
              their respective owners and are used only to describe the services they offer. {site.name} is not affiliated with or
              endorsed by Google, OpenAI, Anthropic, Microsoft or Perplexity.
            </p>
            <h2>Limitation of liability</h2>
            <p>
              To the extent allowed by law, we are not liable for indirect or consequential damages arising from use of this
              website.
            </p>
            <h2>Governing law</h2>
            <p>These terms are governed by the laws of the State of California.</p>
            <h2>Contact</h2>
            <p>
              {site.name}, {addressOneLine}.{site.showPhone ? ` ${site.phoneDisplay}.` : ""} <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </Prose>
        </Container>
      </section>
    </>
  );
}
