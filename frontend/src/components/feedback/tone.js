import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  OctagonAlert,
  Trash2,
} from "lucide-react";

/**
 * The semantic vocabulary of the feedback system.
 *
 * Six tones, and every surface (dialog, toast, inline message,
 * completion state) draws from this one map. That is what stops the
 * system drifting back into five different visual treatments for the
 * same idea: a new call site picks a tone, not a colour and an icon.
 *
 * `tint` is the CSS class carrying background + foreground, defined
 * once in styles/feedback.css.
 */
export const TONES = {
  /** A decision the user must make. Neutral — it is not a warning. */
  confirm: { icon: HelpCircle, tint: "fb-tone-neutral", inline: "fb-inline--neutral" },
  /** Explaining something, implying neither success nor failure. */
  info: { icon: Info, tint: "fb-tone-info", inline: "fb-inline--info" },
  /** The action completed, and the server said so. */
  success: { icon: CheckCircle2, tint: "fb-tone-success", inline: "fb-inline--success" },
  /** Deserves attention, does not block. Visibly not an error. */
  warning: { icon: AlertTriangle, tint: "fb-tone-warning", inline: "fb-inline--warning" },
  /** Something failed or must be corrected. */
  error: { icon: OctagonAlert, tint: "fb-tone-danger", inline: "fb-inline--danger" },
  /** About to destroy something: delete, remove, discard, cancel. */
  destructive: { icon: Trash2, tint: "fb-tone-danger", inline: "fb-inline--danger" },
};

export const toneOf = (tone) => TONES[tone] || TONES.confirm;

/**
 * Which button treatment the confirming action gets.
 * Destructive and error confirmations must *look* like what they do;
 * everything else uses the one primary blue.
 */
export const confirmButtonClass = (tone) =>
  tone === "destructive" || tone === "error" ? "fb-btn fb-btn--danger" : "fb-btn fb-btn--primary";
