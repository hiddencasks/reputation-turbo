import Link from "next/link";
import { site } from "@/lib/site";
import { aiChecksAvailable } from "@/lib/ai-visibility/run";
import { ProspectForm } from "../ProspectForm";

// Leaves time for the audit started when adding a lead.
export const maxDuration = 300;

export default function NewLeadPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/leads" className="text-sm font-semibold text-orange">&larr; All leads</Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-navy">Add a lead</h1>
        <p className="mt-1 text-muted">
          Fill this out for a business you want to contact, or on behalf of a customer who asked you for an audit. Want ideas for
          who to contact? Try the <Link href="/admin/finder" className="text-orange underline">prospect finder</Link>.
        </p>
      </div>
      <div className="rounded-lg bg-white p-5 shadow-sm">
        <ProspectForm industries={site.industries} cities={site.cities} canCheck={aiChecksAvailable()} />
      </div>
    </div>
  );
}
