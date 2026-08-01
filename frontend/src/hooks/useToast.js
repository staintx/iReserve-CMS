import { toast } from "sonner";

export default function useToast() {
  const notify = (message, type = "info", options = {}) => {
    if (type === "success") {
      return toast.success(message, options);
    } else if (type === "error") {
      return toast.error(message, options);
    } else if (type === "warning") {
      return toast.warning(message, options);
    } else {
      return toast(message, options);
    }
  };

  const removeToast = (id) => {
    toast.dismiss(id);
  };

  return { notify, removeToast };
}
