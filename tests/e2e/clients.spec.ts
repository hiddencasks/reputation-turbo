import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, db, resetData } from "./helpers";

test.beforeEach(async () => {
  await resetData();
});

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}

async function addLead(email = "joe@example.com"): Promise<string> {
  const [lead] = await db`
    insert into leads (first_name, last_name, business_name, email, source, stage, recommended_package, trade, city)
    values ('Joe', 'Test', 'Smoggy Test Shop', ${email}, 'manual', 'interested', 'Business Website Launch', 'Smog check', 'El Cajon')
    returning id`;
  return lead.id;
}

test("owner runs a client project with timers, and the client fills in the portal", async ({ page, browser }, testInfo) => {
  // A different address per run: link requests are limited to one per address every 2 minutes.
  const email = `joe-${testInfo.project.name}@example.com`;
  const leadId = await addLead(email);
  await signIn(page);
  await page.goto(`/admin/leads/${leadId}`);
  await expect(page.getByLabel("Package")).toHaveValue("Business Website Launch");
  await page.getByRole("button", { name: "Start client project" }).click();
  await expect(page).toHaveURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Smoggy Test Shop" })).toBeVisible();
  expect((await db`select stage from leads where id = ${leadId}`)[0].stage).toBe("won");

  // All 19 steps for a website package, and the estimate from the package.
  await expect(page.locator("li[id^=step-]")).toHaveCount(19);
  await expect(page.getByText("Estimate 10 to 14 h")).toBeVisible();

  // Timer: start on step 1, then starting step 2 stops step 1.
  const step1 = page.locator("#step-1");
  await step1.getByRole("button", { name: "Start timer" }).click();
  await expect(step1.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(page.getByText(/Timer running on/)).toBeVisible();
  const step2 = page.locator("#step-2");
  await step2.getByRole("button", { name: "Start timer" }).click();
  await expect(step2.getByRole("button", { name: "Stop" })).toBeVisible();
  await expect(step1.getByRole("button", { name: "Start timer" })).toBeVisible();
  await step2.getByRole("button", { name: "Stop" }).click();
  await expect(page.getByText(/Timer running on/)).toHaveCount(0);
  expect((await db`select count(*)::int as n from time_entries where ended_at is null`)[0].n).toBe(0);

  // Time typed in by hand.
  const step3 = page.locator("#step-3");
  await step3.getByText(/Time entries/).click();
  await step3.getByLabel("Time").fill("lots");
  await step3.getByRole("button", { name: "Add time" }).click();
  await expect(step3.getByText("Enter time like 45, 1:30 or 1h 30m.")).toBeVisible();
  await step3.getByLabel("Time").fill("1:30");
  await step3.getByLabel("What for (optional)").fill("Kickoff call with Joe");
  await step3.getByRole("button", { name: "Add time" }).click();
  await expect(step3.getByText("1 h 30 min").first()).toBeVisible();
  await expect(page.getByText(/^1 h 3\d min$/).first()).toBeVisible();

  // Waiting on the client.
  const step4 = page.locator("#step-4");
  await step4.getByLabel("Status").selectOption("waiting");
  await step4.getByRole("button", { name: "Set" }).click();
  await expect(step4.getByText("Waiting on client", { exact: true }).first()).toBeVisible();

  // Invite the client.
  await page.getByRole("button", { name: "Email the invite" }).click();
  await expect(page.getByText(/Invite sent/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send the link again" })).toBeVisible({ timeout: 10_000 });
  expect((await db`select count(*)::int as n from emails where template = 'portal_invite' and to_email = ${email}`)[0].n).toBe(1);
  const link = await page.getByLabel("Portal link").inputValue();
  expect(link).toMatch(/\/portal\/open\/[0-9a-f]{48}$/);

  // The client opens the link in their own browser.
  const client = await (await browser.newContext()).newPage();
  await client.goto(new URL(link).pathname);
  await expect(client.getByRole("heading", { name: "Hi Joe!" })).toBeVisible();
  await expect(client.getByText(/^0 of \d+ done$/)).toBeVisible();
  await expect(client.getByText("Intake").first()).toBeVisible();

  await client.getByLabel("Business hours").fill("Mon to Sat, 8 to 6. Walk-ins welcome.");
  await client.getByRole("article").filter({ hasText: "Business hours" }).getByRole("button", { name: "Save" }).click();
  await expect(client.getByText(/^1 of \d+ done$/)).toBeVisible();

  const photos = client.getByRole("article").filter({ hasText: "Photos" });
  await photos.getByLabel("Add files for Photos").setInputFiles({ name: "storefront.jpg", mimeType: "image/jpeg", buffer: Buffer.from("fake image bytes") });
  await expect(photos.getByRole("button", { name: "Remove" })).toHaveCount(1);
  await expect(photos.getByText("storefront.jpg")).toHaveCount(1);
  await photos.getByRole("button", { name: "I've sent everything for this" }).click();
  await expect(client.getByText(/^2 of \d+ done$/)).toBeVisible();
  await expect.poll(async () => (await db`select count(*)::int as n from emails where template = 'owner_portal_update'`)[0].n).toBe(1);

  // A portal session never opens the dashboard.
  await client.goto("/admin");
  await expect(client).toHaveURL(/\/admin\/login$/);

  // Back in the dashboard: the answer, the file and the checklist count.
  await page.reload();
  await expect(page.getByText("2 of", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "storefront.jpg" })).toBeVisible();
  const file = await page.request.get(await page.getByRole("link", { name: "storefront.jpg" }).getAttribute("href") as string);
  expect(await file.text()).toBe("fake image bytes");
  await expect(page.locator("textarea").filter({ hasText: "Walk-ins welcome" })).toHaveCount(1);

  // Time log download.
  const csv = await (await page.request.get(page.url() + "/time-log")).text();
  expect(csv).toContain("Kickoff call");
  expect(csv).toMatch(/Total,.*,9\d,/);

  // Resetting the link signs the client out.
  await page.getByRole("button", { name: "Reset link (the old one stops working)" }).click();
  await expect(page.getByLabel("Portal link")).not.toHaveValue(link);
  await client.goto("/portal");
  await expect(client.getByRole("heading", { name: "Your client page" })).toBeVisible();
  await client.goto(new URL(link).pathname);
  await expect(client.getByText("That link doesn't work anymore.")).toBeVisible();
  await client.getByLabel("Your email").fill(email);
  await client.getByRole("button", { name: "Email me my link" }).click();
  await expect(client.getByText("If we have a project for that email")).toBeVisible();
  expect((await db`select count(*)::int as n from emails where template = 'portal_link'`)[0].n).toBe(1);

  await expect(page.getByRole("link", { name: "Clients", exact: true })).toBeVisible();
  await page.goto("/admin/clients");
  await expect(page.getByRole("link", { name: /Smoggy Test Shop/ })).toBeVisible();
});

test("packages without a website skip the website steps", async ({ page }) => {
  const leadId = await addLead();
  await signIn(page);
  await page.goto(`/admin/leads/${leadId}`);
  await page.getByLabel("Package").selectOption("GEO Setup");
  await page.getByRole("button", { name: "Start client project" }).click();
  await expect(page).toHaveURL(/\/admin\/clients\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Smoggy Test Shop" })).toBeVisible();
  await expect(page.locator("li[id^=step-]")).toHaveCount(12);
  await expect(page.getByText("Design and build the website")).toHaveCount(0);
});
