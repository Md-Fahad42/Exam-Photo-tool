"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

export const secondaryBtn =
  "inline-flex min-h-12 items-center justify-center rounded-control border border-muted bg-surface px-5 text-base font-semibold text-ink";

type Props = {
  multiple?: boolean;
  disabled?: boolean;
  buttonLabel: string;
  onFiles: (files: File[]) => void;
};

export function FilePicker({ multiple = false, disabled = false, buttonLabel, onFiles }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files ?? []);
    e.target.value = ""; // lets the same file be chosen again
    if (list.length > 0) onFiles(multiple ? list : list.slice(0, 1));
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const list = Array.from(e.dataTransfer.files);
    if (list.length > 0) onFiles(multiple ? list : list.slice(0, 1));
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`rounded-panel border-2 p-4 text-center ${dragging ? "border-accent" : "border-line"}`}
    >
      <p className="text-muted">
        {dragging
          ? "Drop here"
          : multiple
            ? "Drag pictures here, or choose them."
            : "Drag a picture here, or choose one."}
      </p>
      <div className="mt-3 flex min-h-12 items-center justify-center">
        <button
          type="button"
          className="btn disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={() => input.current?.click()}
        >
          {buttonLabel}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={onPick}
      />
      <p className="mt-2 text-sm text-muted">Your files stay on this device. Nothing is uploaded.</p>
    </div>
  );
}