import { A, Callout } from "./parts";

export default function Post() {
  return (
    <>
      <p>
        Almost every business owner I talk to says the same thing: &ldquo;My customers love us, but they never leave reviews.&rdquo;
        It&apos;s a common problem, and it costs more than most people think.
      </p>
      <p>
        Before a customer ever calls you, your reviews have already made your first impression. And these days they&apos;re not only
        read by people. AI assistants like ChatGPT, Claude, Gemini, Perplexity and Copilot read them too when deciding who to
        recommend.
      </p>

      <h2>What customers notice in five seconds</h2>
      <ul>
        <li>
          <strong>How many you have</strong> compared with the other businesses on the same screen.
        </li>
        <li>
          <strong>How recent they are.</strong> A great review from 2021 says less than a good one from last week.
        </li>
        <li>
          <strong>Whether you reply.</strong> Silence, especially under a bad review, says a lot.
        </li>
        <li>
          <strong>What people actually wrote.</strong> &ldquo;Great job!&rdquo; is nice. A review that describes the job and the
          neighborhood is far more convincing.
        </li>
      </ul>

      <h2>Why it matters for AI answers</h2>
      <p>
        When someone asks an AI assistant for &ldquo;a fence company in La Mesa with good reviews,&rdquo; it looks for businesses whose
        reviews clearly connect them to that job and that place. A business with forty specific, recent reviews is easy to recommend.
        A business with eight reviews from years ago is easy to skip, even if the work is better.
      </p>

      <Callout title="The comparison is what counts">
        <p>
          A 4.8 rating sounds great until the business next to you in the map has a 4.9 with three times as many reviews. Customers
          and AI assistants don&apos;t judge your reviews on their own. They judge them against your competitors&apos;.
        </p>
      </Callout>

      <h2>Shortcuts that backfire</h2>
      <p>When reviews are slow, it&apos;s tempting to take a shortcut. These can get reviews removed or a profile penalized:</p>
      <ul>
        <li>Buying reviews, or having friends and family post ones that aren&apos;t real.</li>
        <li>Offering discounts or gift cards in exchange for reviews.</li>
        <li>Only asking customers you know were happy.</li>
      </ul>
      <p>Getting more reviews the right way takes a steady, simple habit, not a one-time push.</p>

      <h2>How do your reviews stack up?</h2>
      <p>
        Our free online audit shows your Google rating and review count next to the top three businesses in Maps for your trade and
        city, and checks whether AI assistants are naming you. If you missed it, read{" "}
        <A href="/blog/google-profile-costing-you-calls">why your Google profile might be costing you calls</A>.
      </p>
    </>
  );
}
