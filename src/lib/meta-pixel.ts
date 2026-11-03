/**
 * Meta (Facebook/Instagram) Pixel for the Reputation Turbo ad account.
 * The ID is public by design: it ships in every page's HTML.
 * Loaded only on the public site, never in /admin.
 */
export const META_PIXEL_ID = "29601771672749026";

type Fbq = (command: "track" | "trackCustom", event: string, params?: Record<string, unknown>) => void;

/** Sends one standard event (Lead, Contact, ...) if the pixel has loaded; does nothing otherwise. */
export function trackPixel(event: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const fbq = (window as unknown as { fbq?: Fbq }).fbq;
  if (typeof fbq === "function") fbq("track", event, params);
}
