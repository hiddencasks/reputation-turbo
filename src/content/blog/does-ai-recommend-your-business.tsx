import { A, AskExample, Callout } from "./parts";

export default function Post() {
  return (
    <>
      <p>
        Ask a homeowner in El Cajon how they found their last plumber, and you&apos;ll hear more and more of the same answer: &ldquo;I
        asked ChatGPT.&rdquo; Or Claude, Gemini, Perplexity or Copilot. Instead of scrolling through ten blue links, people type a
        question, get back a short list of names, and call one of them.
      </p>
      <p>
        That short list is the new front page. If your business is on it, you get the call. If it isn&apos;t, that customer may never
        know you exist, even if you&apos;ve been doing great work in the neighborhood for twenty years.
      </p>
      <p>The good news: you can find out where you stand today, for free, in about ten minutes. Here&apos;s how.</p>

      <h2>The 10-minute AI test</h2>

      <h3>1. Open a private window</h3>
      <p>
        AI assistants remember things about you. If you&apos;ve ever looked up your own business, the assistant may &ldquo;know&rdquo;
        you&apos;re interested in it and mention you more than it would for a stranger. Use a private or incognito window, and stay
        logged out where you can, so you see roughly what a new customer sees.
      </p>

      <h3>2. Ask the questions your customers ask</h3>
      <p>
        Don&apos;t type your business name. Your customers don&apos;t know it yet. Ask the way a homeowner would, with your trade and
        your city:
      </p>
      <ul className="list-none! space-y-3 pl-0!">
        <AskExample>Who&apos;s the best concrete contractor in El Cajon?</AskExample>
        <AskExample>My water heater is leaking. Who should I call in La Mesa?</AskExample>
        <AskExample>Can you recommend a roofer near Santee with good reviews?</AskExample>
      </ul>
      <p>
        Swap in your own trade and the cities you work in. Try three or four versions: one about price, one about an emergency, one
        about reviews.
      </p>

      <h3>3. Ask all five assistants</h3>
      <p>
        Run the same questions in ChatGPT, Claude, Gemini, Perplexity and Copilot. They don&apos;t share one brain. Each one pulls from
        different sources, so it&apos;s common to be named by one and missing from the other four.
      </p>

      <h3>4. Write down three things</h3>
      <ul>
        <li><strong>Were you named?</strong> Yes or no, for each assistant and each question.</li>
        <li><strong>Who was named instead?</strong> These are the competitors AI trusts more than you right now.</li>
        <li><strong>Was anything wrong?</strong> Old phone number, wrong city, a service you don&apos;t offer, or closed hours.</li>
      </ul>

      <Callout title="Don't panic if the answers change">
        <p>
          Ask the same question twice and you may get a slightly different list. That&apos;s normal. What matters is the pattern: if
          you never show up across a dozen questions, that tells you something.
        </p>
      </Callout>

      <h2>Why AI names some businesses and skips others</h2>
      <p>
        AI assistants don&apos;t pick at random, and you can&apos;t pay to be in their answers. They lean on what the internet already
        says about you, and they recommend businesses they can describe with confidence. That usually comes down to:
      </p>
      <ul>
        <li>
          <strong>Your Google Business Profile.</strong> Correct categories, services, service area, hours and photos.
        </li>
        <li>
          <strong>Your reviews.</strong> How many, how recent, and whether they mention the job and the city.
        </li>
        <li>
          <strong>Your website.</strong> Clear pages that say what you do and where you do it, in plain words.
        </li>
        <li>
          <strong>Consistent details everywhere.</strong> The same business name, address and contact info on Google, Yelp, Bing,
          Apple Maps, Facebook and anywhere else you&apos;re listed.
        </li>
      </ul>
      <p>
        Getting all of that right so AI assistants can find you, trust you and recommend you has a name: GEO, short for generative
        engine optimization. You can read more about it on our <A href="/ai-search">AI search page</A>.
      </p>

      <h2>What to do if you weren&apos;t named</h2>
      <p>Start with the basics. They help with Google and AI answers at the same time:</p>
      <ol>
        <li>Make sure your Google profile is complete and every detail is correct.</li>
        <li>Check that your name, address and contact info match on every site that lists you.</li>
        <li>Make sure your website has a page for each main service that names the cities you serve.</li>
        <li>Ask every happy customer for a review, and reply to the reviews you get.</li>
      </ol>
      <p>
        We&apos;ll go deeper on each of these over the next few weeks, starting with the Google Business Profile fixes most local
        contractors miss.
      </p>

      <h2>Want us to run the test for you?</h2>
      <p>
        Our free online audit asks ChatGPT, Gemini, Perplexity and Claude the questions your customers ask, shows you whether
        you&apos;re named and who&apos;s named instead, and checks your website, Google profile and reviews. A real person reviews every
        audit before it reaches you.
      </p>
    </>
  );
}
