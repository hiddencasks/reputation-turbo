import { A, Callout } from "./parts";

export default function Post() {
  return (
    <>
      <p>
        Almost every business owner I talk to says the same thing: &ldquo;My customers love us, but they never leave reviews.&rdquo;
        Usually that&apos;s not because they don&apos;t want to. It&apos;s because nobody asked at the right moment, in a way that took
        ten seconds.
      </p>
      <p>
        Reviews matter more than ever. They help decide who shows up in the Google map, they&apos;re what customers read before they
        call, and AI assistants like ChatGPT, Claude, Gemini, Perplexity and Copilot lean on them when deciding who to recommend.
        Here&apos;s a simple system for getting more of them, without feeling like a salesman.
      </p>

      <h2>Ask at the happy moment</h2>
      <p>
        The best time to ask is when the customer is happiest: right after the final walk-through, when the AC is blowing cold
        again, or when they say &ldquo;this looks amazing.&rdquo; Wait a week and the excitement fades. Ask in person first, then
        follow up with a text the same day.
      </p>

      <h2>Make it one tap</h2>
      <p>
        Every extra step loses people. Don&apos;t say &ldquo;find us on Google.&rdquo; Send a direct link that opens the review box.
        You&apos;ll find it in your Google Business Profile under &ldquo;Ask for reviews.&rdquo; Save it in your phone so you can text it
        in seconds, and print it as a QR code on your invoices, business cards or a magnet you leave behind.
      </p>

      <h2>What to say</h2>
      <p>Keep it short and personal. Here&apos;s a text you can copy:</p>
      <Callout>
        <p className="italic">
          &ldquo;Hi Linda, thanks again for having us out to fix the fence today. If you have a minute, a quick Google review would
          really help our small business. It takes about 30 seconds: [your link]. Thank you! &mdash; Mike&rdquo;
        </p>
      </Callout>
      <p>
        Mentioning the job jogs their memory. When customers write about the work in their own words, like &ldquo;they replaced our
        fence in La Mesa in one day,&rdquo; that review tells Google and AI assistants exactly what you do and where. Don&apos;t script
        their review, though. Let them say it their way.
      </p>

      <h2>Stay on the right side of Google&apos;s rules</h2>
      <p>A few things feel harmless but can get reviews removed or your profile penalized:</p>
      <ul>
        <li>
          <strong>Don&apos;t offer anything in return.</strong> No discounts, gift cards or raffle entries for reviews.
        </li>
        <li>
          <strong>Don&apos;t only ask the happy ones.</strong> Sending unhappy customers somewhere else and only sending happy ones to
          Google (sometimes called &ldquo;review gating&rdquo;) is against the rules. Ask everyone.
        </li>
        <li>
          <strong>Never buy reviews</strong> or have friends and family post fake ones. Google is good at spotting them, and it&apos;s
          not worth the risk.
        </li>
        <li>
          <strong>Don&apos;t hand customers your tablet.</strong> Google discourages &ldquo;review stations&rdquo; at your business,
          and reviews posted from your own device can look suspicious. Let customers use their own phones.
        </li>
      </ul>

      <h2>Reply to every review</h2>
      <p>
        A quick, genuine reply shows future customers there&apos;s a real person behind the business. For great reviews, say thanks
        and mention the job. For a bad one, don&apos;t argue. Apologize for the experience, keep it short, and offer to talk it
        through by phone or email. A calm reply to a bad review can win more trust than a dozen five-stars.
      </p>

      <h2>Steady beats sudden</h2>
      <p>
        Ten reviews in one week and then nothing for six months looks odd, to customers and to Google. A steady trickle of new
        reviews, a few every month, shows you&apos;re busy and still doing good work. The easiest way to get there is to make asking a
        habit: every finished job, every customer, every time.
      </p>

      <h2>Where do you stand?</h2>
      <p>
        Not sure how your reviews compare with the competition? Our free online audit shows your Google rating and review count next
        to the top three businesses in Maps for your trade and city. And if you missed them, catch up on{" "}
        <A href="/blog/google-business-profile-fixes">9 Google Business Profile fixes</A> and{" "}
        <A href="/blog/does-ai-recommend-your-business">how to check if AI recommends you</A>.
      </p>
    </>
  );
}
