import type { ReactElement } from "react";
import IsAiSendingCustomersToCompetitors from "./is-ai-sending-customers-to-competitors";
import GoogleProfileCostingYouCalls from "./google-profile-costing-you-calls";
import WhatYourReviewsSay from "./what-your-reviews-say";
import SignsYourBusinessIsInvisibleOnline from "./signs-your-business-is-invisible-online";

/** Post bodies by slug. Each post's title, date and summary live in src/lib/blog.ts. */
export const postBodies: Record<string, ReactElement> = {
  "is-ai-sending-customers-to-competitors": <IsAiSendingCustomersToCompetitors />,
  "google-profile-costing-you-calls": <GoogleProfileCostingYouCalls />,
  "what-your-reviews-say": <WhatYourReviewsSay />,
  "signs-your-business-is-invisible-online": <SignsYourBusinessIsInvisibleOnline />,
};
