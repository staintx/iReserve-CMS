import { useRef } from "react";
import FeedbackDialog from "../feedback/FeedbackDialog";

/**
 * The declarative confirmation used across the admin, manager, staff
 * and customer shells (~24 call sites). Its props are deliberately
 * unchanged so every one of those sites inherits the new dialog —
 * hierarchy, loading state, focus handling, mobile layout — without
 * being touched.
 *
 * Two things did change in how it reads:
 *
 * 1. With no `title`, the message becomes the heading rather than
 *    sitting as grey body copy under a generic "Confirm Action". A
 *    confirmation's question *is* its title; the old default buried
 *    the only sentence that mattered.
 * 2. `confirmVariant="danger"` / `isDestructive` now select the
 *    destructive tone, which changes the icon, the button colour and
 *    which control gets initial focus — not just the button colour.
 *
 * For new code prefer `useConfirm()` (no local state) or
 * `FeedbackDialog` directly (async actions, three-way choices).
 */
export default function ConfirmDialog({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant,
  isDestructive = false,
  tone,
  onConfirm,
  onCancel,
}) {
  // Closing after a successful confirm must not also fire onCancel:
  // most call sites use onCancel to clear the target that renders
  // this dialog, and several use onConfirm for the same thing.
  const confirmed = useRef(false);

  const resolvedTone =
    tone || (isDestructive || confirmVariant === "danger" ? "destructive" : "confirm");

  return (
    <FeedbackDialog
      open
      tone={resolvedTone}
      title={title || message}
      description={title ? message : undefined}
      confirmLabel={confirmText}
      cancelLabel={cancelText}
      onConfirm={async () => {
        confirmed.current = true;
        await onConfirm?.();
      }}
      onOpenChange={(open) => {
        if (open) return;
        if (confirmed.current) {
          confirmed.current = false;
          return;
        }
        onCancel?.();
      }}
    />
  );
}
