"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/(site)/actions";
import { submitAuditRequest, submitContact } from "@/app/(site)/actions";
import { site } from "@/lib/site";
import { Button } from "./ui";

const initial: FormState = { ok: false, errors: {}, values: {} };

type FieldProps = {
  name: string;
  label: string;
  state: FormState;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  textarea?: boolean;
  /** Suggestions shown while typing; any other value is still accepted. */
  suggestions?: readonly string[];
};

function Field({ name, label, state, type = "text", autoComplete, required, hint, placeholder, textarea, suggestions }: FieldProps) {
  const error = state.errors[name];
  const describedBy = [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined;
  const common = {
    id: name,
    name,
    required,
    autoComplete,
    placeholder,
    defaultValue: state.values[name] ?? "",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
    className: `mt-1 block w-full rounded-md border bg-white px-3 py-2.5 text-base text-ink shadow-sm ${
      error ? "border-red-600" : "border-line"
    } focus:border-navy`,
  };
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-ink">
        {label}
        {!required && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {textarea ? <textarea {...common} rows={5} /> : <input {...common} type={type} list={suggestions ? `${name}-options` : undefined} />}
      {suggestions && (
        <datalist id={`${name}-options`}>
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
      {hint && <p id={`${name}-hint`} className="mt-1 text-sm text-muted">{hint}</p>}
      {error && <p id={`${name}-error`} className="mt-1 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}

/** Hidden from people; bots that fill it are ignored. */
function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this empty
        <input type="text" name="company_site" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

function FormError({ state }: { state: FormState }) {
  if (!state.errors.form) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 p-3 text-sm font-medium text-red-800">
      {state.errors.form}
    </p>
  );
}

function Success({ title, body }: { title: string; body: string }) {
  return (
    <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-6">
      <h2 className="font-display text-2xl font-bold text-navy">{title}</h2>
      <p className="mt-2 text-ink">{body}</p>
    </div>
  );
}

export function AuditForm({ focus }: { focus?: "ai-search" }) {
  const [state, action, pending] = useActionState(submitAuditRequest, initial);
  if (state.ok) {
    return (
      <Success
        title="Request received"
        body="Thanks! Check your inbox for a confirmation email. We'll review your online presence and send your audit once a person has checked every finding."
      />
    );
  }
  return (
    <form action={action} noValidate className="relative space-y-4" aria-label="Free online audit request">
      <Honeypot />
      {focus && <input type="hidden" name="focus" value={focus} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="First name" state={state} autoComplete="given-name" required />
        <Field name="lastName" label="Last name" state={state} autoComplete="family-name" required />
      </div>
      <Field name="businessName" label="Business name" state={state} autoComplete="organization" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="trade" label="Type of business" state={state} required placeholder="Plumber, roofer, landscaper..." suggestions={site.industries} />
        <Field name="city" label="City you're based in" state={state} autoComplete="address-level2" required suggestions={site.cities} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="phone" label="Phone number" type="tel" state={state} autoComplete="tel" required />
        <Field name="email" label="Email address" type="email" state={state} autoComplete="email" required />
      </div>
      <Field
        name="website"
        label="Website"
        state={state}
        autoComplete="url"
        placeholder="yourbusiness.com"
        hint="No website yet? Leave it blank and we'll look at your Google listing and social profiles."
      />
      <FormError state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending..." : "Get My Free Audit"}
      </Button>
      <p className="text-xs text-muted">
        We&apos;ll use your details only to prepare and send your audit and to follow up about it. See our{" "}
        <a href="/privacy" className="underline">privacy policy</a>.
      </p>
    </form>
  );
}

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initial);
  if (state.ok) {
    return <Success title="Message sent" body={`Thanks for reaching out. We'll get back to you shortly. For anything urgent, call ${site.phoneDisplay}.`} />;
  }
  return (
    <form action={action} noValidate className="relative space-y-4" aria-label="Contact form">
      <Honeypot />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="First name" state={state} autoComplete="given-name" required />
        <Field name="lastName" label="Last name" state={state} autoComplete="family-name" />
      </div>
      <Field name="businessName" label="Business name" state={state} autoComplete="organization" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label="Email address" type="email" state={state} autoComplete="email" required />
        <Field name="phone" label="Phone number" type="tel" state={state} autoComplete="tel" />
      </div>
      <Field name="message" label="How can we help?" state={state} required textarea />
      <FormError state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
