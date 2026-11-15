import type { ReactElement } from "react";
import IsAiSendingCustomersToCompetitors from "./is-ai-sending-customers-to-competitors";
import GoogleProfileCostingYouCalls from "./google-profile-costing-you-calls";
import WhatYourReviewsSay from "./what-your-reviews-say";
import SignsYourBusinessIsInvisibleOnline from "./signs-your-business-is-invisible-online";
import WebsiteTurningCustomersAway from "./website-turning-customers-away";
import FoundInOneTownNotTheNext from "./found-in-one-town-not-the-next";
import WhenAiGetsYourBusinessWrong from "./when-ai-gets-your-business-wrong";
import HowFastDoYouAnswerNewLeads from "./how-fast-do-you-answer-new-leads";
import BeforeYouPayForSeo from "./before-you-pay-for-seo";

/** Post bodies by slug. Each post's title, date and summary live in src/lib/blog.ts. */
export const postBodies: Record<string, ReactElement> = {
  "is-ai-sending-customers-to-competitors": <IsAiSendingCustomersToCompetitors />,
  "google-profile-costing-you-calls": <GoogleProfileCostingYouCalls />,
  "what-your-reviews-say": <WhatYourReviewsSay />,
  "signs-your-business-is-invisible-online": <SignsYourBusinessIsInvisibleOnline />,
  "website-turning-customers-away": <WebsiteTurningCustomersAway />,
  "found-in-one-town-not-the-next": <FoundInOneTownNotTheNext />,
  "when-ai-gets-your-business-wrong": <WhenAiGetsYourBusinessWrong />,
  "how-fast-do-you-answer-new-leads": <HowFastDoYouAnswerNewLeads />,
  "before-you-pay-for-seo": <BeforeYouPayForSeo />,
};
