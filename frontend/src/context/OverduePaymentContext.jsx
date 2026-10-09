import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import useAuth from "../hooks/useAuth";
import { CustomerAPI } from "../api/customer";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import OverduePaymentNoticeModal from "../components/customer/OverduePaymentNoticeModal";

const OverduePaymentContext = createContext({
  hasOverdue: false,
  overdueBookings: [],
  loading: false,
  refreshOverdue: async () => {},
  checkOverdueAndProceed: () => true,
  openOverdueModal: () => {},
  closeOverdueModal: () => {},
});

export function OverduePaymentProvider({ children }) {
  const { user, isReady } = useAuth();
  const [overdueBookings, setOverdueBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState({
    open: false,
    mode: "inquiry_block", // "inquiry_block" | "login"
  });

  const isCustomer = user?.role === "customer";
  const isFetchingRef = useRef(false);

  const fetchOverdue = useCallback(async (isSilent = false) => {
    if (!user || user.role !== "customer" || isFetchingRef.current) return [];
    try {
      isFetchingRef.current = true;
      if (!isSilent) setLoading(true);
      const res = await CustomerAPI.getOverdueBookings();
      const list = res.data?.overdue_bookings || [];
      setOverdueBookings(list);
      return list;
    } catch {
      setOverdueBookings([]);
      return [];
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [user]);

  // Initial load on user auth ready
  useEffect(() => {
    if (isReady && isCustomer) {
      fetchOverdue().then((list) => {
        if (list && list.length > 0) {
          const sessionKey = `overdue_login_modal_shown:${user._id}`;
          const alreadyShown = sessionStorage.getItem(sessionKey);
          if (!alreadyShown) {
            sessionStorage.setItem(sessionKey, "true");
            setModalState({ open: true, mode: "login" });
          }
        }
      });
    } else if (!user) {
      setOverdueBookings([]);
      setModalState({ open: false, mode: "inquiry_block" });
    }
  }, [isReady, isCustomer, user?._id, fetchOverdue]);

  // Listen to realtime socket updates
  useRealTimeRefresh(() => {
    if (isCustomer) {
      fetchOverdue(true).then((list) => {
        // If overdue was settled and list is now empty, automatically close modal
        if (!list || list.length === 0) {
          setModalState((prev) => (prev.open ? { ...prev, open: false } : prev));
        }
      });
    }
  }, ["payment", "booking"]);

  const hasOverdue = overdueBookings.length > 0;

  /**
   * Guards any new inquiry/request action.
   * If customer has overdue bookings, blocks execution and displays the modal.
   * Otherwise, executes onAllowed callback.
   */
  const checkOverdueAndProceed = useCallback(
    async (onAllowed) => {
      if (!isCustomer) {
        if (typeof onAllowed === "function") onAllowed();
        return true;
      }

      // Fast check in memory + verify with fresh backend data
      if (overdueBookings.length > 0) {
        setModalState({ open: true, mode: "inquiry_block" });
        return false;
      }

      const freshList = await fetchOverdue(true);
      if (freshList && freshList.length > 0) {
        setModalState({ open: true, mode: "inquiry_block" });
        return false;
      }

      if (typeof onAllowed === "function") {
        onAllowed();
      }
      return true;
    },
    [isCustomer, overdueBookings, fetchOverdue]
  );

  const openOverdueModal = (mode = "inquiry_block") => {
    setModalState({ open: true, mode });
  };

  const closeOverdueModal = () => {
    setModalState((prev) => ({ ...prev, open: false }));
  };

  return (
    <OverduePaymentContext.Provider
      value={{
        hasOverdue,
        overdueBookings,
        loading,
        refreshOverdue: fetchOverdue,
        checkOverdueAndProceed,
        openOverdueModal,
        closeOverdueModal,
      }}
    >
      {children}

      <OverduePaymentNoticeModal
        open={modalState.open}
        mode={modalState.mode}
        overdueBookings={overdueBookings}
        onClose={closeOverdueModal}
      />
    </OverduePaymentContext.Provider>
  );
}

export function useOverduePayment() {
  const context = useContext(OverduePaymentContext);
  if (!context) {
    throw new Error("useOverduePayment must be used within an OverduePaymentProvider");
  }
  return context;
}
