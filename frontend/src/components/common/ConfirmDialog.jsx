import FeedbackDialog from "../feedback/FeedbackDialog";

/**
 * The declarative confirmation used across the admin, manager, staff
 * and customer shells (~24 call sites). Its props are deliberately
 * unchanged so every one of those sites inherits the new dialog —
 * hierarchy, loading state, focus handling, mobile layout — without
 * being touched.
 *
 * Three things did change in how it reads:
 *
 * 1. With no `title`, the message becomes the heading rather than
 *    sitting as grey body copy under a generic "Confirm Action". A
 *    confirmation's question *is* its title; the old default buried
 *    the only sentence that mattered.
 * 2. `confirmVariant="danger"` / `isDestructive` now select the
 *    destructive tone, which changes the icon, the button colour and
 *    which control gets initial focus — not just the button colour.
 * 3. `onCancel` is a *dismiss* handler: it fires on every path that
 *    closes the dialog, including a successful confirm. See below.
 *
 * Why (3): this component does not own its own visibility. Every call
 * site renders it behind `{target && <ConfirmDialog …/>}`, so the
 * dialog only actually disappears when the call site clears `target`
 * — which is exactly what its `onCancel` does at all 19 of them. The
 * old contract suppressed that handler after a confirm, on the theory
 * that `onConfirm` would clear the state instead. Any handler that
 * forgot to (Inquiry archiving) or that only cleared it on the happy
 * path left the overlay on screen over a success toast, with the
 * action already committed and no way back but Escape.
 *
 * Dismissing is not the same decision as declining, so a call site
 * that needs to tell them apart can pass an explicit `onClose`; it
 * takes over the dismiss duty and `onCancel` goes back to meaning
 * "the user said no".
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
  onClose,
}) {
  const dismiss = onClose || onCancel;

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
      onConfirm={onConfirm}
      onCancel={onClose ? onCancel : undefined}
      onOpenChange={(open) => {
        if (open) return;
        dismiss?.();
      }}
    />
  );
}
