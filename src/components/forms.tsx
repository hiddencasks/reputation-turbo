"use client";

import { useActionState, useState, type FormEvent } from "react";
import type { FormState } from "@/app/(site)/actions";
import { submitAuditRequest, submitContact } from "@/app/(site)/actions";
import { site } from "@/lib/site";
import { formatPhone } from "@/lib/phone";
import { Button } from "./ui";

const initial: FormState = { ok: false, errors: {}, values: {} };

/** Choosing this in a dropdown reveals a text box for the visitor's own answer. */
export const OTHER = "Other";

const inputClass = (error?: string) =>
  `mt-1 block w-full rounded-md border bg-white px-3 py-2.5 text-base text-ink shadow-sm placeholder:text-muted/70 disabled:bg-navy-50 disabled:text-muted ${
    error ? "border-red-600" : "border-line"
  } focus:border-navy`;

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
      {label}
      {required && (
        <span className="text-red-600" aria-hidden="true">
          {" "}*
        </span>
      )}
    </label>
  );
}

function ErrorText({ name, error }: { name: string; error?: string }) {
  return error ? <p id={`${name}-error`} className="mt-1 text-sm font-medium text-red-700">{error}</p> : null;
}

/** Formats a phone number as it's typed, only when the cursor is at the end so mid-number edits don't jump. */
function formatWhileTyping(e: FormEvent<HTMLInputElement>) {
  const input = e.currentTarget;
  if (input.selectionStart !== input.value.length) return;
  input.value = formatPhone(input.value);
}

type FieldProps = {
  name: string;
  label: string;
  state: FormState;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  textarea?: boolean;
  disabled?: boolean;
  defaultValue?: string;
};

function Field({ name, label, state, type = "text", autoComplete, required, placeholder, textarea, disabled, defaultValue }: FieldProps) {
  const error = state.errors[name];
  const common = {
    id: name,
    name,
    required,
    autoComplete,
    placeholder,
    disabled,
    defaultValue: state.values[name] ?? defaultValue ?? "",
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${name}-error` : undefined,
    className: inputClass(error),
  };
  return (
    <div>
      <Label htmlFor={name} label={label} required={required} />
      {textarea ? (
        <textarea {...common} rows={5} />
      ) : (
        <input {...common} type={type} onInput={type === "tel" ? formatWhileTyping : undefined} />
      )}
      <ErrorText name={name} error={error} />
    </div>
  );
}

/** A real dropdown with an "Other" choice that opens a text box. The text box is sent as `${name}Other`. */
function SelectField({
  name,
  label,
  state,
  options,
  required,
  otherPlaceholder,
  defaultChoice,
}: {
  name: string;
  label: string;
  state: FormState;
  options: readonly string[];
  required?: boolean;
  otherPlaceholder: string;
  defaultChoice?: string;
}) {
  const error = state.errors[name];
  const [choice, setChoice] = useState(state.values[name] ?? defaultChoice ?? "");
  const otherName = `${name}Other`;
  return (
    <div>
      <Label htmlFor={name} label={label} required={required} />
      <select
        id={name}
        name={name}
        required={required}
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`${inputClass(error)} ${choice ? "" : "text-muted"}`}
      >
        <option value="" disabled>
          Choose one...
        </option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value={OTHER}>Other</option>
      </select>
      {choice === OTHER && (
        <input
          id={otherName}
          name={otherName}
          aria-label={`${label} (other)`}
          placeholder={otherPlaceholder}
          defaultValue={state.values[otherName] ?? ""}
          autoFocus
          className={inputClass(error)}
        />
      )}
      <ErrorText name={name} error={error} />
    </div>
  );
}

function WebsiteField({ state }: { state: FormState }) {
  const [none, setNone] = useState(state.values.noWebsite === "on");
  return (
    <div>
      <Field name="website" label="Website" state={state} autoComplete="url" placeholder="yourbusiness.com" disabled={none} />
      <label className="mt-2 inline-flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="noWebsite" checked={none} onChange={(e) => setNone(e.target.checked)} className="h-4 w-4 accent-orange" />
        No website yet
      </label>
      {none && <p className="mt-1 text-sm text-muted">No problem. We&apos;ll look at your Google listing and social profiles instead.</p>}
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

function RequiredNote() {
  return (
    <p className="text-sm text-muted">
      <span className="text-red-600">*</span> Required
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

export function AuditForm({ focus, interest, trade }: { focus?: "ai-search"; interest?: string; trade?: string }) {
  const [state, action, pending] = useActionState(submitAuditRequest, initial);
  if (state.ok) {
    return (
      <Success
        title="Request received"
        body={`Thanks! Check your inbox for a confirmation email. We'll review your online presence and send your audit${
          site.auditTurnaround ? ` ${site.auditTurnaround}` : ""
        }, once a person has checked every finding.`}
      />
    );
  }
  return (
    <form action={action} noValidate className="relative space-y-4" aria-label="Free online audit request">
      <Honeypot />
      {focus && <input type="hidden" name="focus" value={focus} />}
      {interest && (
        <>
          <input type="hidden" name="interest" value={interest} />
          <p className="rounded-md bg-navy-50 px-3 py-2 text-sm text-navy">
            Interested in: <strong>{interest}</strong>
          </p>
        </>
      )}
      <RequiredNote />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="First name" state={state} autoComplete="given-name" placeholder="Sam" required />
        <Field name="lastName" label="Last name" state={state} autoComplete="family-name" />
      </div>
      <Field name="businessName" label="Business name" state={state} autoComplete="organization" placeholder="Sam's Concrete, or None" required />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField name="trade" label="Type of business" state={state} options={site.industries} required otherPlaceholder="What kind of business?" defaultChoice={trade} />
        <SelectField name="city" label="City you're based in" state={state} options={site.cities} required otherPlaceholder="Your city" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label="Email address" type="email" state={state} autoComplete="email" placeholder="you@email.com" required />
        <Field name="phone" label="Phone number" type="tel" state={state} autoComplete="tel" placeholder="(619) 555-0123" />
      </div>
      <WebsiteField state={state} />
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

export function ContactForm({ message }: { message?: string }) {
  const [state, action, pending] = useActionState(submitContact, initial);
  if (state.ok) {
    return <Success title="Message sent" body="Thanks for reaching out. We'll get back to you by email shortly." />;
  }
  return (
    <form action={action} noValidate className="relative space-y-4" aria-label="Contact form">
      <Honeypot />
      <RequiredNote />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="firstName" label="First name" state={state} autoComplete="given-name" placeholder="Sam" required />
        <Field name="lastName" label="Last name" state={state} autoComplete="family-name" />
      </div>
      <Field name="businessName" label="Business name" state={state} autoComplete="organization" placeholder="Sam's Concrete" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label="Email address" type="email" state={state} autoComplete="email" placeholder="you@email.com" required />
        <Field name="phone" label="Phone number" type="tel" state={state} autoComplete="tel" placeholder="(619) 555-0123" />
      </div>
      <Field
        name="message"
        label="How can we help?"
        state={state}
        required
        textarea
        placeholder="Tell us what you need help with..."
        defaultValue={message}
      />
      <FormError state={state} />
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
