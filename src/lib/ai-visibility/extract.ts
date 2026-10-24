import "server-only";
import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { anthropic, CLAUDE_MODEL } from "./providers";
import { heuristicBusinesses, mentions } from "./match";

export type Analysis = { businesses: string[]; mentioned: boolean };

const schema = z.object({
  answers: z.array(
    z.object({
      index: z.number().int(),
      businesses: z.array(z.string()),
      names_target: z.boolean(),
    }),
  ),
});

/**
 * Reads each AI answer and lists the businesses it recommends, and whether it
 * names the business being checked. Uses Claude when ANTHROPIC_API_KEY is set;
 * otherwise, or if that call fails, falls back to simple text matching.
 */
export async function analyzeAnswers(
  answers: string[],
  business: { name: string; website: string; trade: string; city: string },
): Promise<Analysis[]> {
  const fallback = answers.map((text) => ({
    businesses: heuristicBusinesses(text),
    mentioned: mentions(text, business.name, business.website),
  }));
  if (!process.env.ANTHROPIC_API_KEY || process.env.AI_CHECK_FAKE === "1" || answers.length === 0) return fallback;

  try {
    const response = await anthropic().beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      messages: [
        {
          role: "user",
          content: [
            `Below are answers AI assistants gave to customers looking for a ${business.trade} in ${business.city}.`,
            `For each answer, list the names of the specific local businesses it recommends or mentions, in the order they appear, exactly as written. Leave out directories and review sites such as Google, Yelp, Angi or the BBB.`,
            `Also say whether the answer names this business: "${business.name}"${business.website ? ` (website ${business.website})` : ""}. Count close variations of the name, such as a missing "LLC" or "Inc.", as naming it.`,
            "",
            ...answers.map((text, index) => `<answer index="${index}">\n${text}\n</answer>`),
          ].join("\n"),
        },
      ],
    });
    const parsed = response.parsed_output;
    if (response.stop_reason === "refusal" || !parsed) return fallback;
    return fallback.map((f, i) => {
      const a = parsed.answers.find((x) => x.index === i);
      return a ? { businesses: a.businesses, mentioned: a.names_target || f.mentioned } : f;
    });
  } catch (err) {
    console.error("[ai-check] analysis failed, using text matching instead:", err);
    return fallback;
  }
}
