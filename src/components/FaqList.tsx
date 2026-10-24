import type { Faq } from "@/lib/structured-data";

/** Questions and answers as visible text, in a two-column grid. */
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <dl className="mt-6 grid gap-6 md:grid-cols-2">
      {faqs.map((f) => (
        <div key={f.q} className="rounded-lg border border-line bg-white p-6">
          <dt className="font-display text-xl font-bold text-navy">{f.q}</dt>
          <dd className="mt-2 text-muted">{f.a}</dd>
        </div>
      ))}
    </dl>
  );
}
