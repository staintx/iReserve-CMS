import { createElement as h, useCallback } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { toneOf } from "../components/feedback/tone";

/**
 * Toast: the low-risk end of the feedback system.
 *
 * Use it when an action succeeded or failed, the user does not have to
 * do anything about it, and the result is visible on the page anyway.
 * Anything the user must acknowledge, decide, or act on belongs in an
 * InlineMessage (stays put, can be re-read) or a FeedbackDialog.
 *
 * The signature is unchanged — `notify(message, type)` — because ~265
 * call sites use it and they all keep working. What changed is that
 * the toast is now drawn from the same tone vocabulary as the dialogs
 * instead of Sonner's stock look.
 *
 * `type` accepts the tone names plus the historical aliases already in
 * the codebase ("error", "warning", "info", "success").
 *
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} [type]
 * @param {{description?: string, duration?: number, id?: string|number}} [options]
 */
const DURATION = { success: 4000, info: 4000, warning: 6000, error: 8000 };

function renderToast(id, message, type, description) {
  const { icon: Icon, tint } = toneOf(type);
  // `fb` as well as `fb-toast`: toast.custom renders its own markup and does
  // not pick up the Toaster's classNames map, so the shared surface reset
  // (font stack, selection, focus ring) has to be applied here directly.
  return h(
    "div",
    { className: "fb fb-toast", role: type === "error" ? "alert" : "status" },
    h("span", { className: `fb-toast__icon ${tint}`, "aria-hidden": "true" }, h(Icon)),
    h(
      "div",
      { className: "fb-toast__body" },
      h("div", { className: "fb-toast__title" }, message),
      description ? h("div", { className: "fb-toast__description" }, description) : null,
    ),
    h(
      "button",
      {
        type: "button",
        className: "fb-toast__close",
        onClick: () => toast.dismiss(id),
        "aria-label": "Dismiss",
      },
      h(X, { size: 14, "aria-hidden": "true" }),
    ),
  );
}

export default function useToast() {
  const notify = useCallback((message, type = "info", options = {}) => {
    // "info" is the historical default and maps to the neutral-blue
    // informational tone, not to the neutral "you must decide" tone.
    const tone = type in DURATION ? type : "info";
    const { description, ...rest } = options;

    return toast.custom((id) => renderToast(id, message, tone, description), {
      // Errors stay long enough to be read and retyped; successes get
      // out of the way.
      duration: DURATION[tone],
      ...rest,
    });
  }, []);

  const removeToast = useCallback((id) => toast.dismiss(id), []);

  return { notify, removeToast };
}
