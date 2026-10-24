// Builds the customer-style questions an AI visibility check asks.

/** How to say one business of each industry in a question ("a plumber", "an HVAC company"). */
const tradePhrases: Record<string, string> = {
  "concrete contractors": "concrete contractor",
  "general contractors": "general contractor",
  landscapers: "landscaper",
  "tree services": "tree service",
  plumbers: "plumber",
  electricians: "electrician",
  hvac: "HVAC company",
  roofers: "roofer",
  painters: "painter",
  flooring: "flooring company",
  fencing: "fencing company",
  cleaning: "cleaning service",
  "pressure washing": "pressure washing company",
};

/** "Plumbers" -> "plumber"; anything not in the list is used as typed. */
export function tradePhrase(trade: string): string {
  const t = trade.trim();
  return tradePhrases[t.toLowerCase()] ?? t;
}

/** "plumber" -> "plumbers"; trades typed in by hand become "<trade> businesses". */
function plural(phrase: string): string {
  if (!Object.values(tradePhrases).includes(phrase)) return `${phrase} businesses`;
  return phrase.endsWith("company") ? `${phrase.slice(0, -1)}ies` : `${phrase}s`;
}

export function withArticle(phrase: string): string {
  return /^[aeiou]/i.test(phrase) || /^HVAC/.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

/** Adds the state so AI tools pick the right city ("El Cajon" -> "El Cajon, CA"). */
export function placeName(city: string): string {
  const c = city.trim();
  return /,\s*[A-Za-z]{2}$/.test(c) ? c : `${c}, CA`;
}

/** The questions a customer would ask an AI assistant when looking for this kind of business. */
export function buildQuestions(trade: string, city: string): string[] {
  const t = tradePhrase(trade);
  const place = placeName(city);
  return [
    `Who is the best ${t} in ${place}?`,
    `Can you recommend ${withArticle(t)} near ${place} with good reviews?`,
    `I need ${withArticle(t)} in ${place}. Who should I call?`,
    `What are the top-rated ${plural(t)} serving ${place}?`,
  ];
}
