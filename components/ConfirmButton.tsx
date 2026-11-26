"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./ui";

/** A destructive button that asks for a second click instead of a browser dialog. */
export function ConfirmButton({
  children,
  confirmLabel,
  onConfirm,
  disabled,
  size = "md",
}: {
  children: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button size={size} variant="danger" disabled={disabled} onClick={() => setConfirming(true)}>
        {children}
      </Button>
    );
  }
  return (
    <span className="inline-flex gap-1.5">
      <Button size={size} variant="ghost" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
      <Button
        size={size}
        variant="dangerSolid"
        disabled={disabled}
        onClick={() => {
          setConfirming(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
    </span>
  );
}
