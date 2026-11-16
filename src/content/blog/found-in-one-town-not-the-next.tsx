import { A, Callout } from "./parts";

export default function Post() {
  return (
    <>
      <p>
        Here&apos;s a story I hear a lot. A contractor based in El Cajon shows up nicely when someone searches for their trade in El
        Cajon. But search the same thing in Santee, Lakeside or La Mesa, towns they drive to every week, and they&apos;re nowhere to be
        found.
      </p>
      <p>
        If you work across East County or all of San Diego County, that&apos;s a lot of customers who never see you, even though
        you&apos;d happily take the job.
      </p>

      <h2>Why it happens</h2>
      <p>
        Google and AI assistants try to recommend businesses that are clearly connected to the place the customer is searching. Being
        close to that town helps, but it isn&apos;t the whole story. They also look for signs that you really work there, and for most
        small businesses those signs point to just one city: the one on the address.
      </p>
      <p>
        So the business down the road in Santee, with half your experience, gets the Santee customers. Not because they&apos;re better,
        but because everything online says &ldquo;Santee.&rdquo;
      </p>

      <h2>Signs you have this problem</h2>
      <ul>
        <li>Almost all your online leads come from one city, even though you work in many.</li>
        <li>Customers from nearby towns say they found you through a friend, not a search.</li>
        <li>
          When you ask ChatGPT, Claude, Gemini, Perplexity or Copilot for your trade in a nearby city, they name local competitors
          instead of you.
        </li>
        <li>Your website mentions &ldquo;San Diego County&rdquo; but never names the towns you actually serve.</li>
        <li>Your reviews rarely mention where the job was.</li>
      </ul>

      <Callout title="Careful with the shortcuts">
        <p>
          Some businesses try to fix this by listing fake addresses in other towns, or by stuffing dozens of city names onto one page.
          Fake addresses can get your Google profile suspended, and a wall of city names looks like spam to customers and search
          engines alike. Done badly, trying to show up everywhere can make you show up less.
        </p>
      </Callout>

      <h2>Why it matters</h2>
      <p>
        For most trades, the next town over is where the growth is. If you&apos;re only visible where your address is, you&apos;re
        competing for one slice of the county while your competitors split the rest.
      </p>

      <h2>See where you show up</h2>
      <p>
        Our free online audit shows the top three businesses in Maps for your trade and city, and checks whether AI assistants are
        naming you. It&apos;s a quick way to see who&apos;s getting the customers in the towns you want. You can also see the{" "}
        <A href="/areas">areas we serve</A> across San Diego County.
      </p>
    </>
  );
}
