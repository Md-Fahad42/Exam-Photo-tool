"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";
import type { Exam } from "@/data/exams";

type Props = { exams: readonly Pick<Exam, "slug" | "name">[] };

export function ExamSelector({ exams }: Props) {
  const router = useRouter();
  const selectId = useId();
  const errorId = useId();
  const [slug, setSlug] = useState("");
  const [showError, setShowError] = useState(false);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!slug) {
      setShowError(true);
      return;
    }
    router.push(`/exams/${slug}/`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="panel p-4 sm:p-6">
      <label htmlFor={selectId} className="block text-lg font-semibold">
        Which exam is your form for?
      </label>

      {/* Native select: best keyboard/screen-reader support and the best picker on Android. */}
      <select
        id={selectId}
        className="field mt-3"
        value={slug}
        onChange={(e) => {
          setSlug(e.target.value);
          setShowError(false);
        }}
        aria-invalid={showError}
        aria-describedby={showError ? errorId : undefined}
      >
        <option value="">Choose your exam</option>
        {exams.map((exam) => (
          <option key={exam.slug} value={exam.slug}>
            {exam.name}
          </option>
        ))}
      </select>

      {showError ? (
        <p id={errorId} role="alert" className="mt-2 text-sm font-semibold">
          Please choose an exam first.
        </p>
      ) : null}

      <button type="submit" className="btn mt-4 w-full sm:w-auto">
        Show tools for this exam
      </button>
    </form>
  );
}