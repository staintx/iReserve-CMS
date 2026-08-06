import { toast } from "sonner";
import { useCallback } from "react";

export default function useToast() {
  const notify = useCallback((message, type = "info", options = {}) => {
    if (type === "success") {
      return toast.success(message, options);
    } else if (type === "error") {
      return toast.error(message, options);
    } else if (type === "warning") {
      return toast.warning(message, options);
    } else {
      return toast(message, options);
    }
  }, []);

  const removeToast = useCallback((id) => {
    toast.dismiss(id);
  }, []);

  return { notify, removeToast };
}
