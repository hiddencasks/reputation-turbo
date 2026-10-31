import type { Metadata } from "next";
import Link from "next/link";
import { formatPostDate, isLive, visiblePosts } from "@/lib/blog";
import { ButtonLink, Container, PageHeader, cardHover } from "@/components/ui";

// Re-checked every hour, so scheduled posts appear on their date without a new deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Blog: Local Marketing Tips",
  description:
    "Plain-English tips for San Diego County contractors and home service businesses on showing up in Google, Maps and AI answers, plus Google profiles and reviews.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const list = visiblePosts();
  return (
    <>
      <PageHeader
        eyebrow="Blog"
        title="Local Marketing Tips"
        intro="Plain-English advice for San Diego County contractors and home service businesses on Google, Maps, reviews and AI search."
      />
      <section className="py-14">
        <Container>
          {list.length === 0 ? (
            <p className="text-lg text-muted">The first post is on its way. Check back soon.</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {list.map((p) => (
                <Link key={p.slug} href={`/blog/${p.slug}`} className={`flex flex-col rounded-xl border border-line bg-white p-6 ${cardHover}`}>
                  <p className="text-sm font-semibold text-orange">
                    {p.topic} · {p.readMinutes} min read
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-navy">{p.title}</h2>
                  <p className="mt-2 text-muted">{p.description}</p>
                  <p className="mt-4 text-sm text-muted">
                    {formatPostDate(p.publishAt)}
                    {!isLive(p) && <span className="ml-2 rounded bg-navy px-2 py-0.5 text-xs font-semibold text-white">Scheduled (preview only)</span>}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <div className="mt-12 rounded-lg bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">See where your business stands</h2>
            <p className="mt-2 text-white/90">Free, personalized, and reviewed by a real person before it reaches you.</p>
            <ButtonLink href="/free-audit" variant="dark" className="mt-6">Get Your Free Audit</ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
