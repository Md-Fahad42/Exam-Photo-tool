import { Breadcrumbs } from "@/components/Breadcrumbs";
import { RuledList } from "@/components/RuledList";
import { StatusBadge } from "@/components/StatusBadge";
import { TOOLS } from "@/data/tools";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Tools: resize photo and signature for exam forms",
  description:
    "Free tools for exam forms that run in your browser. Resize a photo or signature to the pixels and KB your form asks for. More tools are coming soon.",
  path: "/tools/",
});

export default function ToolsHubPage() {
  return (
    <div className="wrap pb-12">
      <Breadcrumbs items={[{ label: "Tools" }]} />
      <h1 className="mt-1 text-display font-bold">Tools</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">
        Each tool works in your browser, on your phone or computer. Your files are not uploaded.
      </p>

      <div className="mt-8">
        <RuledList
          items={TOOLS.map((t) =>
            t.live
              ? { href: `/tools/${t.slug}/`, title: t.name, sub: t.blurb }
              : { title: t.name, sub: t.blurb, badge: <StatusBadge kind="soon" /> }
          )}
        />
      </div>
    </div>
  );
}