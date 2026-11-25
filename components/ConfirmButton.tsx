"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./ui";

/** A destructive button that asks for a second click instead of a browser dialog. */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  disabled,
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button variant="danger" disabled={disabled} onClick={() => setConfirming(true)}>
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex gap-2">
      <Button
        variant="danger"
        disabled={disabled}
        onClick={() => {
          setConfirming(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </span>
  );
}
