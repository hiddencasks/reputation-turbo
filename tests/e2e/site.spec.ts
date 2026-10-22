import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, db, resetData } from "./helpers";

test.beforeEach(async () => {
  await resetData();
});

const pages = [
  ["/", /Get Found/],
  ["/services", /Pick the help you need/],
  ["/about", /A local agency/],
  ["/our-work", /Projects/],
  ["/free-audit", /See how customers see you/],
  ["/contact", /Let's talk/],
  ["/one-sheet", /What we do/],
  ["/privacy", /Privacy Policy/],
  ["/terms", /Terms of Use/],
] as const;

for (const [path, heading] of pages) {
  test(`page ${path} loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: path === "/one-sheet" ? 2 : 1 }).filter({ hasText: heading }).first()).toBeVisible();
    // No horizontal scrolling on any screen size.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test("audit form shows errors for missing and invalid fields", async ({ page }) => {
  await page.goto("/free-audit");
  await page.getByLabel("Phone number").fill("123");
  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByRole("button", { name: "Get My Free Audit" }).click();
  await expect(page.getByText("Please enter your first name.")).toBeVisible();
  await expect(page.getByText("Please enter a 10-digit phone number.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Phone number")).toHaveValue("123");
  expect((await db`select count(*)::int as n from leads`)[0].n).toBe(0);
});

async function submitAudit(page: import("@playwright/test").Page, email: string, website = "lopezconcrete.com") {
  await page.goto("/free-audit");
  await page.getByLabel("First name").fill("Maria");
  await page.getByLabel("Last name").fill("Lopez");
  await page.getByLabel("Business name").fill("Lopez Concrete");
  await page.getByLabel("Phone number").fill("(619) 555-0100");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel(/Website/).fill(website);
  await page.getByRole("button", { name: "Get My Free Audit" }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
}

test("audit request creates a lead, sends both emails, and merges duplicates", async ({ page }) => {
  await submitAudit(page, "maria@example.com");

  const leads = await db`select * from leads`;
  expect(leads).toHaveLength(1);
  expect(leads[0]).toMatchObject({
    business_name: "Lopez Concrete",
    email: "maria@example.com",
    phone_digits: "6195550100",
    website_url: "https://lopezconcrete.com",
    source: "audit_form",
    stage: "audit_in_progress",
  });
  const emails = await db`select template, to_email, status from emails order by template`;
  expect(emails.map((e) => e.template)).toEqual(["audit_confirmation", "owner_audit"]);
  expect(emails.every((e) => e.status === "logged" || e.status === "sent")).toBe(true);

  // Same phone, different email casing: treated as the same lead.
  await submitAudit(page, "MARIA@example.com", "");
  expect(await db`select count(*)::int as n from leads`).toEqual([{ n: 1 }]);
  const acts = await db`select meta->>'duplicate' as dup from activities order by created_at`;
  expect(acts.map((a) => a.dup)).toEqual(["false", "true"]);
  // A blank website on the second request does not erase the first one.
  expect((await db`select website_url from leads`)[0].website_url).toBe("https://lopezconcrete.com");
});

test("bots filling the hidden field are ignored", async ({ page }) => {
  await page.goto("/free-audit");
  await page.evaluate(() => {
    (document.querySelector('input[name="company_site"]') as HTMLInputElement).value = "spam";
  });
  await page.getByLabel("First name").fill("Bot");
  await page.getByLabel("Last name").fill("Bot");
  await page.getByLabel("Business name").fill("Bot Inc");
  await page.getByLabel("Phone number").fill("6195550111");
  await page.getByLabel("Email address").fill("bot@example.com");
  await page.getByRole("button", { name: "Get My Free Audit" }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  expect(await db`select count(*)::int as n from leads`).toEqual([{ n: 0 }]);
});

test("contact form creates a new-prospect lead", async ({ page }) => {
  await page.goto("/contact");
  await page.getByLabel("First name").fill("Sam");
  await page.getByLabel("Email address").fill("sam@example.com");
  await page.getByLabel("How can we help?").fill("Do you build websites for tree services?");
  await page.getByRole("button", { name: "Send Message" }).click();
  await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
  const [lead] = await db`select stage, source from leads`;
  expect(lead).toEqual({ stage: "new_prospect", source: "contact_form" });
});

test("dashboard requires sign-in and manages leads and pricing", async ({ page }) => {
  await submitAudit(page, "maria@example.com");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();

  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Complete 1 audit request.")).toBeVisible();

  // Pipeline board shows the lead in its stage; open it.
  await page.goto("/admin/leads");
  await expect(page.getByRole("region", { name: "Audit In Progress" }).getByText("Lopez Concrete")).toBeVisible();
  await page.getByRole("link", { name: "Lopez Concrete" }).first().click();
  await expect(page.getByRole("heading", { name: "Lopez Concrete" })).toBeVisible();

  // Change stage, set follow-up and quote, add a note.
  await page.getByLabel("Stage").selectOption("interested");
  await page.getByLabel("Next follow-up").fill("2026-10-30");
  await page.getByLabel("Quote amount ($)").fill("1497");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Stage changed from Audit In Progress to Interested.")).toBeVisible();
  await page.getByLabel("Note").fill("Called, wants a quote for a 5-page site.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called, wants a quote for a 5-page site.")).toBeVisible();
  const [lead] = await db`select stage, next_follow_up::text as f, quote_amount_cents as q from leads`;
  expect(lead).toEqual({ stage: "interested", f: "2026-10-30", q: 149700 });

  // Search and list view.
  await page.goto("/admin/leads?view=list&q=lopez");
  await expect(page.getByRole("cell", { name: "Lopez Concrete" })).toBeVisible();
  await page.goto("/admin/leads?view=list&q=nobody");
  await expect(page.getByText("No leads match.")).toBeVisible();

  // Prices are hidden publicly until turned on.
  await page.goto("/services");
  await expect(page.getByText("$1,497")).toHaveCount(0);
  await page.goto("/admin/pricing");
  await page.getByRole("button", { name: "Show prices on website" }).click();
  await expect(page.getByRole("heading", { name: /Prices on the website: shown/ })).toBeVisible();

  // Edit a price in the dashboard; the website updates.
  await page.getByText("Business Website Launch").first().click();
  const form = page.locator("details[open] form");
  await form.getByLabel("Price ($)").fill("1597");
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator("summary").filter({ hasText: "Business Website Launch" })).toContainText("$1,597");
  await page.goto("/services");
  await expect(page.getByText("Starting at $1,597")).toBeVisible();
  await page.goto("/one-sheet");
  await expect(page.getByText("Starting at $1,597")).toBeVisible();

  // Sign out ends the session.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
