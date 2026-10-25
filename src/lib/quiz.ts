/** The GEO quiz at /geo-quiz. "Yes" is always the healthy answer; the score is the number of yeses. */
export type QuizAnswer = "yes" | "no" | "unsure";

export const QUIZ = [
  {
    id: "named",
    short: "named by ChatGPT",
    question: "When you ask ChatGPT for your kind of business in your city, does it name you?",
    fix: "AI assistants don't name you yet, so customers who ask them hear about your competitors instead.",
  },
  {
    id: "competitors",
    short: "knows who AI names instead",
    question: "Do you know which competitors AI names instead of you, and why?",
    fix: "Knowing who gets named and what they do differently shows exactly what to fix first.",
  },
  {
    id: "reviews",
    short: "recent Google review",
    question: "Did you get a new Google review in the last 30 days?",
    fix: "Recent reviews that mention the job and the city are what AI assistants quote when they recommend a business.",
  },
  {
    id: "listings",
    short: "listings match",
    question: "Is your business name, address and phone exactly the same on Google, Yelp, Bing, Apple Maps and Facebook?",
    fix: "Listings that don't match make AI tools less sure you're one business, so they skip you.",
  },
  {
    id: "service_pages",
    short: "service and city pages",
    question: "Does your website have a page for each service that names the cities you serve?",
    fix: "Service and city pages are how Google and AI connect you to searches like \"patio contractor in Santee\".",
  },
  {
    id: "structured_data",
    short: "structured data",
    question: "Does your website include structured business data that AI tools read directly?",
    fix: "Structured data spells out your services, area and hours in a format Google and AI read directly. Most local sites don't have it.",
  },
  {
    id: "consistent_ai",
    short: "same answer in every AI",
    question: "Do Gemini, Perplexity and Claude give the same answer as ChatGPT about you?",
    fix: "Each assistant uses different sources, so showing up in one doesn't mean you show up in the others.",
  },
] as const;

export type QuizId = (typeof QUIZ)[number]["id"];

export function quizScore(answers: Record<string, string>): number {
  return QUIZ.filter((q) => answers[q.id] === "yes").length;
}

export function quizBand(score: number): { title: string; body: string } {
  if (score >= 6) return { title: "You're ahead of most local businesses", body: "A full audit shows where you still lose customers to competitors, and how to stay ahead." };
  if (score >= 3) return { title: "AI finds you sometimes, but not reliably", body: "Competitors with stronger profiles are likely getting named first. The gaps below are where to start." };
  return { title: "AI assistants likely don't recommend you yet", body: "The good news: everything below can be fixed, and most of your competitors haven't fixed it either." };
}

/** One line per non-yes answer, for the lead's history and the owner's email. */
export function quizSummary(answers: Record<string, string>): string {
  const gaps = QUIZ.filter((q) => answers[q.id] !== "yes").map((q) => `${q.short} (${answers[q.id] === "no" ? "no" : "not sure"})`);
  return `Scored ${quizScore(answers)} of ${QUIZ.length} on the GEO quiz.${gaps.length ? ` Gaps: ${gaps.join(", ")}.` : ""}`;
}
