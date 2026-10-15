import React, { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo } from "react";
import AppDialog from "../components/common/AppDialog";

const DialogContext = createContext({
  showDialog: () => {},
  showConfirm: () => Promise.resolve(false),
  showAlert: () => Promise.resolve(true),
  showConfirmDialog: () => Promise.resolve(false),
  showAlertDialog: () => Promise.resolve(true),
  confirmAction: () => Promise.resolve(false),
  hideDialog: () => {},
  hideGlobalDialog: () => {},
});

// Global event bus for imperative non-hook dialog triggers
const dialogListeners = new Set();

export const showConfirmDialog = (options) => {
  return new Promise((resolve) => {
    dialogListeners.forEach((listener) => listener({ ...options, _resolver: resolve }));
  });
};

export const showAlertDialog = (options) => {
  return new Promise((resolve) => {
    dialogListeners.forEach((listener) =>
      listener({
        ...options,
        cancelText: null,
        confirmText: options.confirmText || "OK",
        _resolver: resolve,
      })
    );
  });
};

export const confirmAction = (options) => {
  return showConfirmDialog(options);
};

export const hideGlobalDialog = () => {
  dialogListeners.forEach((listener) => listener(null));
};

export const DialogProvider = ({ children }) => {
  const [dialogState, setDialogState] = useState(null);
  const resolverRef = useRef(null);

  const settle = useCallback((value) => {
    if (resolverRef.current) {
      resolverRef.current(value);
      resolverRef.current = null;
    }
  }, []);

  const closeDialog = useCallback(() => {
    settle(false);
    setDialogState(null);
  }, [settle]);

  const showConfirm = useCallback(
    (options) => {
      settle(false);
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialogState({
          ...options,
          cancelText: options.cancelText !== undefined ? options.cancelText : "Cancel",
          confirmText: options.confirmText || "Confirm",
        });
      });
    },
    [settle]
  );

  const showAlert = useCallback(
    (options) => {
      settle(false);
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setDialogState({
          ...options,
          cancelText: null,
          confirmText: options.confirmText || "OK",
        });
      });
    },
    [settle]
  );

  useEffect(() => {
    const handleGlobalTrigger = (config) => {
      if (!config) {
        closeDialog();
        return;
      }
      settle(false);
      resolverRef.current = config._resolver || null;
      setDialogState(config);
    };

    dialogListeners.add(handleGlobalTrigger);
    return () => {
      dialogListeners.delete(handleGlobalTrigger);
    };
  }, [closeDialog, settle]);

  const handleConfirm = async () => {
    if (dialogState?.onConfirm) {
      await dialogState.onConfirm();
    }
    settle(true);
    setDialogState(null);
  };

  const handleCancel = () => {
    if (dialogState?.onCancel) {
      dialogState.onCancel();
    } else if (!dialogState?.cancelText && dialogState?.onConfirm) {
      dialogState.onConfirm();
    }
    closeDialog();
  };

  const contextValue = useMemo(
    () => ({
      showConfirm,
      showAlert,
      showConfirmDialog: showConfirm,
      showAlertDialog: showAlert,
      confirmAction: showConfirm,
      hideDialog: closeDialog,
      hideGlobalDialog: closeDialog,
    }),
    [showConfirm, showAlert, closeDialog]
  );

  return (
    <DialogContext.Provider value={contextValue}>
      {children}
      {dialogState ? (
        <AppDialog
          visible={Boolean(dialogState)}
          title={dialogState.title}
          message={dialogState.message}
          tone={dialogState.tone || "primary"}
          icon={dialogState.icon}
          highlight={dialogState.highlight}
          confirmText={dialogState.confirmText || "Confirm"}
          cancelText={dialogState.cancelText}
          loading={dialogState.loading}
          dismissOnBackdrop={dialogState.dismissOnBackdrop !== false}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          onClose={closeDialog}
        >
          {dialogState.children}
        </AppDialog>
      ) : null}
    </DialogContext.Provider>
  );
};

export const useAppDialog = () => useContext(DialogContext);

export default DialogContext;
