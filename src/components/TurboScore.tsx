import type { TurboScore } from "@/lib/audit/checks";
import { Eyebrow } from "@/components/ui";

/** One line that says what the Turbo Score is, used under the name wherever it appears. */
export const turboScoreExplainer = "How easy it is for customers, Google and AI to find and recommend you.";

/** The big 0-100 Turbo Score card with the parts it's made of, shown at the top of the audit report. */
export function TurboScoreCard({ result, businessName }: { result: TurboScore; businessName: string }) {
  const { score, parts, weakest } = result;
  return (
    <div>
      <div className="grid items-center gap-6 rounded-xl bg-navy p-6 text-white sm:grid-cols-[auto_1fr] sm:gap-8 sm:p-8">
        <div
          className="grid h-40 w-40 place-items-center rounded-full"
          style={{ background: `conic-gradient(var(--color-orange) 0 ${score}%, rgb(255 255 255 / 0.15) ${score}% 100%)` }}
          role="img"
          aria-label={`Turbo Score: ${score} out of 100`}
        >
          <div className="grid h-[8.25rem] w-[8.25rem] place-items-center rounded-full bg-navy text-center">
            <div>
              <p className="font-display text-6xl font-extrabold leading-none">{score}</p>
              <p className="text-sm text-white/60">out of 100</p>
            </div>
          </div>
        </div>
        <div>
          <Eyebrow>Your Turbo Score</Eyebrow>
          <h2 className="mt-1 font-display text-3xl font-extrabold italic uppercase sm:text-4xl">{businessName}</h2>
          <p className="mt-2 text-white/85">{turboScoreExplainer}</p>
          {weakest && (
            <p className="mt-3">
              <span className="rounded-full bg-orange/15 px-3 py-1 text-sm font-bold text-orange">Biggest gap: {weakest.label}</span>
            </p>
          )}
        </div>
      </div>
      <h3 className="mt-8 font-display text-2xl font-bold text-navy">Here&apos;s what makes up your score</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {parts.map((p) => (
          <div key={p.id} className="rounded-lg border border-line p-4">
            <p className="font-display text-lg font-bold uppercase text-navy">{p.label}</p>
            <p className="font-display text-3xl font-extrabold text-navy">
              {p.points}
              <span className="text-base text-muted"> / {p.max}</span>
            </p>
            <div className="mt-1 h-1.5 rounded bg-navy-50" aria-hidden="true">
              <div className="h-1.5 rounded bg-orange" style={{ width: `${(p.points / p.max) * 100}%` }} />
            </div>
            <p className="mt-2 text-sm text-muted">{p.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
