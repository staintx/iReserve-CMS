import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "@/lib/utils";

/**
 * The app's declarative modal. Three things were wrong with it on a phone,
 * and all three are fixed here rather than at the ~20 call sites:
 *
 * 1. **It had no scroll region.** The body was `flex-1 overflow-hidden`, so
 *    a dialog taller than the viewport was simply cut off. Call sites that
 *    remembered to add their own `max-h-[75vh] overflow-y-auto` survived;
 *    the ones that did not — Assign Staff Team, My Availability Schedule —
 *    put their submit button below the clip and made the task impossible
 *    to finish on mobile. The scroll region now lives here, so a call site
 *    cannot forget it.
 * 2. **It measured in `vh`.** On iOS Safari and Chrome Android `100vh` is
 *    the tallest the viewport ever gets, not its current height, so a
 *    `92vh` dialog hides its last ~12% behind the URL bar until the user
 *    scrolls the page — which a fixed dialog will not do. `dvh` tracks the
 *    live viewport.
 * 3. **It was a centred dialog at every width.** Below `sm` it now presents
 *    as a bottom sheet: anchored to the bottom edge, full width, square at
 *    the base and rounded at the top, with a grab handle. That is the
 *    established mobile pattern, and the practical reason is reach — a
 *    centred card puts its actions in the middle of the screen while the
 *    thumb rests at the bottom.
 *
 * The header is sticky so the title stays visible while the body scrolls,
 * and it is padded on the right to clear the dialog's own close button.
 *
 * `footer` renders pinned below the scroll region. Use it for the primary
 * action of a long form: on a phone the alternative is scrolling to the
 * bottom of a list of selects to find the Save button.
 */
export default function Modal({ title, description, children, footer, onClose, className = "", bodyClassName = "" }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        /* A titleless dialog draws its own header and close button, so the
           built-in one would be a second X on top of it. */
        hideClose={!title}
        className={cn(
          "flex flex-col gap-0 overflow-hidden p-0 max-h-[90dvh]",
          // Below `sm` the dialog becomes a bottom sheet. Only `max-sm:`
          // rules are used so every existing desktop width a call site
          // passes (`max-w-2xl`, `max-w-3xl`, …) still applies untouched.
          "max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0",
          "max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-none",
          "max-sm:max-h-[92dvh] max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:border-b-0",
          "max-sm:data-[state=open]:slide-in-from-bottom-6",
          "max-sm:data-[state=closed]:slide-out-to-bottom-6",
          className
        )}
      >
        {/* Grab handle: the affordance that says "this sheet came from the
            bottom and can be dismissed", shown only in sheet presentation. */}
        <div className="sm:hidden pt-2.5 pb-1 shrink-0 flex justify-center" aria-hidden="true">
          <span className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* A titleless dialog gets no header chrome. Two call sites draw
            their own heading inside the body, and an empty bordered header
            above them was a stray rule and 40px of nothing. */}
        {title && (
          <DialogHeader className="shrink-0 text-left px-4 sm:px-5 pt-2 sm:pt-5 pb-2.5 pr-11 sm:pr-12 border-b border-border/50">
            <DialogTitle className="font-sans text-[15px] sm:text-lg font-bold tracking-tight text-foreground leading-snug">
              {title}
            </DialogTitle>
            {description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            )}
          </DialogHeader>
        )}

        {/* bodyClassName is the escape hatch for the handful of dialogs that
            own their internal layout — a full-height two-column builder, or a
            card that draws its own padding. Everything else inherits the
            scroll region, which is the whole point of it living here. */}
        <div className={cn("portal-sheet-scroll flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3.5", bodyClassName)}>
          {children}
        </div>

        {footer && (
          <div className="shrink-0 border-t border-border bg-card px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
