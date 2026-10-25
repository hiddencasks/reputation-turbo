import { aiAssistants, site } from "@/lib/site";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";

/** "Get recommended on" with the AI assistants' names (plain text, not their logos). */
export function AiRow({ tone = "dark", label = "Get recommended on" }: { tone?: "dark" | "light"; label?: string }) {
  const chip = tone === "dark" ? "bg-white/10 text-white ring-white/20" : "bg-white text-navy ring-line";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`mr-1 text-sm font-semibold uppercase tracking-wide ${tone === "dark" ? "text-white/70" : "text-muted"}`}>{label}:</span>
      {aiAssistants.map((a) => (
        <span key={a} className={`rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${chip}`}>{a}</span>
      ))}
    </div>
  );
}

const examplePros = [
  { name: "Summit Plumbing & Rooter", rating: "4.9", reviews: 212, why: "Known for same-day service and upfront pricing." },
  { name: "Canyon Crew Plumbing", rating: "4.8", reviews: 167, why: "Frequently praised for clean, on-time work." },
  { name: "Valley Standard Plumbing", rating: "4.7", reviews: 98, why: "Offers 24/7 emergency calls in East County." },
];

/** A made-up AI chat on a full-size phone that shows how a customer gets three names and nothing else. */
export function AiChatDemo() {
  return (
    <figure className="mx-auto w-full max-w-[360px]" aria-label="Example of an AI assistant recommending three plumbers">
      {/* Phone body: rounded frame, side buttons, screen with a camera notch and home bar. */}
      <div className="relative">
        <span aria-hidden="true" className="absolute -left-[3px] top-28 h-8 w-[3px] rounded-l bg-ink/80" />
        <span aria-hidden="true" className="absolute -left-[3px] top-40 h-14 w-[3px] rounded-l bg-ink/80" />
        <span aria-hidden="true" className="absolute -left-[3px] top-56 h-14 w-[3px] rounded-l bg-ink/80" />
        <span aria-hidden="true" className="absolute -right-[3px] top-44 h-20 w-[3px] rounded-r bg-ink/80" />
        <div className="rounded-[3.25rem] bg-ink p-3 shadow-2xl ring-1 ring-black/40">
          <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[2.6rem] bg-white">
            {/* Status bar */}
            <div aria-hidden="true" className="relative flex items-center justify-between px-7 pb-1 pt-3.5 text-[13px] font-semibold text-ink">
              <span>9:41</span>
              <span className="absolute left-1/2 top-2.5 h-7 w-24 -translate-x-1/2 rounded-full bg-ink" />
              <span className="flex items-center gap-1.5">
                <span className="flex items-end gap-[2px]">
                  <span className="h-1.5 w-[3px] rounded-sm bg-ink" />
                  <span className="h-2 w-[3px] rounded-sm bg-ink" />
                  <span className="h-2.5 w-[3px] rounded-sm bg-ink" />
                  <span className="h-3 w-[3px] rounded-sm bg-ink" />
                </span>
                <span className="relative h-3 w-6 rounded-[4px] border border-ink/70 p-[1.5px]">
                  <span className="block h-full w-4/5 rounded-[2px] bg-ink" />
                </span>
              </span>
            </div>
            {/* App header */}
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white">
                <Icon name="sparkle" className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-ink">AI assistant</span>
              <span className="ml-auto rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-muted">Example</span>
            </div>
            {/* Conversation */}
            <div className="flex-1 space-y-3 overflow-hidden bg-navy-50/40 px-3.5 py-4">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-3.5 py-2 text-[15px] text-white">
                Who&apos;s the best plumber in El Cajon?
              </p>
              <div className="max-w-[95%] rounded-2xl rounded-bl-sm bg-white px-3.5 py-3 text-[13px] leading-snug text-ink shadow-sm ring-1 ring-line">
                <p>Here are 3 highly rated plumbers in El Cajon:</p>
                <ol className="mt-2 space-y-2.5">
                  {examplePros.map((p, i) => (
                    <li key={p.name}>
                      <p className="font-semibold">
                        {i + 1}. {p.name}
                      </p>
                      <p className="text-xs text-muted">
                        <span className="text-orange">★</span> {p.rating} ({p.reviews} reviews). {p.why}
                      </p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            {/* Message box and home bar */}
            <div aria-hidden="true" className="border-t border-line bg-white px-3.5 pb-2 pt-2.5">
              <div className="flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[13px] text-muted">
                Ask anything
                <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-navy text-white">
                  <Icon name="arrow" className="h-3.5 w-3.5 -rotate-90" />
                </span>
              </div>
              <span className="mx-auto mt-3 block h-1 w-28 rounded-full bg-ink" />
            </div>
          </div>
        </div>
      </div>
      {/* Pops up over the empty part of the screen, like a notification. */}
      <figcaption className="relative z-10 -mt-60 mx-[-0.75rem] flex items-start gap-3 rounded-xl border-2 border-orange bg-white p-4 shadow-xl sm:mx-[-1.5rem]">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange text-lg font-bold text-white">!</span>
        <span>
          <strong className="block font-display text-xl text-navy">Your business isn&apos;t on the list.</strong>
          <span className="text-sm text-muted">The customer calls one of these three instead. (Example businesses, not real ones.)</span>
        </span>
      </figcaption>
    </figure>
  );
}

/** Numbered steps joined by orange arrows; across on desktop, top to bottom on phones. */
export function StepFlow({
  steps,
}: {
  steps: { title: string; body: string; icon: IconName; badge?: string; preview?: React.ReactNode }[];
}) {
  const cols = steps.length === 4 ? "lg:grid-cols-4" : "md:grid-cols-3";
  return (
    <Reveal as="ol" className={`relative mt-10 grid gap-10 ${cols} md:gap-8`}>
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex flex-col">
          {i < steps.length - 1 && <FlowArrow />}
          <div className="relative flex items-center gap-3">
            <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-orange text-white shadow-md">
              <Icon name={s.icon} className="h-7 w-7" />
            </span>
            <span className="font-display text-sm font-bold uppercase tracking-[0.18em] text-orange">Step {i + 1}</span>
            {s.badge && <span className="rounded-full bg-navy px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-white">{s.badge}</span>}
          </div>
          <h3 className="mt-3 font-display text-2xl font-bold text-navy">{s.title}</h3>
          <p className="mt-1 text-muted">{s.body}</p>
          {s.preview && <div className="mt-4">{s.preview}</div>}
        </li>
      ))}
    </Reveal>
  );
}

