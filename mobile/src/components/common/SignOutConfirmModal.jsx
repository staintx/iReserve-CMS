import React, { useState } from "react";
import { LogOut } from "lucide-react-native";
import AppDialog from "./AppDialog";

export const SignOutConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  title = "Sign Out?",
  message = "Are you sure you want to sign out? You will need to sign back in to access your inquiries, quotations, and reservations.",
  confirmText = "Sign Out",
  cancelText = "Stay Signed In",
}) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <AppDialog
      visible={visible}
      onClose={onClose}
      onConfirm={handleConfirm}
      onCancel={onClose}
      title={title}
      message={message}
      tone="destructive"
      icon={LogOut}
      confirmText={confirmText}
      cancelText={cancelText}
      loading={loading}
    />
  );
};

export default SignOutConfirmModal;
