import type { ReactElement } from "react";
import DoesAiRecommendYourBusiness from "./does-ai-recommend-your-business";
import GoogleBusinessProfileFixes from "./google-business-profile-fixes";
import HowToGetMoreGoogleReviews from "./how-to-get-more-google-reviews";
import SlowSeasonOnlineChecklist from "./slow-season-online-checklist";

/** Post bodies by slug. Each post's title, date and summary live in src/lib/blog.ts. */
export const postBodies: Record<string, ReactElement> = {
  "does-ai-recommend-your-business": <DoesAiRecommendYourBusiness />,
  "google-business-profile-fixes": <GoogleBusinessProfileFixes />,
  "how-to-get-more-google-reviews": <HowToGetMoreGoogleReviews />,
  "slow-season-online-checklist": <SlowSeasonOnlineChecklist />,
};
