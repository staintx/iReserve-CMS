import React, { useState, useEffect, useMemo, useCallback } from "react";
import { StaffAPI } from "../../api/staff";
import { ManagerAPI } from "../../api/manager";
import useToast from "../../hooks/useToast";
import { 
  Calendar, 
  CalendarDays, 
  CalendarOff, 
  X, 
  Info, 
  Trash2, 
  Check, 
  AlertTriangle,
  Clock
} from "lucide-react";

const toDateKey = (date) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${yr}-${mo}-${da}`;
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = String(dateStr).split("-").map(Number);
  if (!year || !month || !day) return dateStr;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

const QUICK_PRESETS = [
  "Day Off",
  "Personal Leave",
  "Personal Appointment",
  "Staff Training"
];

export default function AvailabilityModal({
  open,
  onClose,
  initialMonth = new Date(),
  initialUnavailable = [],
  assignments = [],
  onSave,
  userRole = "staff",
}) {
  if (!open) return null;

  return (
    <AvailabilityModalContent
      onClose={onClose}
      initialMonth={initialMonth}
      initialUnavailable={initialUnavailable}
      assignments={assignments}
      onSave={onSave}
      userRole={userRole}
    />
  );
}

function AvailabilityModalContent({
  onClose,
  initialMonth,
  initialUnavailable = [],
  assignments = [],
  onSave,
  userRole = "staff",
}) {
  const { notify } = useToast();
  const api = userRole === "manager" ? ManagerAPI : StaffAPI;

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  // Tabs: "form" (Set Availability) | "saved" (Saved Off-Duty Dates)
  const [activeTab, setActiveTab] = useState("form");

  // Mode: "single" | "range"
  const [isRange, setIsRange] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Saved records
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Load saved availability records from server
  const loadSavedRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const res = await api.getAvailability("", { upcoming: "true" });
      if (res.data?.records && Array.isArray(res.data.records)) {
        setRecords(res.data.records);
      } else if (res.data?.unavailable && Array.isArray(res.data.unavailable)) {
        setRecords(
          res.data.unavailable.map((d, idx) => ({
            _id: `temp-${idx}`,
            date: d,
            reason: ""
          }))
        );
      }
    } catch {
      // Fallback to initial unavailable list from parent
      if (Array.isArray(initialUnavailable)) {
        setRecords(
          initialUnavailable.map((d, idx) => ({
            _id: `init-${idx}`,
            date: typeof d === "string" ? d : d.date || "",
            reason: typeof d === "object" ? d.reason || "" : ""
          }))
        );
      }
    } finally {
      setLoadingRecords(false);
    }
  }, [api, initialUnavailable]);

  useEffect(() => {
    loadSavedRecords();
  }, [loadSavedRecords]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Set of already unavailable dates for validation warning
  const unavailableDatesSet = useMemo(() => {
    const set = new Set();
    records.forEach((r) => {
      if (r.date) set.add(r.date);
    });
    return set;
  }, [records]);

  // Set of assigned event dates
  const assignedDatesSet = useMemo(() => {
    const set = new Set();
    (assignments || []).forEach((item) => {
      if (item.date) set.add(toDateKey(new Date(item.date)));
    });
    return set;
  }, [assignments]);

  // Compute inline validation message
  const rangeValidationError = useMemo(() => {
    if (!isRange) return "";
    if (!startDate || !endDate) return "";
    if (startDate === endDate) {
      return "Start Date and End Date must be different. For a single day, switch to Single Day above.";
    }
    if (endDate < startDate) {
      return "End Date cannot be earlier than Start Date.";
    }
    return "";
  }, [isRange, startDate, endDate]);

  // Duplicate / assignment warnings
  const conflictWarning = useMemo(() => {
    if (isRange) {
      if (!startDate || !endDate || startDate >= endDate) return "";
      // Check if any date in range overlaps with assigned event
      const start = new Date(startDate);
      const end = new Date(endDate);
      const curr = new Date(start);
      let foundAssignment = null;
      while (curr <= end) {
        const k = toDateKey(curr);
        if (assignedDatesSet.has(k)) {
          foundAssignment = k;
          break;
        }
        curr.setDate(curr.getDate() + 1);
      }
      if (foundAssignment) {
        return `Notice: You have an existing event assignment on ${formatDateDisplay(foundAssignment)}. Marking this range will preserve your current assignment but prevent new bookings.`;
      }
    } else {
      if (!singleDate) return "";
      if (unavailableDatesSet.has(singleDate)) {
        return `Notice: ${formatDateDisplay(singleDate)} is already recorded in your unavailable schedule. Saving will update the reason.`;
      }
      if (assignedDatesSet.has(singleDate)) {
        return `Notice: You have an existing event assignment on ${formatDateDisplay(singleDate)}. Your existing assignment will be preserved.`;
      }
    }
    return "";
  }, [isRange, singleDate, startDate, endDate, assignedDatesSet, unavailableDatesSet]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!isRange) {
      if (!singleDate) {
        setFormError("Please select a date.");
        return;
      }
    } else {
      if (!startDate || !endDate) {
        setFormError("Please select both a Start Date and an End Date.");
        return;
      }
      if (startDate === endDate) {
        setFormError("Start Date and End Date must be different in Date Range mode.");
        return;
      }
      if (endDate < startDate) {
        setFormError("End Date cannot be earlier than Start Date.");
        return;
      }
    }

    if (!reason.trim()) {
      setFormError("Please provide a reason or note for your unavailability.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = isRange
        ? { startDate, endDate, reason: reason.trim() }
        : { date: singleDate, reason: reason.trim() };

      if (onSave) {
        await onSave(payload);
      } else {
        await api.setAvailability(payload);
        notify("Availability saved successfully.", "success");
      }

      onClose();
    } catch (err) {
      setFormError(
        err.response?.data?.message || err.message || "Failed to save availability. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = async (record) => {
    if (!record) return;
    setDeletingId(record._id);
    try {
      if (record._id && !record._id.startsWith("temp-") && !record._id.startsWith("init-")) {
        await api.removeAvailability(record._id);
      } else {
        await api.removeAvailability("", { params: { date: record.date } });
      }
      notify(`Removed unavailability for ${formatDateDisplay(record.date)}.`, "success");
      setRecordToDelete(null);
      await loadSavedRecords();
      if (onSave) {
        // Trigger parent refresh
        onSave({ refreshOnly: true });
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to remove availability record.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-card rounded-xl border border-border max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in duration-150 my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-modal-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <h3 id="availability-modal-title" className="text-base font-bold text-foreground flex items-center gap-2">
            <CalendarOff size={16} className="text-primary" /> Set My Availability
          </h3>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Toggle: Set Availability vs Saved Dates */}
        <div className="flex items-center gap-2 border-b border-border/70 pb-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab("form"); setFormError(""); }}
            className={`pb-1 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === "form"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Request Unavailability
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("saved"); setFormError(""); }}
            className={`pb-1 px-1 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "saved"
                ? "border-primary text-primary font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>My Requests &amp; Schedule</span>
            {records.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-foreground border border-border/70 font-bold">
                {records.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "form" ? (
          /* Form Content: Modeled directly after Admin Block Calendar Date(s) Modal */
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Role-based approval policy note */}
            <div className="p-2.5 rounded-lg bg-blue-50/70 border border-blue-200 text-xs text-blue-900 font-medium flex items-start gap-2">
              <Info size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <span>
                {userRole === "manager"
                  ? "Manager availability requests are submitted as Pending and require Admin review before taking effect."
                  : "Staff availability requests are submitted as Pending and require Manager or Admin review before taking effect."}
              </span>
            </div>

            {formError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-2">
                <Info size={14} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Range Toggle */}
            <div className="flex items-center justify-between bg-muted p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                disabled={submitting}
                onClick={() => { setIsRange(false); setFormError(""); }}
                className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                  !isRange ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Single Day
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setIsRange(true);
                  setFormError("");
                  if (singleDate && !startDate) {
                    setStartDate(singleDate);
                  }
                }}
                className={`flex-1 py-1 rounded-md text-center transition-all cursor-pointer ${
                  isRange ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Date Range
              </button>
            </div>

            {/* Date Inputs */}
            {!isRange ? (
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Unavailable Date
                </label>
                <input
                  type="date"
                  min={todayKey}
                  value={singleDate}
                  onChange={(e) => {
                    setSingleDate(e.target.value);
                    setFormError("");
                  }}
                  className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 max-sm:grid-cols-1">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    min={todayKey}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setFormError("");
                    }}
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    min={startDate || todayKey}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setFormError("");
                    }}
                    className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
              </div>
            )}

            {/* Range Validation Error Message */}
            {rangeValidationError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-start gap-2">
                <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>{rangeValidationError}</span>
              </div>
            )}

            {/* Existing Assignment / Duplicate Conflict Notice */}
            {conflictWarning && !rangeValidationError && (
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 font-medium flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>{conflictWarning}</span>
              </div>
            )}

            {/* Reason / Notes Input */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Reason / Notes <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Day Off, Personal Leave, Staff Training"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setFormError("");
                }}
                required
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Quick Reason Presets */}
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                QUICK REASON PRESETS
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={submitting}
                    onClick={() => setReason(preset)}
                    className="text-[11px] bg-muted hover:bg-muted/80 text-foreground px-2 py-0.5 rounded-md border border-border/60 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Helper link to view saved dates if any exist */}
            {records.length > 0 && (
              <div className="pt-1 text-xs text-muted-foreground flex items-center justify-between">
                <span>You have <strong>{records.length}</strong> recorded request(s) or saved date(s).</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("saved")}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  View Status &rarr;
                </button>
              </div>
            )}

            {/* Form Footer Buttons */}
            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  (!isRange && !singleDate) ||
                  (isRange && (!startDate || !endDate || Boolean(rangeValidationError))) ||
                  !reason.trim()
                }
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Submitting..." : "Submit Request"}
              </button>
            </div>
          </form>
        ) : (
          /* Saved Dates View */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground">
                Your Availability Requests ({records.length})
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className="text-primary hover:underline font-semibold cursor-pointer text-xs"
              >
                + New Request
              </button>
            </div>

            {loadingRecords ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Loading schedule...
              </div>
            ) : records.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                <Calendar className="mx-auto text-muted-foreground/50" size={28} />
                <p>No availability requests or off-duty dates recorded.</p>
                <p className="text-[11px]">You are currently marked as available for event assignments.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("form")}
                  className="mt-2 px-3 py-1 bg-primary text-white rounded-md text-xs font-semibold cursor-pointer hover:bg-primary-hover transition-colors"
                >
                  Submit Request
                </button>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {records.map((rec) => {
                  const isConfirming = recordToDelete === rec._id;
                  const isDeleting = deletingId === rec._id;
                  const status = rec.status || "approved";

                  return (
                    <div
                      key={rec._id || rec.date}
                      className="p-2.5 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground">
                              {formatDateDisplay(rec.date)}
                            </span>

                            {/* Status Badge */}
                            {status === "pending" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-md">
                                <Clock size={10} className="text-amber-600" /> Pending Approval
                              </span>
                            ) : status === "rejected" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded-md">
                                <X size={10} className="text-rose-600" /> Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 px-1.5 py-0.2 rounded-md">
                                <Check size={10} className="text-emerald-600" /> Approved
                              </span>
                            )}

                            {rec.reason && (
                              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border/60">
                                {rec.reason}
                              </span>
                            )}
                          </div>
                        </div>

                        {isConfirming ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-rose-700 font-semibold">Cancel request?</span>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => handleDeleteRecord(rec)}
                              className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer disabled:opacity-50"
                            >
                              {isDeleting ? "..." : "Yes"}
                            </button>
                            <button
                              type="button"
                              disabled={isDeleting}
                              onClick={() => setRecordToDelete(null)}
                              className="px-1.5 py-0.5 rounded border border-border text-[11px] text-muted-foreground hover:bg-muted cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setRecordToDelete(rec._id)}
                            title={status === "pending" ? "Cancel request" : "Remove unavailable date"}
                            className="text-muted-foreground hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Rejection reason or reviewer metadata */}
                      {status === "rejected" && rec.rejection_reason && (
                        <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200/80 rounded px-2 py-1">
                          <strong>Rejection reason:</strong> {rec.rejection_reason}
                        </div>
                      )}

                      {status === "approved" && rec.reviewed_by && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <span>Reviewed &amp; approved by {rec.reviewed_by}</span>
                          {rec.reviewed_at && (
                            <span>• {new Date(rec.reviewed_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-border flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
