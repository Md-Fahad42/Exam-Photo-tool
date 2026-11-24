import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExamInfo } from "@/components/ExamInfo";
import { PhotoTool } from "@/components/PhotoTool";
import { ToolShell } from "@/components/ToolShell";
import { EXAMS, getExam } from "@/data/exams";
import { buildMetadata } from "@/lib/seo";

// Static export: only the slugs below exist. Anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return EXAMS.filter((e) => e.live).map((e) => ({ slug: e.slug }));
}

// In recent Next versions `params` is a Promise. Verify this against the docs
// for your exact version if the build complains.
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const exam = getExam(slug);
  if (!exam) return {};
  return buildMetadata({
    title: `${exam.name} photo and signature resizer`,
    description: `Resize and compress your ${exam.name} form photo and signature in your browser. Check the size rules in the official notification. Nothing is uploaded.`,
    path: `/exams/${exam.slug}/`,
    // Thin pages full of "TO VERIFY" should not be indexed. Verify the exam to index it.
    noindex: !exam.verified,
  });
}

export default async function ExamPage({ params }: Props) {
  const { slug } = await params;
  const exam = getExam(slug);
  if (!exam || !exam.live) notFound();

  return (
    <ToolShell
      title={`${exam.name} photo and signature tool`}
      intro="Make your picture the size your form asks for. Your files stay on your device."
      crumbs={[{ label: "Exams", href: "/exams/" }, { label: exam.name }]}
      below={<ExamInfo exam={exam} />}
    >
      <PhotoTool
        exam={{
          slug: exam.slug,
          name: exam.name,
          photo: exam.photo,
          signature: exam.signature,
          verified: exam.verified,
          lastVerified: exam.lastVerified,
        }}
      />
    </ToolShell>
  );
}