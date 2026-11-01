import { describe, expect, it } from "vitest";
import { flagsFor, rankProspects, scoreBusiness, type FoundBusiness } from "@/lib/finder";

const base: FoundBusiness = {
  name: "Summit Pro Services",
  address: "El Cajon, CA",
  website: "https://summitpro.example.com",
  phone: "(619) 555-0101",
  rating: 4.9,
  reviews: 212,
  hasHours: true,
  photos: 10,
  mapsUrl: "",
  rank: 1,
};

describe("prospect finder scoring", () => {
  it("a complete, well-reviewed top result looks solid", () => {
    const s = scoreBusiness(base);
    expect(s.flags).toEqual([]);
    expect(s.verdict).toBe("solid");
  });

  it("flags a missing website, few reviews and a low Maps position", () => {
    const labels = flagsFor({ ...base, website: "", reviews: 4, rating: 4.2, hasHours: false, photos: 1, rank: 8 }).map((f) => f.label);
    expect(labels).toEqual(["No website", "Only 4 reviews", "Rated 4.2", "No hours listed", "Few photos", "#8 on Maps, not top 3"]);
    expect(scoreBusiness({ ...base, website: "", reviews: 4 }).verdict).toBe("strong");
  });

  it("doesn't flag a rating when there are no reviews", () => {
    const labels = flagsFor({ ...base, reviews: 0, rating: undefined }).map((f) => f.label);
    expect(labels).toEqual(["No Google reviews"]);
  });

  it("sorts weakest first and marks businesses already in the leads list", () => {
    const ranked = rankProspects(
      [base, { ...base, name: "Greenfield Brothers LLC", website: "", reviews: 0, rank: 2 }, { ...base, name: "Other Co", website: "https://ridgeline.example.com", reviews: 15, rank: 3 }],
      [
        { id: "lead-1", business_name: "Greenfield Brothers", website_url: "", phone_digits: "" },
        { id: "lead-2", business_name: "Ridgeline", website_url: "https://www.ridgeline.example.com", phone_digits: "" },
      ],
    );
    expect(ranked.map((r) => r.name)).toEqual(["Greenfield Brothers LLC", "Other Co", "Summit Pro Services"]);
    expect(ranked.map((r) => r.existingLeadId)).toEqual(["lead-1", "lead-2", undefined]);
  });
});
