import { useCallback, useMemo, useRef, useState } from "react";
import FeedbackDialog from "./FeedbackDialog";
import { ConfirmContext } from "./confirmContext";

/**
 * Host for imperative confirmations, mounted once at the app root.
 *
 * This exists to kill `window.confirm`. The native dialog was doing
 * real work in five places — it blocks, it returns a boolean, and it
 * needs no local state — and any replacement that forced every call
 * site to add `useState` plus JSX would not have been adopted at the
 * sites that mattered. So the calling shape stays the same; see
 * `useConfirm` in ./confirmContext for the API.
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const resolverRef = useRef(null);

  const settle = useCallback((value) => {
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(value);
  }, []);

  const confirm = useCallback(
    (options) => {
      // A second request while one is open would strand the first
      // promise forever; answer it "no" before taking over.
      settle(false);
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setRequest({ tone: "confirm", confirmLabel: "Confirm", cancelLabel: "Cancel", ...options });
      });
    },
    [settle],
  );

  const value = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request ? (
        <FeedbackDialog
          open
          onOpenChange={(open) => {
            if (open) return;
            // Escape and Cancel land here. Anything that was not an
            // explicit success is a "no"; a success has already
            // settled the promise and cleared the resolver, so this
            // call is a no-op in that case.
            settle(false);
            setRequest(null);
          }}
          tone={request.tone}
          title={request.title}
          description={request.description}
          confirmLabel={request.confirmLabel}
          cancelLabel={request.cancelLabel}
          confirmIcon={request.confirmIcon}
          wide={request.wide}
          onConfirm={async () => {
            if (request.onConfirm) {
              // Let it throw: FeedbackDialog catches, stays open and
              // shows the message, and the promise stays unsettled
              // until the user resolves the dialog one way or another.
              await request.onConfirm();
            }
            settle(true);
            setRequest(null);
          }}
        >
          {request.body}
        </FeedbackDialog>
      ) : null}
    </ConfirmContext.Provider>
  );
}

export default ConfirmProvider;
