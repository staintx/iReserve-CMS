import { createContext, useCallback, useMemo, useState } from "react";

export const ToastContext = createContext(null);

const defaultDuration = 3500;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((message, type = "info", options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const duration = options.duration ?? defaultDuration;

    setToasts((current) => [
      ...current,
      {
        id,
        message,
        type,
        duration
      }
    ]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  const value = useMemo(() => ({ notify, removeToast }), [notify, removeToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button type="button" className="toast-close" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
