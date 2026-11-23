"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { agreementText, welcomeParagraphs, type AgreementInput } from "@/lib/projects/agreement";
import type { WelcomeState } from "./actions";

type Props = {
  action: (prev: WelcomeState, formData: FormData) => Promise<WelcomeState>;
  base: Omit<AgreementInput, "priceCents" | "chargedCents" | "date">;
  email: string;
  firstName: string;
  ownerFirstName: string;
  link: string;
  bookingUrl: string;
  defaultPrice: string;
  defaultCharged: string;
  sent: boolean;
};

const cents = (v: string) => (/^\d+(\.\d{0,2})?$/.test(v.trim()) ? Math.round(Number(v) * 100) : null);

/** Welcome email + agreement, filled in from the lead, with a live preview of exactly what gets sent. */
export function WelcomeForm({ action, base, email, firstName, ownerFirstName, link, bookingUrl, defaultPrice, defaultCharged, sent }: Props) {
  const [state, formAction] = useActionState(action, { error: "" });
  const [price, setPrice] = useState(defaultPrice);
  const [charged, setCharged] = useState(defaultCharged);
  const [withAgreement, setWithAgreement] = useState(true);
  const input = "mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal";
  const text = agreementText({ ...base, priceCents: cents(price), chargedCents: cents(charged), date: new Date() });
  const welcome = welcomeParagraphs({ firstName, businessName: base.businessName, ownerFirstName, ourName: base.ourName, link, bookingUrl, hasAgreement: withAgreement });

  return (
    <form action={formAction} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-semibold">Client email
          <input type="email" name="email" required defaultValue={email} className={input} />
        </label>
        <label className="text-sm font-semibold">Package value ($)
          <input name="price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
        </label>
        <label className="text-sm font-semibold">You&apos;re charging ($)
          <input name="charged" inputMode="decimal" value={charged} onChange={(e) => setCharged(e.target.value)} className={input} />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="agreement" checked={withAgreement} onChange={(e) => setWithAgreement(e.target.checked)} />
        Include the project agreement (the client reads it and taps &quot;I agree&quot; in their portal)
      </label>
      <details className="rounded-md bg-navy-50 p-3 text-sm">
        <summary className="cursor-pointer font-semibold text-navy">Preview the email{withAgreement ? " and agreement" : ""}</summary>
        <div className="mt-2 space-y-2 rounded bg-white p-3">
          {welcome.map((p, i) => <p key={i} className="break-words">{p}</p>)}
        </div>
        {withAgreement && <pre className="mt-3 whitespace-pre-wrap rounded bg-white p-3 font-sans">{text}</pre>}
      </details>
      <SubmitButton pendingText="Sending…" className="rounded-md bg-orange px-4 py-2 font-semibold text-white">
        {sent ? "Send the welcome email again" : "Send welcome email"}
      </SubmitButton>
      {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}
