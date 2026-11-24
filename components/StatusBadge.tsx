type Props = { kind: "verified" | "unverified" | "soon" };

const LABEL: Record<Props["kind"], string> = {
  verified: "✓ Verified",
  unverified: "Unverified",
  soon: "Coming soon",
};

/** The meaning is in the words and the border style, never in colour alone. */
export function StatusBadge({ kind }: Props) {
  const style =
    kind === "verified"
      ? "border-solid border-accent text-accent"
      : "border-dashed border-muted text-muted";
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-control border px-2 py-0.5 text-sm font-semibold ${style}`}
    >
      {LABEL[kind]}
    </span>
  );
}