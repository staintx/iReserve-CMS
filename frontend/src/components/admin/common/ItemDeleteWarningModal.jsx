import React, { useState, useEffect } from "react";
import { AlertTriangle, Trash2, Package, Calendar, FileText, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AdminAPI } from "../../../api/admin";
import Btn from "../ui/Btn";

/**
 * ItemDeleteWarningModal
 * 
 * Informational delete confirmation modal for Inventory & Food Menu items.
 * Before deletion, checks where the item is used:
 * - Packages / Combos
 * - Upcoming / Confirmed Bookings
 * - Active Inquiries
 * - Quotations
 * 
 * Displays appropriate warnings without blocking the admin from deleting.
 */
export default function ItemDeleteWarningModal({
  isOpen,
  onClose,
  onConfirm,
  item,
  type = "inventory", // "inventory" | "menu"
  confirmText,
}) {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const itemName = item ? (item.item_name || item.name || "this item") : "this item";

  useEffect(() => {
    if (!isOpen || !item?._id) return;
    let isMounted = true;
    setLoading(true);
    setError("");

    const fetchUsage = type === "menu" ? AdminAPI.getMenuUsage : AdminAPI.getInventoryUsage;
    fetchUsage(item._id)
      .then((res) => {
        if (isMounted) {
          setUsage(res.data);
        }
      })
      .catch((err) => {
        console.error("Failed to check item usage:", err);
        if (isMounted) {
          setError("Could not check current usage details. You may still proceed with deletion.");
          setUsage({ hasUsage: false, hasActiveCustomerUsage: false });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, item?._id, type]);

  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Failed to delete item:", err);
      setDeleting(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const hasActiveCustomerUsage = usage?.hasActiveCustomerUsage;
  const hasUsage = usage?.hasUsage;

  const resolvedConfirmText =
    confirmText || (type === "menu" ? "Delete Item" : "Delete Item");

  // Determine modal header icon and title
  let modalTitle = `Delete ${type === "menu" ? "Food Menu Item" : "Inventory Item"}`;
  let HeaderIcon = Trash2;
  let iconBgClass = "bg-rose-100 text-rose-600";

  if (hasActiveCustomerUsage) {
    modalTitle = `Warning: ${type === "menu" ? "Food Item Currently Used" : "Inventory Item Currently Used"}`;
    HeaderIcon = AlertTriangle;
    iconBgClass = "bg-amber-100 text-amber-600";
  } else if (hasUsage) {
    modalTitle = `Warning: ${type === "menu" ? "Food Item In Use" : "Inventory Item In Use"}`;
    HeaderIcon = AlertTriangle;
    iconBgClass = "bg-amber-100 text-amber-600";
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="bg-card rounded-xl border border-border/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass}`}>
                <HeaderIcon size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug">
                  {modalTitle}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm deletion of item from the catalog
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2.5 text-muted-foreground">
                <Loader2 size={24} className="animate-spin text-primary" />
                <p className="text-xs font-medium">Checking where this item is currently used…</p>
              </div>
            ) : (
              <>
                {/* Active Customer Usage Alert Banner */}
                {hasActiveCustomerUsage && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200/80 flex items-start gap-2.5 text-amber-900">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <p className="font-bold text-amber-950">
                        Deleting this {type === "menu" ? "food" : "inventory"} item may affect an active customer transaction.
                      </p>
                      <p className="text-amber-800/90 text-[11px] leading-relaxed">
                        The admin should still be able to choose whether to proceed. Do not automatically modify or delete the inquiry, quotation, or booking.
                      </p>
                    </div>
                  </div>
                )}

                {/* Primary statement */}
                <div>
                  {hasUsage ? (
                    <p className="text-xs sm:text-sm text-foreground/90">
                      <span className="font-bold text-foreground">"{itemName}"</span> is currently{" "}
                      {hasActiveCustomerUsage ? "used" : "included"} in:
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm text-foreground/90">
                      Are you sure you want to delete <span className="font-bold text-foreground">"{itemName}"</span>? This action cannot be undone.
                    </p>
                  )}
                </div>

                {/* Usage Lists */}
                {hasUsage && (
                  <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                    {/* Packages / Combos */}
                    {usage.packages && usage.packages.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Package size={12} className="text-primary" />
                          Packages ({usage.packages.length})
                        </span>
                        <div className="space-y-1.5">
                          {usage.packages.map((pkg) => (
                            <div
                              key={pkg._id || pkg.name}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/70 text-xs"
                            >
                              <span className="font-semibold text-foreground truncate">{pkg.name}</span>
                              <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {pkg.offer_type === "special" ? "Special Combo" : "Event Package"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Bookings */}
                    {usage.activeBookings && usage.activeBookings.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                          <Calendar size={12} className="text-amber-600" />
                          Upcoming / Confirmed Bookings ({usage.activeBookings.length})
                        </span>
                        <div className="space-y-1.5">
                          {usage.activeBookings.map((b) => (
                            <div
                              key={b._id}
                              className="flex items-center justify-between p-2 rounded-md bg-amber-50/60 border border-amber-200/70 text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-amber-950 truncate">
                                  Upcoming Booking #{b.reference} on {formatDate(b.event_date)}
                                </p>
                                <p className="text-[11px] text-amber-800/80 truncate">
                                  {b.package_name} {b.customer_name ? `· ${b.customer_name}` : ""}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded capitalize shrink-0">
                                {b.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Inquiries */}
                    {usage.activeInquiries && usage.activeInquiries.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                          <FileText size={12} className="text-blue-600" />
                          Active Customer Inquiries ({usage.activeInquiries.length})
                        </span>
                        <div className="space-y-1.5">
                          {usage.activeInquiries.map((inq) => (
                            <div
                              key={inq._id}
                              className="flex items-center justify-between p-2 rounded-md bg-blue-50/60 border border-blue-200/70 text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-blue-950 truncate">
                                  Customer Inquiry #{inq.reference} on {formatDate(inq.event_date)}
                                </p>
                                <p className="text-[11px] text-blue-800/80 truncate">
                                  {inq.package_name} {inq.customer_name ? `· ${inq.customer_name}` : ""}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-200/60 px-1.5 py-0.5 rounded capitalize shrink-0">
                                {inq.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Active Quotations */}
                    {usage.activeQuotations && usage.activeQuotations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                          <FileText size={12} className="text-indigo-600" />
                          Active Quotations ({usage.activeQuotations.length})
                        </span>
                        <div className="space-y-1.5">
                          {usage.activeQuotations.map((q) => (
                            <div
                              key={q._id}
                              className="flex items-center justify-between p-2 rounded-md bg-indigo-50/60 border border-indigo-200/70 text-xs"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-indigo-950 truncate">
                                  Quotation #{q.quotation_number}
                                </p>
                                <p className="text-[11px] text-indigo-800/80 truncate">
                                  {q.package_name}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold text-indigo-800 bg-indigo-200/60 px-1.5 py-0.5 rounded capitalize shrink-0">
                                {q.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Clarification notes */}
                {hasUsage && (
                  <p className="text-[11px] text-muted-foreground/90 italic pt-1">
                    Important: Deleting this item will only remove it from the current {type === "menu" ? "Food Menu" : "Inventory"} catalog. Historical/completed events and active records will remain intact.
                  </p>
                )}

                {error && (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-md border border-rose-200/70">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Footer buttons */}
          <div className="px-5 py-3 border-t border-border/60 flex items-center justify-end gap-2.5 bg-muted/20">
            <Btn
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={deleting}
            >
              Cancel
            </Btn>
            <Btn
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || loading}
            >
              {deleting ? (
                <>
                  <Loader2 size={13} className="animate-spin mr-1.5" /> Deleting…
                </>
              ) : (
                <>
                  <Trash2 size={13} className="mr-1.5" /> {resolvedConfirmText}
                </>
              )}
            </Btn>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