function FlowArrow() {
  return (
    <>
      {/* Desktop: arrow in the gap before the next step. Phone: line down to the next step. */}
      <span aria-hidden="true" className="absolute right-[-1.85rem] top-4 hidden md:block">
        <Icon name="arrow" className="h-6 w-6 text-orange" />
      </span>
      <span aria-hidden="true" className="absolute bottom-[-2.5rem] left-7 top-16 w-0.5 bg-gradient-to-b from-orange to-orange/20 md:hidden" />
    </>
  );
}

/** Small "what you get" previews used in the homepage steps. */
export function AuditPreview() {
  return (
    <div className="rounded-lg border border-line bg-white p-4 text-sm shadow-sm">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-navy">Your online audit</span>
        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-800">FREE</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        <li className="flex gap-2"><Icon name="check" className="h-4 w-4 text-green-700" /> Website works on phones</li>
        <li className="flex gap-2"><Icon name="check" className="h-4 w-4 text-green-700" /> 4.8★ on Google</li>
        <li className="flex gap-2 text-red-700"><span className="w-4 text-center font-bold">!</span> Not named by AI assistants</li>
        <li className="flex gap-2 text-red-700"><span className="w-4 text-center font-bold">!</span> Missing service-area pages</li>
      </ul>
      {site.auditTurnaround && <p className="mt-3 text-xs text-muted">Delivered {site.auditTurnaround}.</p>}
    </div>
  );
}

export function PlanPreview() {
  return (
    <div className="rounded-lg border border-line bg-white p-4 text-sm shadow-sm">
      <span className="font-semibold text-navy">Your plan</span>
      <ul className="mt-3 space-y-1.5">
        {["Fix Google profile", "Add 3 city pages", "Set up review requests", "GEO for AI answers"].map((t) => (
          <li key={t} className="flex gap-2"><Icon name="check" className="h-4 w-4 text-orange" /> {t}</li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-2 text-xs text-muted">Your domain, hosting and email: paid by you, listed separately.</p>
    </div>
  );
}

export function LaunchPreview() {
  return (
    <div className="flex justify-center">
      <div className="w-40 rounded-[1.25rem] border-[6px] border-navy bg-white shadow-md">
        <div className="space-y-1.5 p-2">
          <div className="flex items-center justify-between">
            <span className="h-2 w-12 rounded bg-navy" />
            <span className="rounded-full bg-green-600 px-1.5 text-[9px] font-bold uppercase text-white">Live</span>
          </div>
          <div className="h-12 rounded bg-gradient-to-br from-navy to-navy-800" />
          <span className="block h-1.5 w-24 rounded bg-line" />
          <span className="block h-1.5 w-20 rounded bg-line" />
          <span className="block h-4 w-full rounded bg-orange" />
          <div className="grid grid-cols-2 gap-1">
            <span className="h-6 rounded bg-navy-50" />
            <span className="h-6 rounded bg-navy-50" />
          </div>
        </div>
      </div>
    </div>
  );
}
