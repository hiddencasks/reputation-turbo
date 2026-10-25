import Image from "next/image";
import logo from "../../public/brand/logo.png";
import logoWhite from "../../public/brand/logo-white.png";

// The approved Reputation Turbo logo. "light" is the version for dark backgrounds.
export function Logo({ tone = "dark", className = "h-10 w-auto" }: { tone?: "dark" | "light"; className?: string }) {
  return <Image src={tone === "dark" ? logo : logoWhite} alt="Reputation Turbo" className={className} priority={tone === "dark"} />;
}
