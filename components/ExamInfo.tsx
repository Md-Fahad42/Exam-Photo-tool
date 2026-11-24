import { VerifyBadge } from "@/components/VerifyBadge";
import type { Exam, ImageSpec } from "@/data/exams";

function Val({ v, unit }: { v: number | string | null; unit?: string }) {
  if (v === null) return <VerifyBadge />;
  return (
    <>
      {v}
      {unit ? ` ${unit}` : ""}
    </>
  );
}

function SpecTable({ title, spec }: { title: string; spec: ImageSpec }) {
  const rows: Array<[string, number | string | null, string?]> = [
    ["Width", spec.widthPx, "px"],
    ["Height", spec.heightPx, "px"],
    ["Minimum size", spec.minKB, "KB"],
    ["Maximum size", spec.maxKB, "KB"],
    ["File type", spec.format === null ? null : spec.format === "jpeg" ? "JPG" : "PNG"],
    ["Background", spec.background === null ? null : spec.background === "white" ? "White" : "Any"],
  ];
  return (
    <table className="w-full text-left">
      <caption className="mb-2 text-left text-lg font-semibold">{title}</caption>
      <tbody>
        {rows.map(([label, value, unit]) => (
          <tr key={label} className="border-t border-line">
            <th scope="row" className="py-3 pr-4 font-normal text-muted">
              {label}
            </th>
            <td className="py-3">
              <Val v={value} unit={unit} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ExamInfo({ exam }: { exam: Exam }) {
  return (
    <>
      <section aria-labelledby="specs-title">
        <h2 id="specs-title" className="text-xl font-bold">
          {exam.name} photo and signature rules
        </h2>

        {exam.verified ? (
          <p className="mt-2 text-muted">
            Checked against the official notification on {exam.lastVerified ?? "an unknown date"}.{" "}
            {exam.sourceUrl ? (
              <a href={exam.sourceUrl} rel="noopener noreferrer" className="text-ink underline underline-offset-4">
                Open the official notification
              </a>
            ) : null}
          </p>
        ) : (
          <p className="mt-2 rounded-control border border-dashed border-muted p-3">
            <VerifyBadge /> These rules are not confirmed yet. Read the official notification for{" "}
            {exam.name} and type its numbers into the tool above.
          </p>
        )}

        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="text-muted">Post</dt>
          <dd><Val v={exam.post} /></dd>
          <dt className="text-muted">Notification year</dt>
          <dd><Val v={exam.year} /></dd>
          <dt className="text-muted">Other documents</dt>
          <dd>{exam.extraDocs === null ? <VerifyBadge /> : exam.extraDocs.join(", ") || "None"}</dd>
        </dl>

        <div className="mt-6 space-y-8">
          <SpecTable title="Photo" spec={exam.photo} />
          <SpecTable title="Signature" spec={exam.signature} />
        </div>
      </section>

      <section aria-labelledby="errors-title">
        <h2 id="errors-title" className="text-xl font-bold">
          Common mistakes
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          {exam.commonErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="faq-title">
        <h2 id="faq-title" className="text-xl font-bold">
          Questions
        </h2>
        <div className="mt-3 space-y-5">
          {exam.faqs.map((f) => (
            <div key={f.question}>
              <h3 className="font-semibold">{f.question}</h3>
              <p className="mt-1 text-muted">{f.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}