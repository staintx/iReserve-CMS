import { useCallback, useId, useRef, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { OctagonAlert } from "lucide-react";
import { confirmButtonClass, toneOf } from "./tone";

/**
 * The one dialog primitive for decisions.
 *
 * Built on Radix's AlertDialog rather than Dialog on purpose: an
 * AlertDialog does not close on an outside click, only on Escape and
 * on an explicit button. A confirmation is a question, and a stray
 * click on the backdrop is not an answer to it.
 *
 * What it owns so no call site has to re-solve it:
 *   - the action runs, and the dialog only closes if it *succeeded*;
 *   - a thrown error is caught and shown in place, so the user can
 *     retry without rebuilding whatever they were confirming;
 *   - the confirm button is disabled for the whole in-flight window,
 *     which is what actually prevents double submission;
 *   - while it is in flight, Escape and the close paths are blocked,
 *     so a half-finished action cannot be orphaned;
 *   - focus lands on the safe choice for destructive tones and on
 *     the primary for everything else.
 *
 * @param {"confirm"|"info"|"success"|"warning"|"error"|"destructive"} tone
 * @param {() => any|Promise<any>} onConfirm  Return/resolve `false` to
 *   keep the dialog open without showing an error (e.g. the call site
 *   surfaced the problem some other way). Throwing shows the message
 *   in place.
 * @param {{label: string, onClick: () => any|Promise<any>, tone?: string}} [tertiary]
 *   The third option in a three-way close ("discard"). Rendered
 *   low-emphasis and alone on the left so it never competes with the
 *   safe primary.
 */
export default function FeedbackDialog({
  open,
  onOpenChange,
  tone = "confirm",
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmIcon: ConfirmIcon,
  onConfirm,
  onCancel,
  tertiary,
  wide = false,
  hideCancel = false,
}) {
  const { icon: Icon, tint } = toneOf(tone);
  const [pending, setPending] = useState(null); // "confirm" | "tertiary" | null
  const [error, setError] = useState("");
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef(null);
  const cancelRef = useRef(null);

  const busy = pending !== null;

  // A reopened dialog is a fresh question; it must not inherit the
  // error text or the spinner from the last time it was asked.
  // Adjusted during render rather than in an effect — this is state
  // derived from a prop change, and an effect here would render the
  // stale error for a frame before clearing it.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setPending(null);
      setError("");
    }
  }

  const close = useCallback(() => onOpenChange?.(false), [onOpenChange]);

  const run = useCallback(
    async (which, handler) => {
      if (busy) return;
      setError("");
      if (!handler) {
        close();
        return;
      }
      setPending(which);
      try {
        const result = await handler();
        // `false` is an explicit "stay open" from the call site.
        if (result === false) {
          setPending(null);
          return;
        }
        setPending(null);
        close();
      } catch (err) {
        setPending(null);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Something went wrong. Nothing was changed — try again.",
        );
      }
    },
    [busy, close],
  );

  const handleCancel = () => {
    if (busy) return;
    onCancel?.();
    close();
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={(next) => !next && !busy && close()}>
      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fb fb-overlay" />
        <AlertDialogPrimitive.Content
          className={`fb fb-dialog${wide ? " fb-dialog--wide" : ""}`}
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            // Destructive questions open with the escape hatch focused,
            // so Enter on a muscle-memory keypress cannot delete anything.
            const target =
              tone === "destructive" || tone === "error"
                ? cancelRef.current || confirmRef.current
                : confirmRef.current || cancelRef.current;
            target?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (busy) event.preventDefault();
          }}
        >
          <div className="fb-dialog__body">
            <div className={`fb-dialog__icon ${tint}`} aria-hidden="true">
              <Icon />
            </div>
            <div className="fb-dialog__text">
              <AlertDialogPrimitive.Title asChild>
                <h2 className="fb-dialog__title" id={titleId}>
                  {title}
                </h2>
              </AlertDialogPrimitive.Title>

              {description ? (
                <AlertDialogPrimitive.Description asChild>
                  <p className="fb-dialog__description" id={descId}>
                    {description}
                  </p>
                </AlertDialogPrimitive.Description>
              ) : null}

              {children ? <div className="fb-dialog__content">{children}</div> : null}

              {error ? (
                <p className="fb-dialog__error" role="alert">
                  <OctagonAlert aria-hidden="true" />
                  <span>{error}</span>
                </p>
              ) : null}
            </div>
          </div>

          <div className="fb-dialog__footer">
            {tertiary ? (
              <div className="fb-dialog__footer-lead">
                <button
                  type="button"
                  className={
                    tertiary.tone === "destructive"
                      ? "fb-btn fb-btn--quiet-danger"
                      : "fb-btn fb-btn--ghost"
                  }
                  onClick={() => run("tertiary", tertiary.onClick)}
                  disabled={busy}
                >
                  {pending === "tertiary" ? <span className="fb-spinner" aria-hidden="true" /> : null}
                  {tertiary.label}
                </button>
              </div>
            ) : null}

            <div className="fb-dialog__footer-main">
              {hideCancel ? null : (
                <AlertDialogPrimitive.Cancel asChild>
                  <button
                    type="button"
                    ref={cancelRef}
                    className="fb-btn fb-btn--ghost"
                    onClick={handleCancel}
                    disabled={busy}
                  >
                    {cancelLabel}
                  </button>
                </AlertDialogPrimitive.Cancel>
              )}
              <button
                type="button"
                ref={confirmRef}
                className={confirmButtonClass(tone)}
                onClick={() => run("confirm", onConfirm)}
                disabled={busy}
              >
                {pending === "confirm" ? (
                  <span className="fb-spinner" aria-hidden="true" />
                ) : ConfirmIcon ? (
                  <ConfirmIcon aria-hidden="true" />
                ) : null}
                {pending === "confirm" ? "Working…" : confirmLabel}
              </button>
            </div>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
