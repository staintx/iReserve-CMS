import { X } from "lucide-react";
import { toneOf } from "./tone";

/**
 * The non-blocking half of the system: validation summaries, form
 * errors, "this is still a draft", a failed load that the page can
 * survive.
 *
 * This is the pattern most of the audit's "should not have been a
 * modal" cases belong to. Feedback that the user needs while they
 * keep working stays on the page, next to the thing it is about; a
 * dialog is only for a decision that has to happen first.
 *
 * @param {"confirm"|"info"|"success"|"warning"|"error"|"destructive"} tone
 * @param {boolean} [assertive]  Announce immediately. Use for errors
 *   that appear in response to something the user just did.
 */
export default function InlineMessage({
  tone = "info",
  title,
  children,
  icon: IconOverride,
  onDismiss,
  assertive = false,
  className = "",
}) {
  const { icon: ToneIcon, inline } = toneOf(tone);
  const Icon = IconOverride || ToneIcon;

  return (
    <div
      className={`fb fb-inline ${inline} ${className}`.trim()}
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
    >
      <span className="fb-inline__icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="fb-inline__body">
        {title ? <p className="fb-inline__title">{title}</p> : null}
        {children ? <div className="fb-inline__message">{children}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="fb-inline__dismiss" onClick={onDismiss} aria-label="Dismiss">
          <X size={15} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
