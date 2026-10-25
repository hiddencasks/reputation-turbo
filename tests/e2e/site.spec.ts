import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, db, resetData } from "./helpers";

test.beforeEach(async () => {
  await resetData();
});

const pages = [
  ["/", /Get Found/],
  ["/services", /Pick the help you need/],
  ["/ai-search", /Show up when customers ask AI/],
  ["/about", /Local roots/],
  ["/free-audit", /See how customers see you/],
  ["/contact", /Let's talk/],
  ["/privacy", /Privacy Policy/],
  ["/terms", /Terms of Use/],
  ["/areas", /Local help across San Diego County/],
  ["/areas/el-cajon", /Get found in El Cajon/],
  ["/areas/rancho-san-diego", /Get found in Rancho San Diego/],
] as const;

for (const [path, heading] of pages) {
  test(`page ${path} loads without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }).filter({ hasText: heading }).first()).toBeVisible();
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
  await expect(page.getByText("Please enter your type of business.")).toBeVisible();
  await expect(page.getByText("Please enter a 10-digit phone number, or leave it blank.")).toBeVisible();
  await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
  await expect(page.getByLabel("Phone number")).toHaveValue("(123");
  expect((await db`select count(*)::int as n from leads`)[0].n).toBe(0);
});

async function submitAudit(page: import("@playwright/test").Page, email: string, website = "lopezconcrete.com", path = "/free-audit") {
  await page.goto(path);
  await page.getByLabel("First name").fill("Maria");
  await page.getByLabel("Last name").fill("Lopez");
  await page.getByLabel("Business name").fill("Lopez Concrete");
  await page.getByLabel("Type of business").selectOption("Concrete contractors");
  await page.getByLabel("City you're based in").selectOption("El Cajon");
  await page.getByLabel("Phone number").fill("(619) 555-0100");
  await page.getByLabel("Email address").fill(email);
  if (website) await page.getByLabel("Website", { exact: true }).fill(website);
  else await page.getByLabel("No website yet").check();
  await page.getByLabel("Showing up in AI search").check();
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
  });
  // The background AI check may already have moved it on to Audit Ready.
  expect(["audit_in_progress", "audit_ready"]).toContain(leads[0].stage);
  // The AI check's own email ("owner_ai_check") may also arrive; it has its own test.
  const emails = await db`select template, to_email, status from emails where template <> 'owner_ai_check' order by template`;
  expect(emails.map((e) => e.template)).toEqual(["audit_confirmation", "owner_audit"]);
  expect(emails.every((e) => e.status === "logged" || e.status === "sent")).toBe(true);

  // Same phone, different email casing: treated as the same lead.
  await submitAudit(page, "MARIA@example.com", "");
  expect(await db`select count(*)::int as n from leads`).toEqual([{ n: 1 }]);
  // A repeat request within a day doesn't run (and pay for) a second AI check.
  expect(await db`select count(*)::int as n from ai_checks`).toEqual([{ n: 1 }]);
  const acts = await db`select meta->>'duplicate' as dup from activities where kind = 'audit_form' order by created_at`;
  expect(acts.map((a) => a.dup)).toEqual(["false", "true"]);
  expect((await db`select body from activities where kind = 'audit_form' order by created_at`)[0].body).toContain("Wants help with: Showing up in AI search.");
  // A blank website on the second request does not erase the first one.
  expect((await db`select website_url from leads`)[0].website_url).toBe("https://lopezconcrete.com");
});

test("audit requests from AI search links are tagged in the dashboard", async ({ page }) => {
  await page.goto("/ai-search");
  await expect(page.getByRole("link", { name: "Get Your Free Audit" }).last()).toHaveAttribute("href", "/free-audit?focus=ai-search");
  await submitAudit(page, "maria@example.com", "lopezconcrete.com", "/free-audit?focus=ai-search");
  const [lead] = await db`select source, stage from leads`;
  expect(lead.source).toBe("ai_search");
  // The background AI check may already have moved it on.
  expect(["audit_in_progress", "audit_ready"]).toContain(lead.stage);
  const [act] = await db`select body from activities where kind = 'ai_search'`;
  expect(act.body).toContain("AI search check");
});

test("trade photos open the audit with the trade picked, and phone numbers format as typed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Roofing/ }).click();
  await expect(page).toHaveURL(/\/free-audit\?trade=Roofers/);
  await expect(page.getByLabel("Type of business")).toHaveValue("Roofers");
  await page.getByLabel("Phone number").pressSequentially("6195550123");
  await expect(page.getByLabel("Phone number")).toHaveValue("(619) 555-0123");
  await page.goto("/");
  await page.getByRole("link", { name: "Painters", exact: true }).click();
  await expect(page.getByLabel("Type of business")).toHaveValue("Painters");
  await page.goto("/");
  await page.getByRole("link", { name: "Other", exact: true }).click();
  await expect(page.locator("#trade")).toHaveValue("Other");
  await expect(page.getByLabel("Type of business (other)")).toBeVisible();
});

test("hidden pages redirect to the homepage", async ({ page }) => {
  for (const path of ["/our-work", "/one-sheet"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/$/);
  }
});

test("dropdowns accept a typed answer under Other, and phone is optional", async ({ page }) => {
  await page.goto("/free-audit?package=business-website-launch");
  await expect(page.getByText("Interested in: Business Website Launch")).toBeVisible();
  await page.getByLabel("First name").fill("Sam");
  await page.getByLabel("Business name").fill("Sam's Pools");
  await page.getByLabel("Type of business").selectOption("Other");
  await page.getByLabel("Type of business (other)").fill("Pool service");
  await page.getByLabel("City you're based in").selectOption("Other");
  await page.getByLabel("City you're based in (other)").fill("Alpine");
  await page.getByLabel("Email address").fill("sam@email.com");
  await page.getByLabel("No website yet").check();
  await page.getByRole("button", { name: "Get My Free Audit" }).click();
  await expect(page.getByRole("heading", { name: "Request received" })).toBeVisible();
  const [lead] = await db`select trade, city, phone, website_url from leads`;
  expect(lead).toMatchObject({ trade: "Pool service", city: "Alpine", phone: "" });
  const [act] = await db`select body from activities where kind = 'audit_form'`;
  expect(act.body).toContain("Interested in: Business Website Launch");
});

test("bots filling the hidden field are ignored", async ({ page }) => {
  await page.goto("/free-audit");
  await page.evaluate(() => {
    (document.querySelector('input[name="rt_hp_v2"]') as HTMLInputElement).value = "spam";
  });
  await page.getByLabel("First name").fill("Bot");
  await page.getByLabel("Last name").fill("Bot");
  await page.getByLabel("Business name").fill("Bot Inc");
  await page.getByLabel("Type of business").selectOption("Plumbers");
  await page.getByLabel("City you're based in").selectOption("Santee");
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
  // The automatic AI check moves the lead from Audit In Progress to Audit Ready.
  await expect.poll(async () => (await db`select stage from leads`)[0].stage, { timeout: 30_000 }).toBe("audit_ready");

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();

  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(page.getByText("Review and send the audit for")).toBeVisible();

  // Pipeline board shows the lead in its stage; open it.
  await page.goto("/admin/leads");
  await expect(page.getByRole("region", { name: "Audit Ready" }).getByText("Lopez Concrete")).toBeVisible();
  await page.getByRole("link", { name: "Lopez Concrete" }).first().click();
  await expect(page.getByRole("heading", { name: "Lopez Concrete" })).toBeVisible();

  // Change stage, set follow-up and quote, add a note.
  await page.getByLabel("Stage").selectOption("interested");
  await page.getByLabel("Next follow-up").fill("2026-10-30");
  await page.getByLabel("Quote amount ($)").fill("1497");
  // Lopez Concrete has a website and is rarely named by AI, so Starter plus GEO is suggested; add a monthly plan too.
  await expect(page.getByText("Already has a website")).toBeVisible();
  await page.getByText("Choose one or more...").click();
  await page.getByRole("button", { name: "Use suggested" }).click();
  await page.getByRole("checkbox", { name: "Care" }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Stage changed from Audit Ready to Interested.")).toBeVisible();
  await page.getByLabel("Note").fill("Called, wants a quote for a 5-page site.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called, wants a quote for a 5-page site.")).toBeVisible();
  const [lead] = await db`select stage, next_follow_up::text as f, quote_amount_cents as q, recommended_package as p from leads`;
  expect(lead).toEqual({ stage: "interested", f: "2026-10-30", q: 149700, p: "Starter Online Presence, GEO Setup, AI Visibility Monitoring, Care" });

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

  // Sign out ends the session.
  await page.goto("/admin");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin/leads");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

test("audit requests run an AI check that the owner approves and emails", async ({ page }) => {
  await submitAudit(page, "maria@example.com");

  // The check runs in the background after the confirmation page.
  await expect.poll(async () => (await db`select status from ai_checks`)[0]?.status, { timeout: 30_000 }).toBe("done");
  const [check] = await db`select * from ai_checks`;
  expect(check).toMatchObject({ business_name: "Lopez Concrete", trade: "Concrete contractors", city: "El Cajon", mentioned_count: 1, answer_count: 4 });
  expect(check.questions[0]).toBe("Who is the best concrete contractor in El Cajon, CA?");
  expect(check.competitors[0]).toEqual({ name: "Canyon Crew", count: 4 });
  await expect.poll(async () => (await db`select stage from leads`)[0].stage).toBe("audit_ready");
  // The owner's "ready to review" email is sent right after the check finishes.
  await expect.poll(async () => (await db`select count(*)::int as n from emails where template = 'owner_ai_check'`)[0].n).toBe(1);

  // Not public until approved.
  expect((await page.goto(`/report/${check.report_token}`))?.status()).toBe(404);

  await signIn(page);
  await expect(page.getByText("Review and send the audit for")).toBeVisible();
  await page.getByRole("link", { name: "Lopez Concrete" }).first().click();
  const ai = page.getByRole("region", { name: "Online audit" });
  await expect(ai.getByText("Named in 1 of 4 AI answers")).toBeVisible();
  await expect(ai.getByText("Canyon Crew (4)")).toBeVisible();
  await expect(ai.getByText("Website, Google & contact: 7 of 12 look good.")).toBeVisible();

  // The owner can preview before approving.
  await page.goto(`/report/${check.report_token}`);
  await expect(page.getByText("Preview: only you can see this")).toBeVisible();
  await page.goBack();

  await ai.getByRole("button", { name: "Approve & email to Maria" }).click();
  await expect(ai.getByText(/Emailed .*Link to share/)).toBeVisible();
  const [sent] = await db`select to_email, subject from emails where template = 'ai_report'`;
  expect(sent).toEqual({ to_email: "maria@example.com", subject: "Your free online audit for Lopez Concrete" });
  const [lead] = await db`select stage, next_follow_up from leads`;
  expect(lead.stage).toBe("audit_delivered");
  expect(lead.next_follow_up).not.toBeNull();

  // After approval anyone with the link can see it.
  await page.context().clearCookies();
  await page.goto(`/report/${check.report_token}`);
  await expect(page.getByRole("heading", { name: "Lopez Concrete" })).toBeVisible();
  await expect(page.getByText("Who AI recommends instead")).toBeVisible();
  await expect(page.getByRole("heading", { name: "7 of 12 checks look good" })).toBeVisible();
  await expect(page.getByText("doesn't mention El Cajon").first()).toBeVisible();
  await expect(page.getByText("Preview: only you can see this")).toHaveCount(0);
  await page.getByText("Didn't name you").first().click();
  await expect(page.getByText("Businesses named: Summit Pro Services, Canyon Crew, Valley Standard Co").first()).toBeVisible();
});

test("owner adds an outreach prospect and its AI check runs", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/leads");
  await page.getByText("Add a prospect for outreach").click();
  const form = page.getByRole("form", { name: "Add a prospect" });
  await form.getByRole("button", { name: "Add prospect" }).click();
  await expect(form.getByText("Please enter your business name.")).toBeVisible();

  await form.getByLabel("Business name").fill("Santee Rooter");
  await form.getByLabel("Type of business").fill("Plumbers");
  await form.getByLabel("City").fill("Santee");
  await form.getByRole("button", { name: "Add prospect" }).click();
  await expect(page.getByRole("heading", { name: "Santee Rooter" })).toBeVisible();
  // The page refreshes itself until the check finishes.
  await expect(page.getByText("Named in 1 of 4 AI answers", { exact: true })).toBeVisible({ timeout: 30_000 });
  const [lead] = await db`select source, stage, email, trade, city from leads`;
  expect(lead).toEqual({ source: "outreach", stage: "new_prospect", email: "", trade: "Plumbers", city: "Santee" });

  // No email on file: only the link can be approved.
  await expect(page.getByRole("button", { name: /Approve & email/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Approve link only" }).click();
  await expect(page.getByText("Approved. Link to share:")).toBeVisible();

  await page.getByRole("button", { name: "Turn on monthly tracking" }).click();
  await expect(page.getByText("Monthly tracking is on")).toBeVisible();
});

test("the scheduled job requires its secret", async ({ request }) => {
  expect((await request.get("/api/cron/ai-checks")).status()).toBe(401);
  const res = await request.get("/api/cron/ai-checks", { headers: { authorization: "Bearer test-cron-secret" } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ queued: 0, processed: 0 });
});

test("city pages, llms.txt and the sitemap help AI tools find the business", async ({ page, request }) => {
  expect((await request.get("/areas/los-angeles")).status()).toBe(404);

  await page.goto("/areas/santee");
  await expect(page.getByText("Questions Santee customers ask AI:")).toBeVisible();
  const structured = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(structured.some((j) => j.includes('"FAQPage"') && j.includes("Do you work with businesses in Santee?"))).toBe(true);
  expect(structured.some((j) => j.includes('"areaServed":{"@type":"City","name":"Santee, CA"}'))).toBe(true);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Common questions" })).toBeVisible();
  await page.getByRole("link", { name: "La Mesa", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Get found in La Mesa" })).toBeVisible();

  const llms = await request.get("/llms.txt");
  expect(llms.headers()["content-type"]).toContain("text/plain");
  const text = await llms.text();
  expect(text).toMatch(/^# Reputation Turbo/);
  expect(text).toContain("- GEO Setup:");
  expect(text).not.toContain("$"); // prices stay hidden until "Show prices" is on
  expect(text).toContain("/areas/el-cajon");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/areas/spring-valley</loc>");
});
