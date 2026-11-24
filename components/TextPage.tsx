import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/Breadcrumbs";

type TextPageProps = {
  title: string;
  intro?: string;
  /** Crumbs after "Home". The last one has no href. */
  crumbs: Crumb[];
  /** Shown as "Last updated: ...". */
  updated?: string;
  children: ReactNode;
};

export function TextPage({ title, intro, crumbs, updated, children }: TextPageProps) {
  return (
    <div className="wrap pb-12">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-1 text-display font-bold">{title}</h1>
      {intro ? <p className="mt-2 max-w-2xl text-lg text-muted">{intro}</p> : null}
      {updated ? <p className="mt-2 text-sm text-muted">Last updated: {updated}</p> : null}
      <div className="mt-8 max-w-2xl space-y-10">{children}</div>
    </div>
  );
}

export function TextSection({
  id,
  heading,
  children,
}: {
  id: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold">
        {heading}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}