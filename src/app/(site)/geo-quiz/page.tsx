import type { Metadata } from "next";
import { GeoQuiz } from "@/components/forms";
import { aiAssistantList } from "@/lib/site";
import { Container, Eyebrow } from "@/components/ui";

// Leaves time for the audit that can start from the results page.
export const maxDuration = 300;

export const metadata: Metadata = {
  title: "Is AI Recommending Your Business? Take the 1-Minute GEO Quiz",
  description: `7 quick questions to see whether ${aiAssistantList} recommend your business, or your competitors.`,
};

export default function GeoQuizPage() {
  return (
    <section className="bg-navy-50 py-12 sm:py-16">
      <Container className="max-w-3xl">
        <div className="text-center">
          <Eyebrow>Free 1-minute quiz</Eyebrow>
          <h1 className="mt-2 font-display text-4xl font-extrabold italic uppercase leading-[0.95] text-navy sm:text-5xl">
            Is AI recommending you, or your competitor?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
            More customers now ask {aiAssistantList} who to hire. Answer 7 quick questions to see where you stand.
          </p>
        </div>
        <div className="mt-8 rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <GeoQuiz />
        </div>
      </Container>
    </section>
  );
}
