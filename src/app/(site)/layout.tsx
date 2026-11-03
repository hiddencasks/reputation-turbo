import { AdSourceCapture } from "@/components/AdSourceCapture";
import { MetaPixel } from "@/components/MetaPixel";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdSourceCapture />
      <MetaPixel />
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
