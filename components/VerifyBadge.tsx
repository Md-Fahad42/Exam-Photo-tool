/** Mark every exam specification with this until verified against the official notification. */
export function VerifyBadge() {
  return (
    <span className="inline-flex items-center rounded-control border border-dashed border-muted px-2 py-0.5 text-sm font-semibold text-muted">
      TO VERIFY
    </span>
  );
}