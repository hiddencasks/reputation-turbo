"use client";

import { useEffect } from "react";
import { AD_COOKIE, AD_COOKIE_DAYS, adSourceFromUrl } from "@/lib/ad-source";

/**
 * Remembers which ad or tagged link brought this visitor, so a form they fill in later
 * (even on another page) is credited to it. Only runs when the URL has tags; the newest click wins.
 */
export function AdSourceCapture() {
  useEffect(() => {
    const ad = adSourceFromUrl(window.location.search, window.location.pathname);
    if (!ad) return;
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${AD_COOKIE}=${encodeURIComponent(JSON.stringify(ad))}; Max-Age=${AD_COOKIE_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  }, []);
  return null;
}
