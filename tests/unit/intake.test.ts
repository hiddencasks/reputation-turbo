import { describe, expect, it } from "vitest";
import { clean, initialFields, INTAKE, intakeDef, isComplete, leadChanges, LEGACY_LABELS, parseFields, prefillFromText, summarize, visible, withCities } from "@/lib/projects/intake";

const form = (entries: [string, string][]) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};

describe("client checklist forms", () => {
  it("has unique keys and maps every old label", () => {
    expect(new Set(INTAKE.map((d) => d.key)).size).toBe(INTAKE.length);
    for (const key of Object.values(LEGACY_LABELS)) expect(intakeDef(key)).toBeTruthy();
  });

  it("reads the address form and updates the lead city", () => {
    const def = intakeDef("address")!;
    const f = parseFields(def, form([["f.street", " 4702 Market St "], ["f.unit", "A"], ["f.city", "San Diego"], ["f.state", "CA"], ["f.zip", "92102"], ["f.show", "hide"], ["f.junk", "x"]]));
    expect(f.street).toBe("4702 Market St");
    expect(f.junk).toBeUndefined();
    expect(isComplete(def, f)).toBe(true);
    expect(leadChanges("address", f)).toEqual({ city: "San Diego" });
    expect(summarize(def, f)).toContain("Show this address on Google and your website? No, keep it private and show the areas I serve");
  });

  it("rejects options that aren't on the list", () => {
    const def = intakeDef("address")!;
    expect(parseFields(def, form([["f.state", "XX"]])).state).toBe("");
  });

  it("reads hours dropdowns and only accepts listed times", () => {
    const def = intakeDef("hours")!;
    const f = parseFields(def, form([["f.week.mon.open", "8:00 AM"], ["f.week.mon.close", "5:30 PM"], ["f.week.sun.closed", "on"], ["f.week.tue.open", "3:17 AM"]]));
    const week = f.week as Record<string, { open: string; close: string; closed: boolean }>;
    expect(week.mon).toEqual({ open: "8:00 AM", close: "5:30 PM", closed: false });
    expect(week.tue.open).toBe("");
    expect(isComplete(def, f)).toBe(true);
    expect(summarize(def, f)).toEqual(["Monday: 8:00 AM to 5:30 PM", "Sunday: Closed"]);
  });

  it("hides Facebook questions when the client doesn't want Facebook", () => {
    const def = intakeDef("social")!;
    const f = parseFields(def, form([["f.skip", "on"], ["f.has_page", "on"], ["f.page", "https://facebook.com/x"]]));
    expect(f.has_page).toBe(false);
    expect(f.page).toBe("");
    expect(isComplete(def, f)).toBe(true);
    const create = def.fields!.find((x) => x.name === "create")!;
    expect(visible(create, clean(def, { skip: true }))).toBe(false);
    expect(visible(create, { skip: false, has_page: false })).toBe(true);
  });

  it("needs the invite ticked before the Google item is done", () => {
    const def = intakeDef("google")!;
    expect(isComplete(def, { has: "yes", added: false })).toBe(false);
    expect(isComplete(def, { has: "yes", added: true })).toBe(true);
    expect(isComplete(def, { has: "no" })).toBe(true);
  });

  it("fills the city boxes from the site's cities", () => {
    const def = withCities(intakeDef("areas")!, ["El Cajon", "Santee"]);
    const f = parseFields(def, form([["f.cities", "Santee"], ["f.cities", "Nowhere"], ["f.cities_other", "Del Mar"]]));
    expect(f.cities).toEqual(["Santee"]);
    expect(summarize(def, f)).toEqual(["Cities: Santee, Del Mar"]);
  });

  it("keeps what was typed before the boxes existed", () => {
    expect(prefillFromText("address", "4702 Market St A, San Diego, CA 92102")).toEqual({ street: "4702 Market St A", city: "San Diego", state: "CA", zip: "92102" });
    expect(prefillFromText("contact", "(619) 769-5656 / info@smoggyjoes.com")).toEqual({ phone: "(619) 769-5656", email: "info@smoggyjoes.com" });
    expect(initialFields("address", {}, "", { city: "Santee" })).toEqual({ state: "CA", city: "Santee" });
    expect(initialFields("contact", { phone: "1" }, "old", {})).toEqual({ phone: "1" });
  });
});
