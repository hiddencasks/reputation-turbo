import { describe, expect, it } from "vitest";
import { QUIZ, quizBand, quizScore, quizSummary } from "@/lib/quiz";

describe("GEO quiz", () => {
  it("scores one point per yes", () => {
    expect(quizScore({ named: "yes", reviews: "yes", listings: "no", competitors: "unsure" })).toBe(2);
    expect(quizScore(Object.fromEntries(QUIZ.map((q) => [q.id, "yes"])))).toBe(QUIZ.length);
  });

  it("puts scores in bands", () => {
    expect(quizBand(7).title).not.toBe(quizBand(4).title);
    expect(quizBand(4).title).not.toBe(quizBand(1).title);
  });

  it("summarizes the gaps for the dashboard", () => {
    const answers = Object.fromEntries(QUIZ.map((q) => [q.id, "yes"]));
    answers.named = "no";
    const s = quizSummary(answers);
    expect(s).toContain("6 of 7");
    expect(s).toContain("ChatGPT");
  });
});
