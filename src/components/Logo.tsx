// Text wordmark used until the approved logo files are uploaded.
// To switch: put the file in /public and replace this component's body with an <Image>.
export function Logo({ tone = "dark", className = "" }: { tone?: "dark" | "light"; className?: string }) {
  const word = tone === "dark" ? "text-navy" : "text-white";
  return (
    <span className={`inline-flex items-center gap-2 font-display font-extrabold italic uppercase tracking-wide ${className}`}>
      <span aria-hidden="true" className="flex flex-col gap-[3px]">
        <span className="block h-[3px] w-5 -skew-x-[30deg] bg-orange" />
        <span className="block h-[3px] w-3.5 -skew-x-[30deg] bg-orange ml-1.5" />
        <span className="block h-[3px] w-2 -skew-x-[30deg] bg-orange ml-3" />
      </span>
      <span className="leading-none">
        <span className={word}>Reputation</span> <span className="text-orange">Turbo</span>
      </span>
    </span>
  );
}
