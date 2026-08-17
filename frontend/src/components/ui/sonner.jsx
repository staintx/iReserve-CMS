import { Toaster as Sonner } from "sonner";

/**
 * Toast host.
 *
 * Every toast is rendered through `toast.custom` in hooks/useToast, so
 * Sonner supplies only positioning, stacking and lifecycle here and
 * none of the visuals. That is why the toast is `unstyled` and the
 * container has no width of its own — the markup in useToast carries
 * the whole design, and it is the same tone vocabulary the dialogs and
 * inline messages use.
 *
 * Bottom-right rather than Sonner's own default region choice: nearly
 * every surface in this product has a sticky header (admin, customer
 * portal, the booking wizard's step bar), and top-right toasts landed
 * on top of them.
 */
const Toaster = (props) => (
  <Sonner
    position="bottom-right"
    offset={20}
    gap={10}
    visibleToasts={4}
    toastOptions={{ unstyled: true, classNames: { toast: "fb" } }}
    style={{ width: "min(384px, calc(100vw - 32px))" }}
    {...props}
  />
);

export { Toaster };
