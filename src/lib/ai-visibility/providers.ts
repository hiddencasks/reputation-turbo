import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Each provider asks one AI assistant a question the way a customer would, with
// web search on, and returns its answer and the web pages it cited. A provider
// is used only when its API key is set.

export type ProviderAnswer = { text: string; sources: string[] };

export type Provider = {
  id: string;
  /** What the report calls it. */
  label: string;
  enabled: () => boolean;
  /** The business name is only used by the test provider; real assistants get the question alone. */
  ask: (question: string, ctx: { businessName: string }) => Promise<ProviderAnswer>;
};

const TIMEOUT_MS = 120_000;

const system =
  "You are a helpful assistant answering a local consumer's question. Search the web, then recommend specific businesses by name, the way you would for any user.";

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: { message?: string } } | null)?.error?.message ?? res.statusText;
    throw new Error(`HTTP ${res.status}: ${message}`);
  }
  return data;
}

const unique = (urls: (string | undefined)[]) => [...new Set(urls.filter((u): u is string => Boolean(u)))].slice(0, 10);

// ---------- ChatGPT (OpenAI Responses API with web search) ----------

type OpenAIResponse = {
  output?: { type: string; content?: { type: string; text?: string; annotations?: { type: string; url?: string }[] }[] }[];
};

const openai: Provider = {
  id: "chatgpt",
  label: "ChatGPT",
  enabled: () => Boolean(process.env.OPENAI_API_KEY),
  async ask(question) {
    const data = (await postJson(
      "https://api.openai.com/v1/responses",
      { authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      { model: process.env.OPENAI_MODEL || "gpt-5", tools: [{ type: "web_search" }], instructions: system, input: question },
    )) as OpenAIResponse;
    const parts = (data.output ?? []).filter((o) => o.type === "message").flatMap((o) => o.content ?? []);
    const texts = parts.filter((c) => c.type === "output_text");
    return {
      text: texts.map((c) => c.text ?? "").join("\n").trim(),
      sources: unique(texts.flatMap((c) => (c.annotations ?? []).map((a) => a.url))),
    };
  },
};

// ---------- Perplexity (Sonar) ----------

type PerplexityResponse = {
  choices?: { message?: { content?: string } }[];
  citations?: string[];
  search_results?: { url?: string }[];
};

const perplexity: Provider = {
  id: "perplexity",
  label: "Perplexity",
  enabled: () => Boolean(process.env.PERPLEXITY_API_KEY),
  async ask(question) {
    const data = (await postJson(
      "https://api.perplexity.ai/chat/completions",
      { authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}` },
      {
        model: process.env.PERPLEXITY_MODEL || "sonar",
        messages: [
          { role: "system", content: system },
          { role: "user", content: question },
        ],
      },
    )) as PerplexityResponse;
    return {
      text: (data.choices?.[0]?.message?.content ?? "").trim(),
      sources: unique([...(data.citations ?? []), ...(data.search_results ?? []).map((r) => r.url)]),
    };
  },
};

// ---------- Gemini (with Google Search grounding) ----------

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    groundingMetadata?: { groundingChunks?: { web?: { uri?: string } }[] };
  }[];
};

const gemini: Provider = {
  id: "gemini",
  label: "Gemini (Google Search)",
  enabled: () => Boolean(process.env.GEMINI_API_KEY),
  async ask(question) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const data = (await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { "x-goog-api-key": process.env.GEMINI_API_KEY ?? "" },
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        tools: [{ google_search: {} }],
      },
    )) as GeminiResponse;
    const candidate = data.candidates?.[0];
    return {
      text: (candidate?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim(),
      sources: unique((candidate?.groundingMetadata?.groundingChunks ?? []).map((c) => c.web?.uri)),
    };
  },
};

// ---------- Claude (Messages API with web search) ----------

let anthropicClient: Anthropic | undefined;
export function anthropic(): Anthropic {
  return (anthropicClient ??= new Anthropic({ timeout: TIMEOUT_MS }));
}

export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

const claude: Provider = {
  id: "claude",
  label: "Claude",
  enabled: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async ask(question) {
    const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: question }];
    let text = "";
    const sources: string[] = [];
    // Web search runs on Anthropic's servers; a long search can pause the turn, so resume a few times.
    for (let i = 0; i < 4; i++) {
      const response = await anthropic().beta.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
        messages,
      });
      for (const block of response.content) {
        if (block.type === "text") {
          text += block.text;
          for (const c of block.citations ?? []) if (c.type === "web_search_result_location") sources.push(c.url);
        }
      }
      if (response.stop_reason === "refusal") throw new Error("Claude declined to answer this question.");
      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }
    return { text: text.trim(), sources: unique(sources) };
  },
};

// ---------- Test provider ----------

/**
 * Deterministic answers for local development and automated tests, turned on
 * with AI_CHECK_FAKE=1. It never calls a real AI service.
 */
const fake: Provider = {
  id: "test",
  label: "Test assistant",
  enabled: () => process.env.AI_CHECK_FAKE === "1",
  async ask(question, { businessName }) {
    const namesTarget = question.startsWith("Who is the best");
    return {
      text: [
        "Here are some well-reviewed options:",
        "1. **Summit Pro Services** - consistently strong reviews.",
        "2. **Canyon Crew** - responsive and licensed.",
        namesTarget ? `3. **${businessName}** - mentioned often by local customers.` : "3. **Valley Standard Co.** - fair pricing.",
      ].join("\n"),
      sources: ["https://example.com/directory"],
    };
  },
};

const all = [openai, gemini, perplexity, claude];

/** The providers a check will use, in report order. With AI_CHECK_FAKE=1 only the test provider runs. */
export function enabledProviders(): Provider[] {
  if (fake.enabled()) return [fake];
  return all.filter((p) => p.enabled());
}

export function providerLabel(id: string): string {
  return [...all, fake].find((p) => p.id === id)?.label ?? id;
}
