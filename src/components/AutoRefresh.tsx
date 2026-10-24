"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-renders the page's server data every few seconds, e.g. while an AI check is running. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
