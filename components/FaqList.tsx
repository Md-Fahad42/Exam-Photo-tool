import type { Faq } from "@/data/exams";

export function FaqList({ faqs, id = "faq-title" }: { faqs: readonly Faq[]; id?: string }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-xl font-bold">
        Questions
      </h2>
      <div className="mt-3 space-y-5">
        {faqs.map((f) => (
          <div key={f.question}>
            <h3 className="font-semibold">{f.question}</h3>
            <p className="mt-1 text-muted">{f.answer}</p>
          </div>
        ))}
      </div>
    </section>
  );
}