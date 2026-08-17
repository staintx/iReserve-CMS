import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);

/**
 * Imperative confirmation. Replaces `window.confirm`.
 *
 *   if (!(await confirm({ title: "Delete this package?", tone: "destructive" }))) return;
 *
 * Pass `onConfirm` and the async work runs inside the dialog instead,
 * which is what gives a one-line call site the loading state, the
 * double-submit guard, and "stay open and show why" on failure:
 *
 *   await confirm({
 *     tone: "destructive",
 *     title: "Remove this add-on?",
 *     onConfirm: () => AdminAPI.deleteAddon(id),
 *   });
 *
 * Lives in its own module so ConfirmProvider.jsx exports only a
 * component and stays fast-refresh friendly.
 *
 * @returns {(options: {
 *   title: string,
 *   description?: string,
 *   body?: import("react").ReactNode,
 *   tone?: "confirm"|"info"|"warning"|"error"|"destructive",
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   wide?: boolean,
 *   onConfirm?: () => Promise<any>,
 * }) => Promise<boolean>}
 */
export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used inside <ConfirmProvider>");
  }
  return context.confirm;
}
