import { secondaryBtn } from "@/components/FilePicker";

type Props = { value?: number; label: string; note?: string; onCancel: () => void };

export function JobProgress({ value, label, note, onCancel }: Props) {
  return (
    <div className="space-y-3">
      <div role="status" aria-live="polite" className="space-y-1">
        <progress value={value} max={1} aria-label={label} className="h-3 w-full accent-accent" />
        {note ? <p className="text-sm text-muted">{note}</p> : null}
      </div>
      <button type="button" className={secondaryBtn} onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}