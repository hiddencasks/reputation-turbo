import type { Metadata } from "next";
import Image from "next/image";
import { photos } from "@/lib/photos";
import { site } from "@/lib/site";
import { IconBadge, type IconName } from "@/components/Icon";
import { ButtonLink, Container, Eyebrow, PageHeader } from "@/components/ui";
import logoFullWhite from "../../../../public/brand/logo-full-white.png";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Meet Alvin Shamoun, founder of Reputation Turbo, helping contractors and home service businesses across San Diego County get found on Google and AI search.",
};

const principles: { title: string; body: string; icon: IconName }[] = [
  { title: "Honest audits", icon: "shield", body: "We only report what we can verify. No invented rankings, traffic numbers or scare tactics." },
  { title: "You own it", icon: "key", body: "Your domain, hosting, email and profiles stay in your name and on your bill. We work with delegated access, never your passwords." },
  { title: "Plain English", icon: "chat", body: "Every recommendation comes with a reason you can understand and a price you know upfront." },
  { title: "Built to be fast", icon: "bolt", body: "We use modern tools, including AI, to do the heavy lifting, and a person reviews every deliverable before you see it." },
];

export default function AboutPage() {
  const founder = photos.founder;
  return (
    <>
      <PageHeader
        eyebrow="About us"
        title="Local roots, modern marketing"
        intro={`${site.name} helps contractors and home service businesses get found, build trust and win more jobs across ${site.serviceArea}.`}
      />

      <section className="py-16">
        <Container className="grid gap-12 md:grid-cols-[1fr_1.4fr] md:items-start">
          <figure className="mx-auto w-full max-w-sm">
            {founder ? (
              <Image src={founder.src} alt={founder.alt} width={800} height={1000} className="aspect-[4/5] w-full rounded-2xl object-cover shadow-xl" />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl bg-navy p-8 shadow-xl">
                <Image src={logoFullWhite} alt="" className="h-auto w-full" />
              </div>
            )}
            <figcaption className="mt-3 text-center text-sm text-muted">Alvin Shamoun, founder</figcaption>
          </figure>
          <div>
            <Eyebrow>Meet the founder</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">I&apos;m Alvin Shamoun</h2>
            <div className="mt-4 space-y-4 text-lg text-ink">
              <p>
                I&apos;ve been an entrepreneur and business owner for more than 20 years, building and running businesses right here
                in San Diego. I&apos;ve worked in everything from retail and entertainment to construction, and I&apos;ve learned a
                thing or two about what it takes to keep a small business going.
              </p>
              <p>
                When I first got started, the Yellow Pages and PennySaver were some of the best ways to get your business noticed.
                Times have definitely changed! Today, customers are searching Google, checking reviews, and even asking AI who
                they should hire.
              </p>
              <p>
                Working in the contracting industry, I&apos;ve seen firsthand how hardworking business owners can be great at what
                they do but struggle to get noticed online. That&apos;s why I started {site.name}.
              </p>
              <p>
                I&apos;m an East County local, a husband, a proud father of three girls, and an avid pickleball player. I believe in
                straightforward service, fair pricing, and helping local businesses compete without making digital marketing more
                complicated than it needs to be.
              </p>
              <p className="font-display text-2xl font-bold italic text-orange">Let&apos;s get your business found.</p>
            </div>
          </div>
        </Container>
      </section>

      <section className="bg-navy-50 py-16">
        <Container>
          <Eyebrow>How we work</Eyebrow>
          <h2 className="mt-2 font-display text-4xl font-bold text-navy">What you can count on</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((p) => (
              <div key={p.title} className="rounded-xl border border-line bg-white p-6">
                <IconBadge name={p.icon} />
                <h3 className="mt-4 font-display text-xl font-bold text-navy">{p.title}</h3>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="py-16">
        <Container className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <Eyebrow>Right here in East County</Eyebrow>
            <h2 className="mt-2 font-display text-4xl font-bold text-navy">Local businesses, local help</h2>
            <p className="mt-3 text-lg text-ink">
              We&apos;re based in {site.address.city} and work with businesses in {site.cities.slice(0, -1).join(", ")} and{" "}
              {site.cities[site.cities.length - 1]}, plus the rest of San Diego County. We know the neighborhoods your customers
              live in, because we live here too.
            </p>
          </div>
          <div className="rounded-xl bg-orange p-8 text-white">
            <h2 className="font-display text-3xl font-extrabold italic uppercase">See how your business looks online</h2>
            <p className="mt-2 text-white/90">Start with a free audit. It&apos;s reviewed by a real person before it reaches you.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/free-audit" variant="dark">Get Your Free Online Audit</ButtonLink>
              {!site.showPhone && (
                <ButtonLink href={site.bookingUrl} target="_blank" rel="noopener" variant="ghostLight">{site.bookingLabel}</ButtonLink>
              )}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
