import type { LeadDetails } from "@/lib/leads";
// The client checklist, as simple forms: boxes, dropdowns and checkboxes instead of
// free-text questions, plus step-by-step links for the account steps.
// Pure and browser-safe: the portal form, the server and the tests all use it.

export const OUR_EMAIL = "info@reputationturbo.com";
/** Our Meta business portfolio ID. Clients add it as a Partner so we can help with their Page without a personal profile. */
export const OUR_META_BUSINESS_ID = "1606662894546027";

export type IntakeKind = "answer" | "upload" | "access";

export type Option = { value: string; label: string };

export type Field =
  | { type: "text" | "email" | "tel" | "url" | "textarea"; name: string; label: string; placeholder?: string; help?: string; required?: boolean; showIf?: ShowIf | ShowIf[]; half?: boolean; autoComplete?: string }
  | { type: "select" | "radio"; name: string; label: string; options: Option[]; help?: string; required?: boolean; showIf?: ShowIf | ShowIf[]; half?: boolean }
  | { type: "checkbox"; name: string; label: string; help?: string; showIf?: ShowIf | ShowIf[] }
  | { type: "checkboxes"; name: string; label: string; options: Option[]; help?: string; showIf?: ShowIf | ShowIf[]; other?: boolean }
  | { type: "hours"; name: string; label: string };

/** Show a field only when another field has one of these values (a radio/select value, or "on" for a checkbox). */
export type ShowIf = { field: string; is: string[] };

export type Step = { text: string; link?: { href: string; label: string } };

export type IntakeDef = {
  key: string;
  section: string;
  kind: IntakeKind;
  label: string;
  help: string;
  website?: boolean;
  fields?: Field[];
  steps?: Step[];
  /** When the item counts as done. Without it, a form is done once any field has a value. */
  isDone?: (f: Fields) => boolean;
};

export type HoursDay = { open: string; close: string; closed: boolean };
export type Fields = Record<string, string | string[] | boolean | Record<string, HoursDay>>;

