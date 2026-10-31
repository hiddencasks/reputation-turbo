import { A, AskExample, Callout } from "./parts";

export default function Post() {
  return (
    <>
      <p>
        Ask a homeowner in El Cajon how they found their last plumber, and you&apos;ll hear more and more of the same answer: &ldquo;I
        asked ChatGPT.&rdquo; Or Claude, Gemini, Perplexity or Copilot. Instead of scrolling through ten links, people type a question
        like these:
      </p>
      <ul className="list-none! space-y-3 pl-0!">
        <AskExample>Who&apos;s the best concrete contractor in El Cajon?</AskExample>
        <AskExample>My water heater is leaking. Who should I call in La Mesa?</AskExample>
        <AskExample>Can you recommend a roofer near Santee with good reviews?</AskExample>
      </ul>
      <p>
        What comes back isn&apos;t a page of results. It&apos;s a short list of names, often just three or four, with a sentence about why
        each one is a good pick. The customer calls one of them, and the search is over.
      </p>

      <h2>The new front page has three spots</h2>
      <p>
        On Google, a business on page two still has a small chance. In an AI answer, there is no page two. If you&apos;re not one of the
        few names, that customer may never know you exist, even if you&apos;ve done great work in the neighborhood for twenty years.
      </p>
      <p>
        And here&apos;s the part that stings: the businesses that do get named aren&apos;t always the best ones. They&apos;re the ones AI
        assistants can describe with confidence.
      </p>

      <h2>Why AI names some businesses and skips others</h2>
      <p>
        You can&apos;t pay to be in these answers. AI assistants piece together what the internet already says about you, from dozens
        of places at once, and recommend the businesses where that picture is clear, consistent and trustworthy. When the picture is
        thin, outdated or contradicts itself, they move on to someone else.
      </p>
      <p>
        Each assistant also draws from different sources, so it&apos;s common to be named by one and missing from the others. Making
        sure you show up across all of them has a name: GEO, short for generative engine optimization. You can read more on our{" "}
        <A href="/ai-search">AI search page</A>.
      </p>

      <h2>&ldquo;Can&apos;t I just ask ChatGPT myself?&rdquo;</h2>
      <p>You can, but one question in one app tells you very little, for a few reasons:</p>
      <ul>
        <li>AI assistants remember you. If you&apos;ve looked up your own business before, you may see answers a stranger wouldn&apos;t.</li>
        <li>Answers change from one try to the next, so a single answer can make things look better or worse than they are.</li>
        <li>Your customers ask dozens of different questions, in different cities, in five different assistants.</li>
        <li>Even when you see who&apos;s named instead of you, the answer doesn&apos;t tell you why.</li>
      </ul>

      <Callout title={"The real question isn\u2019t \u201cAm I named?\u201d"}>
        <p>
          It&apos;s &ldquo;Who&apos;s getting named instead of me, and what do they have that I don&apos;t?&rdquo; That&apos;s where the
          useful answers are.
        </p>
      </Callout>

      <h2>Find out where you stand</h2>
      <p>
        Our free online audit asks ChatGPT, Gemini, Perplexity and Claude the kinds of questions your customers ask, shows you whether
        you&apos;re named and who&apos;s named instead, and looks at your website, Google profile and reviews. A real person reviews
        every audit before it reaches you, so you get a clear picture of what&apos;s holding you back.
      </p>
    </>
  );
}
