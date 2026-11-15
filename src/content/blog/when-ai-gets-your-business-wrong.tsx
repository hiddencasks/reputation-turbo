import { A, Callout } from "./parts";

export default function Post() {
  return (
    <>
      <p>
        Being left out of an AI answer is bad. Being included with the wrong information can be worse.
      </p>
      <p>
        Imagine a customer asks an AI assistant about your business and hears that you&apos;re closed on Saturdays (you&apos;re not),
        that you don&apos;t serve their city (you do), or gets a phone number you stopped using two years ago. They don&apos;t know
        it&apos;s wrong. They just move on to the next name on the list.
      </p>

      <h2>What AI assistants get wrong about local businesses</h2>
      <ul>
        <li>Old phone numbers, addresses or website links</li>
        <li>Wrong hours, or saying a business has closed</li>
        <li>Services the business doesn&apos;t offer, or missing the ones it does</li>
        <li>Mixing up two businesses with similar names</li>
        <li>Describing the business in a vague way that gives a customer no reason to call</li>
      </ul>

      <h2>Why it happens</h2>
      <p>
        ChatGPT, Claude, Gemini, Perplexity and Copilot build their picture of your business from what&apos;s already out there: your
        website, your Google profile, directory listings, reviews and anything else that mentions you. When those sources disagree,
        or some of them are years out of date, the assistant has to guess. Sometimes it guesses wrong.
      </p>
      <p>
        The tricky part is that you can&apos;t see most of this. An old listing you forgot about, a directory that copied your details
        years ago, or a similarly named business across town can all shape the answer.
      </p>

      <Callout title="Similar names make it worse">
        <p>
          If another business shares part of your name, AI assistants can blend the two together, giving your customers their
          details or their reviews. It&apos;s more common than you&apos;d think, and it&apos;s hard to spot unless you go looking.
        </p>
      </Callout>

      <h2>Signs this might be happening to you</h2>
      <ul>
        <li>A customer mentions something about your business that isn&apos;t true.</li>
        <li>You&apos;ve moved, changed phone numbers or changed your name in the last few years.</li>
        <li>You&apos;ve never checked what Yelp, Bing, Apple Maps and other directories say about you.</li>
        <li>Another business nearby has a name similar to yours.</li>
      </ul>

      <h2>Find out what AI is saying about you</h2>
      <p>
        Our free online audit asks ChatGPT, Gemini, Perplexity and Claude the kinds of questions your customers ask, and shows what
        comes back about your business and who&apos;s named instead. If you missed it, start with{" "}
        <A href="/blog/is-ai-sending-customers-to-competitors">Is AI sending your customers to a competitor?</A>
      </p>
    </>
  );
}
