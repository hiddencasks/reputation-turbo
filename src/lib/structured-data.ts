// Structured data (schema.org JSON-LD) that tells search engines and AI assistants who we are.
import { profiles, site } from "./site";

export type Faq = { q: string; a: string };

export function businessJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${site.url}/#business`,
    name: site.name,
    slogan: site.tagline,
    url: site.url,
    email: site.email,
    ...(site.showPhone ? { telephone: site.phoneHref.replace("tel:", "") } : {}),
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.line1,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postal,
      addressCountry: "US",
    },
    areaServed: site.cities.map((c) => ({ "@type": "City", name: `${c}, CA` })),
    knowsAbout: ["Web design", "Small business websites", "Digital marketing", "Google Business Profile optimization", "Local SEO", "Online reviews", "Generative engine optimization (GEO)"],
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
  };
}

/** Tells Google the site's name, so results show "Reputation Turbo" instead of the bare domain. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${site.url}/#website`,
    name: site.name,
    url: `${site.url}/`,
    publisher: { "@id": `${site.url}/#business` },
  };
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
