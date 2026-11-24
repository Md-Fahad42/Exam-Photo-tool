import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";

type ToolShellProps = {
  title: string;
  /** One or two plain sentences. Keep it short so the tool stays above the fold. */
  intro: string;
  /** Crumbs after "Home". The last one has no href. */
  crumbs: Crumb[];
  /** The tool UI itself. */
  children: ReactNode;
  /** Guide text, spec tables (with VerifyBadge), FAQs. Rendered BELOW the tool. */
  below?: ReactNode;
};

export function ToolShell({ title, intro, crumbs, children, below }: ToolShellProps) {
  return (
    <div className="wrap pb-12">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-1 text-display font-bold">{title}</h1>
      <p className="mt-2 max-w-2xl text-lg text-muted">{intro}</p>

      {/* min-h reserves space before the tool code loads => near-zero layout shift. */}
      <section aria-label={`${title} tool`} className="panel mt-5 min-h-72 p-4 sm:p-6">
        {children}
      </section>

      {below ? <div className="mt-12 max-w-2xl space-y-10">{below}</div> : null}
    </div>
  );
}