import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { author, formatPostDate, getVisiblePost, isLive, visiblePosts } from "@/lib/blog";
import { site } from "@/lib/site";
import { businessJsonLd } from "@/lib/structured-data";
import { postBodies } from "@/content/blog";
import { ButtonLink, Container, Eyebrow } from "@/components/ui";
import { JsonLd } from "@/components/JsonLd";
import { Prose } from "@/components/Prose";

// Posts not live at build time are rendered on request once their date passes.
// Before then they're a 404 (except on previews). Re-checked every hour.
export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return visiblePosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = getVisiblePost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.title, description: post.description, publishedTime: post.publishAt, authors: [author.name] },
    ...(isLive(post) ? {} : { robots: { index: false } }),
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = getVisiblePost((await params).slug);
  const body = post && postBodies[post.slug];
  if (!post || !body) notFound();

  const others = visiblePosts().filter((p) => p.slug !== post.slug).slice(0, 3);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.publishAt,
    url: `${site.url}/blog/${post.slug}`,
    mainEntityOfPage: `${site.url}/blog/${post.slug}`,
    author: { "@type": "Person", name: author.name, jobTitle: "Founder", url: `${site.url}${author.href}` },
    publisher: businessJsonLd(),
  };

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <section className="bg-navy text-white">
        <Container className="py-14 sm:py-20">
          <Link href="/blog" className="text-sm font-semibold text-white/80 hover:text-orange">← All posts</Link>
          <div className="mt-4">
            <Eyebrow>{post.topic}</Eyebrow>
          </div>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold sm:text-5xl">{post.title}</h1>
          <p className="mt-4 text-white/80">
            By <Link href={author.href} className="font-semibold text-white underline decoration-orange underline-offset-2 hover:text-orange">{author.name}</Link>
            {" · "}
            <time dateTime={post.publishAt}>{formatPostDate(post.publishAt)}</time>
            {" · "}
            {post.readMinutes} min read
          </p>
          {!isLive(post) && (
            <p className="mt-4 inline-block rounded bg-orange px-3 py-1 text-sm font-semibold">Scheduled: goes live {formatPostDate(post.publishAt)} (preview only)</p>
          )}
        </Container>
      </section>

      <article className="py-12">
        <Container>
          <Prose>
            {body}
          </Prose>
          <div className="mt-10 max-w-3xl rounded-lg bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">Get your free online audit</h2>
            <p className="mt-2 text-white/90">See what Google and AI assistants show about your business, and what to fix first. Free, and reviewed by a real person.</p>
            <ButtonLink href="/free-audit" variant="dark" className="mt-6">Get Your Free Audit</ButtonLink>
          </div>
        </Container>
      </article>

      {others.length > 0 && (
        <section className="bg-navy-50 py-12">
          <Container>
            <h2 className="font-display text-2xl font-bold text-navy">More from the blog</h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-3">
              {others.map((p) => (
                <li key={p.slug}>
                  <Link href={`/blog/${p.slug}`} className="block rounded-lg bg-white p-5 font-semibold text-navy shadow-sm hover:text-orange">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}
    </>
  );
}