export const DAYS = [
  { id: "mon", label: "Monday" },
  { id: "tue", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thu", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
  { id: "sun", label: "Sunday" },
] as const;

/** "6:00 AM" to "10:00 PM" every 30 minutes. */
export const TIMES: string[] = Array.from({ length: 33 }, (_, i) => {
  const minutes = 6 * 60 + i * 30;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
});

const yes = (f: Fields, name: string) => f[name] === true;
const filled = (f: Fields, name: string) => {
  const v = f[name];
  return Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : v === true;
};

export const STATES: Option[] = ["CA", "AZ", "NV", "OR", "WA", "TX"].map((s) => ({ value: s, label: s }));

export const INTAKE: IntakeDef[] = [
  // ---------- Your business ----------
  {
    key: "business_name", section: "Your business", kind: "answer", label: "Business name",
    help: "Exactly as it should appear everywhere, including on Google.",
    fields: [{ type: "text", name: "name", label: "Business name", required: true, autoComplete: "organization" }],
    isDone: (f) => filled(f, "name"),
  },
  {
    key: "address", section: "Your business", kind: "answer", label: "Business address",
    help: "Where your business is. If you work from home, you can keep the address private and show the areas you serve instead.",
    fields: [
      { type: "text", name: "street", label: "Street address", required: true, autoComplete: "address-line1" },
      { type: "text", name: "unit", label: "Suite or unit (optional)", half: true, autoComplete: "address-line2" },
      { type: "text", name: "city", label: "City", required: true, half: true, autoComplete: "address-level2" },
      { type: "select", name: "state", label: "State", options: STATES, half: true },
      { type: "text", name: "zip", label: "ZIP code", required: true, half: true, autoComplete: "postal-code" },
      { type: "radio", name: "visit", label: "Do customers come to you?", options: [
        { value: "come_to_us", label: "Yes, customers come to my location" },
        { value: "we_go", label: "No, I go to my customers" },
        { value: "both", label: "Both" },
      ] },
      { type: "radio", name: "show", label: "Show this address on Google and your website?", options: [
        { value: "show", label: "Yes, show my address" },
        { value: "hide", label: "No, keep it private and show the areas I serve" },
      ], help: "Most shops show it. Home-based businesses usually keep it private." },
    ],
    isDone: (f) => ["street", "city", "zip"].every((n) => filled(f, n)),
  },
  {
    key: "contact", section: "Your business", kind: "answer", label: "Phone and email for customers",
    help: "What customers should use to reach you. These can be different from your personal ones.",
    fields: [
      { type: "tel", name: "phone", label: "Business phone", required: true, half: true, autoComplete: "tel" },
      { type: "email", name: "email", label: "Business email", half: true, autoComplete: "email" },
      { type: "checkbox", name: "texts", label: "Customers can text this number" },
    ],
    isDone: (f) => filled(f, "phone"),
  },
  {
    key: "hours", section: "Your business", kind: "answer", label: "Business hours",
    help: "Pick open and close times for each day. Same hours most days? Set Monday, then tap \"Copy Monday to Tuesday through Friday\".",
    fields: [
      { type: "hours", name: "week", label: "Hours" },
      { type: "checkboxes", name: "visits", label: "How customers visit", options: [
        { value: "walk_ins", label: "Walk-ins welcome" },
        { value: "appointments", label: "Appointments available" },
        { value: "appointment_only", label: "By appointment only" },
      ] },
      { type: "textarea", name: "holidays", label: "Holidays or special hours (optional)", placeholder: "Closed Thanksgiving and Christmas" },
    ],
    isDone: (f) => {
      const week = f.week;
      return typeof week === "object" && week !== null && !Array.isArray(week) && Object.values(week).some((d) => d.closed || (d.open && d.close));
    },
  },
  {
    key: "services", section: "Your business", kind: "answer", label: "Services and prices",
    help: "List what you offer, one per line. Add prices only if you want them shown.",
    fields: [
      { type: "textarea", name: "list", label: "Services (one per line)", required: true, placeholder: "Smog check, $39.95\nSmog check for older cars, $59.95" },
      { type: "textarea", name: "not_offered", label: "Anything you don't do? (optional)", placeholder: "No diesel trucks" },
      { type: "textarea", name: "specials", label: "Coupons or specials (optional)" },
    ],
    isDone: (f) => filled(f, "list"),
  },
  {
    key: "areas", section: "Your business", kind: "answer", label: "Areas you serve",
    help: "Tick the cities you want customers from.",
    fields: [
      { type: "checkboxes", name: "cities", label: "Cities", options: [], other: true },
    ],
    isDone: (f) => filled(f, "cities") || filled(f, "cities_other"),
  },
  {
    key: "licenses", section: "Your business", kind: "answer", label: "Licenses and certifications",
    help: "We only show what you're OK with.",
    fields: [
      { type: "text", name: "license", label: "License number (optional)", placeholder: "State license or station number" },
      { type: "textarea", name: "other", label: "Certifications, awards or memberships (optional)" },
      { type: "checkbox", name: "none", label: "None to add" },
    ],
  },
  {
    key: "extras", section: "Your business", kind: "answer", label: "Payments, languages and other details",
    help: "Small details customers often ask about.",
    fields: [
      { type: "checkboxes", name: "payments", label: "Payments you accept", options: [
        { value: "cash", label: "Cash" }, { value: "cards", label: "Credit and debit cards" }, { value: "tap", label: "Apple Pay or Google Pay" },
        { value: "checks", label: "Checks" }, { value: "zelle", label: "Zelle" }, { value: "venmo", label: "Venmo" }, { value: "financing", label: "Financing" },
      ] },
      { type: "checkboxes", name: "languages", label: "Languages spoken", options: [
        { value: "english", label: "English" }, { value: "spanish", label: "Spanish" },
      ], other: true },
      { type: "textarea", name: "other", label: "Parking, wait times, or anything else (optional)" },
    ],
  },
  {
    key: "competitors", section: "Your business", kind: "answer", label: "Competitors",
    help: "Two or three businesses you respect or want to beat. Optional, but it helps.",
    fields: [
      { type: "text", name: "one", label: "Competitor 1" },
      { type: "text", name: "two", label: "Competitor 2" },
      { type: "text", name: "three", label: "Competitor 3" },
    ],
  },

  // ---------- Look and feel ----------
  { key: "logo", section: "Look and feel", kind: "upload", label: "Your logo", help: "The best version you have. No logo? Tap \"I've sent everything\" and tell us in a note." },
  { key: "photos", section: "Look and feel", kind: "upload", label: "Photos", help: "10 or more if you can: storefront, sign, work area, equipment, your team, you at work. Phone photos are fine." },
  {
    key: "style", section: "Look and feel", kind: "answer", label: "Colors and websites you like", website: true,
    help: "Optional. Helps us match your style.",
    fields: [
      { type: "text", name: "colors", label: "Colors you like", placeholder: "Blue and white, like our sign" },
      { type: "url", name: "site1", label: "A website you like (optional)", placeholder: "https://" },
      { type: "url", name: "site2", label: "Another website you like (optional)", placeholder: "https://" },
    ],
  },
  {
    key: "reviews", section: "Look and feel", kind: "answer", label: "Customer reviews to share",
    help: "Three to five reviews or quotes you're OK showing. Add the customer's first name if they agreed.",
    fields: [{ type: "textarea", name: "list", label: "Reviews", placeholder: "\"Fast and honest, in and out in 15 minutes.\" Maria" }],
  },

  // ---------- Accounts you own ----------
  {
    key: "domain", section: "Accounts you own", kind: "access", label: "Your website address (domain)", website: true,
    help: "Your website's address, like yourbusiness.com. You buy it in your own name (about $10 a year for a .com) so it's always yours.",
    fields: [
      { type: "radio", name: "has", label: "Do you already own a domain?", options: [
        { value: "yes", label: "Yes, I already own one" },
        { value: "no", label: "No, I'll buy one with the steps below" },
        { value: "help", label: "I'd like help choosing one" },
      ], required: true },
      { type: "text", name: "domain", label: "Your domain", placeholder: "yourbusiness.com", showIf: { field: "has", is: ["yes", "no"] } },
      { type: "textarea", name: "ideas", label: "Names you like (we'll check which are available)", showIf: { field: "has", is: ["help"] } },
      { type: "checkbox", name: "bought", label: "I bought my domain", showIf: { field: "has", is: ["no"] } },
    ],
    steps: [
      { text: "Create a free Cloudflare account with your email.", link: { href: "https://dash.cloudflare.com/sign-up", label: "Sign up at Cloudflare" } },
      { text: "In Cloudflare, open Domain Registration, then Register Domains, and search for the name you want." },
      { text: "Pick one that's available, add your payment card and buy it. A .com is about $10 a year." },
      { text: "Type the domain in the box above and tick \"I bought my domain\"." },
    ],
    isDone: (f) => (f.has === "yes" && filled(f, "domain")) || (f.has === "no" && yes(f, "bought") && filled(f, "domain")) || (f.has === "help" && filled(f, "ideas")),
  },
  {
    key: "hosting", section: "Accounts you own", kind: "access", label: "Website hosting (free)", website: true,
    help: "Your website will live in your free Cloudflare account (the same one as your domain). You add us as a member so we can publish it, and you can remove us any time.",
    fields: [
      { type: "checkbox", name: "account", label: "I have a Cloudflare account" },
      { type: "checkbox", name: "invited", label: `I invited ${OUR_EMAIL} as a member` },
    ],
    steps: [
      { text: "Sign in to Cloudflare (or create a free account).", link: { href: "https://dash.cloudflare.com/", label: "Open Cloudflare" } },
      { text: "Open Manage Account, then Members, and choose Invite." },
      { text: `Enter ${OUR_EMAIL}, choose the Administrator role, and send the invite.` },
      { text: "Tick both boxes above." },
    ],
    isDone: (f) => yes(f, "account") && yes(f, "invited"),
  },
  {
    key: "business_email", section: "Accounts you own", kind: "answer", label: "Business email at your domain", website: true,
    help: "An address like you@yourbusiness.com looks professional and builds trust. It's optional and you pay Google directly, about $7 to $8.40 a month per person.",
    fields: [
      { type: "radio", name: "plan", label: "Do you plan to set up a business email?", options: [
        { value: "yes", label: "Yes, set it up (recommended)" },
        { value: "have", label: "I already have one" },
        { value: "later", label: "Not now" },
        { value: "unsure", label: "Not sure, let's talk" },
      ], required: true },
      { type: "text", name: "addresses", label: "Addresses you'd like", placeholder: "joe@, info@", showIf: { field: "plan", is: ["yes"] } },
    ],
    steps: [{ text: "If yes, we'll walk you through Google Workspace after your domain is ready.", link: { href: "https://workspace.google.com/pricing", label: "See Google Workspace prices" } }],
    isDone: (f) => filled(f, "plan"),
  },
  {
    key: "google", section: "Accounts you own", kind: "access", label: "Google Business Profile",
    help: "Your listing on Google Search and Maps. You stay the owner; you add us as a manager so we can improve it.",
    fields: [
      { type: "radio", name: "has", label: "Do you have a Google Business Profile?", options: [
        { value: "yes", label: "Yes, I have one" },
        { value: "no", label: "No, I don't have one" },
        { value: "unsure", label: "Not sure" },
      ], required: true },
      { type: "url", name: "link", label: "Link to your profile (optional)", placeholder: "Copy it from Google Maps", showIf: { field: "has", is: ["yes"] } },
      { type: "checkbox", name: "added", label: `I added ${OUR_EMAIL} as a manager`, showIf: { field: "has", is: ["yes"] } },
    ],
    steps: [
      { text: "Open your Business Profile while signed in to the Google account that owns it.", link: { href: "https://business.google.com/", label: "Open Google Business Profile" } },
      { text: "Choose the ⋮ menu (or Business Profile settings), then Managers or People and access." },
      { text: `Choose Add, enter ${OUR_EMAIL}, pick Manager, and send the invite.` },
      { text: "No profile yet, or not sure? Pick that answer above and we'll find it or set it up with you." },
    ],
    isDone: (f) => (f.has === "yes" && yes(f, "added")) || f.has === "no" || f.has === "unsure",
  },
  {
    key: "social", section: "Accounts you own", kind: "access", label: "Facebook and Instagram",
    help: "Optional. Facebook requires a personal Facebook account to create or manage a business Page. If you don't have one or don't want Facebook, that's completely fine; just tick that box.",
    fields: [
      { type: "checkbox", name: "skip", label: "I don't use Facebook or Instagram and don't want to" },
      { type: "checkbox", name: "personal", label: "I have a personal Facebook account", showIf: { field: "skip", is: [""] } },
      { type: "checkbox", name: "has_page", label: "I have a Facebook business Page", showIf: { field: "skip", is: [""] } },
      { type: "url", name: "page", label: "Link to your Facebook Page", placeholder: "https://facebook.com/...", showIf: { field: "has_page", is: ["on"] } },
      { type: "checkbox", name: "added", label: "I added Reputation Turbo as a partner", showIf: { field: "has_page", is: ["on"] } },
      { type: "checkbox", name: "has_ig", label: "I have an Instagram account for the business", showIf: { field: "skip", is: [""] } },
      { type: "text", name: "ig", label: "Instagram username", placeholder: "@yourbusiness", showIf: { field: "has_ig", is: ["on"] } },
      { type: "checkbox", name: "create", label: "I don't have a business Page yet. Please help me set one up", showIf: [{ field: "skip", is: [""] }, { field: "has_page", is: [""] }] },
    ],
    steps: [
      { text: "Open Meta Business Suite settings, signed in with the Facebook account that manages your Page.", link: { href: "https://business.facebook.com/settings", label: "Open Business Suite settings" } },
      { text: "Choose Users, then Partners, then Add, then \"Give a partner access to your assets\"." },
      { text: `Type our Business ID, ${OUR_META_BUSINESS_ID} (it shows up as Reputation Turbo), and choose Next.` },
      { text: "Pick your Facebook Page (and your Instagram account if it's listed), turn on access to manage content, messages and insights, and save." },
      { text: "Type your Instagram username above so we can find it." },
      { text: "No business Page yet? If you have a personal Facebook, you can create one in a few minutes, or tick the box above and we'll do it with you.", link: { href: "https://www.facebook.com/pages/create", label: "Create a Facebook Page" } },
    ],
    isDone: (f) => yes(f, "skip") || yes(f, "create") || (yes(f, "has_page") && yes(f, "added")),
  },
  {
    key: "listings", section: "Accounts you own", kind: "answer", label: "Other listings you already have",
    help: "Tick any you have. Links help but aren't required. We'll never ask for a password.",
    fields: [
      { type: "checkboxes", name: "sites", label: "Listings", options: [
        { value: "yelp", label: "Yelp" }, { value: "bing", label: "Bing Places" }, { value: "apple", label: "Apple Maps" }, { value: "nextdoor", label: "Nextdoor" },
        { value: "bbb", label: "BBB" }, { value: "yellowpages", label: "YellowPages" }, { value: "none", label: "None that I know of" },
      ], other: true },
      { type: "textarea", name: "links", label: "Links (optional)" },
    ],
    isDone: (f) => filled(f, "sites") || filled(f, "sites_other"),
  },
];

export function intakeDef(key: string): IntakeDef | undefined {
  return INTAKE.find((d) => d.key === key);
}

/** The "Areas you serve" checkboxes come from the site's city list. */
export function withCities(def: IntakeDef, cities: readonly string[]): IntakeDef {
  if (def.key !== "areas" || !def.fields) return def;
  return { ...def, fields: def.fields.map((f) => (f.type === "checkboxes" && f.name === "cities" ? { ...f, options: cities.map((c) => ({ value: c, label: c })) } : f)) };
}

export function visible(field: Field, f: Fields): boolean {
  if (!("showIf" in field) || !field.showIf) return true;
  const rules = Array.isArray(field.showIf) ? field.showIf : [field.showIf];
  return rules.every((rule) => {
    const v = f[rule.field];
    const value = v === true ? "on" : typeof v === "string" ? v : "";
    return rule.is.includes(value);
  });
}

/** Reads a submitted form into clean fields (only known names, trimmed, capped). */
export function parseFields(def: IntakeDef, data: FormData): Fields {
  const out: Fields = {};
  const str = (name: string, max = 2000) => String(data.get(`f.${name}`) ?? "").trim().slice(0, max);
  for (const field of def.fields ?? []) {
    if (field.type === "checkbox") out[field.name] = data.get(`f.${field.name}`) === "on";
    else if (field.type === "checkboxes") {
      const allowed = new Set(field.options.map((o) => o.value));
      out[field.name] = data.getAll(`f.${field.name}`).map(String).filter((v) => allowed.has(v));
      if (field.other) out[`${field.name}_other`] = str(`${field.name}_other`, 500);
    } else if (field.type === "select" || field.type === "radio") {
      const v = str(field.name, 100);
      out[field.name] = field.options.some((o) => o.value === v) ? v : "";
    } else if (field.type === "hours") {
      const week: Record<string, HoursDay> = {};
      for (const d of DAYS) {
        const pick = (part: string) => {
          const v = str(`${field.name}.${d.id}.${part}`, 20);
          return TIMES.includes(v) ? v : "";
        };
        week[d.id] = { open: pick("open"), close: pick("close"), closed: data.get(`f.${field.name}.${d.id}.closed`) === "on" };
      }
      out[field.name] = week;
    } else out[field.name] = str(field.name, field.type === "textarea" ? 4000 : 300);
  }
  return clean(def, out);
}

/** Clears answers to questions that are hidden (in order, so a hidden question also hides the ones that depend on it). */
export function clean(def: IntakeDef, f: Fields): Fields {
  const out: Fields = { ...f };
  for (const field of def.fields ?? []) {
    if (field.type === "hours" || visible(field, out)) continue;
    out[field.name] = field.type === "checkbox" ? false : field.type === "checkboxes" ? [] : "";
    if (field.type === "checkboxes" && field.other) out[`${field.name}_other`] = "";
  }
  return out;
}

/** What the form starts with: saved answers, else what was typed before the boxes existed, else what we know from the lead. */
export function initialFields(key: string, saved: Fields | undefined, oldAnswer: string, lead: { business_name?: string; city?: string; phone?: string; email?: string }): Fields {
  if (saved && Object.keys(saved).length) return saved;
  const old = prefillFromText(key, oldAnswer);
  if (Object.keys(old).length) return key === "address" ? { state: "CA", ...old } : old;
  if (key === "business_name" && lead.business_name) return { name: lead.business_name };
  if (key === "address") return { state: "CA", city: lead.city ?? "" };
  if (key === "contact") return { phone: lead.phone ?? "", email: lead.email ?? "" };
  return {};
}

export function isComplete(def: IntakeDef, f: Fields): boolean {
  if (def.isDone) return def.isDone(f);
  return Object.entries(f).some(([, v]) => (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim() !== "" : v === true));
}

/** Plain-text summary for the dashboard, one "Label: value" line per answered field. */
export function summarize(def: IntakeDef, f: Fields): string[] {
  const lines: string[] = [];
  for (const field of def.fields ?? []) {
    if (!visible(field, f)) continue;
    const v = f[field.name];
    if (field.type === "hours" && v && typeof v === "object" && !Array.isArray(v)) {
      const week = v as Record<string, HoursDay>;
      for (const d of DAYS) {
        const day = week[d.id];
        if (day?.closed) lines.push(`${d.label}: Closed`);
        else if (day?.open || day?.close) lines.push(`${d.label}: ${day.open || "?"} to ${day.close || "?"}`);
      }
    } else if (field.type === "checkbox") {
      if (v === true) lines.push(`✓ ${field.label}`);
    } else if (field.type === "checkboxes") {
      const picked = (Array.isArray(v) ? v : []).map((x) => field.options.find((o) => o.value === x)?.label ?? x);
      const other = f[`${field.name}_other`];
      if (typeof other === "string" && other) picked.push(other);
      if (picked.length) lines.push(`${field.label}: ${picked.join(", ")}`);
    } else if (field.type === "select" || field.type === "radio") {
      const label = field.options.find((o) => o.value === v)?.label;
      if (label) lines.push(`${field.label} ${label}`);
    } else if (typeof v === "string" && v) lines.push(`${field.label}: ${v}`);
  }
  return lines;
}

/** Best-effort first fill from an answer typed before the checklist had boxes. */
export function prefillFromText(key: string, text: string): Fields {
  const t = text.trim();
  if (!t) return {};
  if (key === "business_name") return { name: t.split("\n")[0].slice(0, 300) };
  if (key === "address") {
    const m = t.match(/^(.+?),\s*([^,]+?),\s*([A-Z]{2})\s+(\d{5})(?:-\d{4})?/);
    if (m) return { street: m[1].trim(), city: m[2].trim(), state: m[3], zip: m[4] };
    return {};
  }
  if (key === "contact") {
    const phone = t.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/)?.[0] ?? "";
    const email = t.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0] ?? "";
    return phone || email ? { phone, email } : {};
  }
  if (key === "services" || key === "reviews") return { list: t };
  return {};
}

