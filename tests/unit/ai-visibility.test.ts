import { describe, expect, it } from "vitest";
import { buildQuestions, placeName, tradePhrase } from "@/lib/ai-visibility/questions";
import { domainStem, heuristicBusinesses, mentions, normalizeName, plainText, tallyCompetitors } from "@/lib/ai-visibility/match";

describe("questions", () => {
  it("turns industry names into natural phrases", () => {
    expect(tradePhrase("Plumbers")).toBe("plumber");
    expect(tradePhrase("HVAC")).toBe("HVAC company");
    expect(tradePhrase("Pool cleaning")).toBe("Pool cleaning");
  });

  it("adds the state to a bare city", () => {
    expect(placeName("El Cajon")).toBe("El Cajon, CA");
    expect(placeName("Phoenix, AZ")).toBe("Phoenix, AZ");
  });

  it("writes customer-style questions", () => {
    expect(buildQuestions("HVAC", "La Mesa")).toEqual([
      "Who is the best HVAC company in La Mesa, CA?",
      "Can you recommend an HVAC company near La Mesa, CA with good reviews?",
      "I need an HVAC company in La Mesa, CA. Who should I call?",
      "What are the top-rated HVAC companies serving La Mesa, CA?",
    ]);
    expect(buildQuestions("Electricians", "Santee")[3]).toBe("What are the top-rated electricians serving Santee, CA?");
    expect(buildQuestions("Pool cleaning", "Santee")[3]).toBe("What are the top-rated Pool cleaning businesses serving Santee, CA?");
  });
});

describe("matching", () => {
  it("normalizes names", () => {
    expect(normalizeName("Lopez Concrete, LLC")).toBe("lopezconcrete");
    expect(normalizeName("A & B Roofing Co.")).toBe("aandbroofing");
  });

  it("reads the website's name", () => {
    expect(domainStem("https://www.lopezconcrete.com/about")).toBe("lopezconcrete");
    expect(domainStem("")).toBe("");
  });

  it("finds the business by name or website", () => {
    expect(mentions("Try **Lopez Concrete Inc.** for driveways.", "Lopez Concrete")).toBe(true);
    expect(mentions("Try Summit Pro for driveways.", "Lopez Concrete")).toBe(false);
    expect(mentions("See lopezconcrete.com for quotes.", "Lopez & Sons", "https://lopezconcrete.com")).toBe(true);
    expect(mentions("ABC Plumbing is good.", "ABC")).toBe(true);
    expect(mentions("The fabcomfort team.", "ABC")).toBe(false);
  });

  it("pulls business names from bold text and lists", () => {
    const answer = "Options:\n1. **Summit Pro Services** - great.\n2. **Canyon Crew** - licensed.\n**Note:** call ahead.";
    expect(heuristicBusinesses(answer)).toEqual(["Summit Pro Services", "Canyon Crew"]);
    expect(heuristicBusinesses("- Valley Standard Co.: fair prices\n- Yelp: reviews")).toEqual(["Valley Standard Co"]);
  });

  it("counts competitors once per answer and leaves out the business itself", () => {
    const answers = [
      { businesses: ["Summit Pro", "Lopez Concrete LLC", "Summit Pro"] },
      { businesses: ["Summit Pro", "Canyon Crew"] },
    ];
    expect(tallyCompetitors(answers, "Lopez Concrete")).toEqual([
      { name: "Summit Pro", count: 2 },
      { name: "Canyon Crew", count: 1 },
    ]);
  });

  it("strips Markdown", () => {
    expect(plainText("## Top\n**Summit** - see [site](https://x.com)")).toBe("Top\nSummit - see site");
  });
});
