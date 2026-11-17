"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  usernameLabel: string;
  username: string | null;
  password: string;
  note: string;
  copyLabel: string;
  copiedLabel: string;
  closeLabel: string;
  onClose: () => void;
};

/**
 * Shows a temporary password once, with a copy button. It never appears anywhere
 * the password can be read again.
 */
export function TempPasswordDialog({
  open,
  title,
  usernameLabel,
  username,
  password,
  note,
  copyLabel,
  copiedLabel,
  closeLabel,
  onClose,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const copied = copiedFor === password;

  useEffect(() => {
    const dialog = ref.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopiedFor(password);
    } catch {
      // No clipboard access: the password stays on screen to copy by hand.
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-xl border bg-card p-6 text-card-foreground backdrop:bg-foreground/40"
    >
      <h2 id={titleId} className="text-xl font-semibold">
        {title}
      </h2>

      {username ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {usernameLabel} <span dir="ltr">{username}</span>
        </p>
      ) : null}

      <p
        dir="ltr"
        className="mt-4 rounded-md border bg-background px-3 py-2 font-mono text-lg tracking-wide"
      >
        {password}
      </p>

      <p className="mt-3 text-sm text-muted-foreground">{note}</p>

      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={copy}>
          {copied ? (
            <Check aria-hidden="true" className="size-4" />
          ) : (
            <Copy aria-hidden="true" className="size-4" />
          )}
          {copied ? copiedLabel : copyLabel}
        </Button>
        <Button type="button" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
    </dialog>
  );
}