/** What the lead should pick up from this answer, if anything. */
/** Lead fields a checklist answer fills in. `details` goes into the lead page's internal Business details box. */
export type LeadChanges = { business_name?: string; city?: string; phone?: string; details?: LeadDetails };

export function leadChanges(key: string, f: Fields): LeadChanges {
  const s = (n: string) => (typeof f[n] === "string" ? (f[n] as string).trim() : "");
  const on = (n: string) => f[n] === true;
  const def = intakeDef(key);
  if (key === "business_name" && s("name")) return { business_name: s("name") };
  if (key === "address") {
    const street = [s("street"), s("unit")].filter(Boolean).join(", ");
    const place = [s("city"), [s("state"), s("zip")].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const address = [street, place].filter(Boolean).join("\n");
    return { ...(s("city") ? { city: s("city") } : {}), ...(address ? { details: { address } } : {}) };
  }
  if (key === "contact" && s("phone")) return { phone: s("phone") };
  if (key === "hours" && def) {
    const hours = summarize(def, f).join("\n");
    return hours ? { details: { hours } } : {};
  }
  if (key === "google" && s("link")) return { details: { googleProfile: s("link") } };
  if (key === "social") {
    const details: LeadDetails = {};
    if (on("has_page") && s("page")) details.facebook = s("page");
    if (on("has_ig") && s("ig")) details.instagram = s("ig");
    return Object.keys(details).length ? { details } : {};
  }
  if (key === "listings" && def) {
    const lines = summarize(def, f).map((l) => l.replace(/^Links \(optional\): /, ""));
    const yelp = s("links").split(/\s+/).find((w) => /yelp\.com\//i.test(w));
    const details: LeadDetails = {};
    if (lines.length) details.otherLinks = lines.join("\n");
    if (yelp) details.yelp = yelp;
    return Object.keys(details).length ? { details } : {};
  }
  return {};
}

/** Old checklist labels, for projects created before the checklist had boxes. */
export const LEGACY_LABELS: Record<string, string> = {
  "Business name": "business_name",
  "Address, and whether customers come to you or you go to them": "address",
  "Phone number and email to show customers": "contact",
  "Business hours": "hours",
  "Services and prices to show": "services",
  "Cities and neighborhoods you want customers from": "areas",
  "Licenses, certifications or awards": "licenses",
  "Payment types, languages spoken, parking and anything else customers ask": "extras",
  "Two or three competitors you respect or want to beat": "competitors",
  "Your logo": "logo",
  "Photos": "photos",
  "Colors you like, and one or two websites you like the look of": "style",
  "Three to five customer reviews or quotes you're OK sharing": "reviews",
  "Domain name": "domain",
  "Website hosting account": "hosting",
  "Google Business Profile": "google",
  "Facebook and Instagram": "social",
  "Other listings you already have": "listings",
  "Do you want a business email at your own domain?": "business_email",
};
