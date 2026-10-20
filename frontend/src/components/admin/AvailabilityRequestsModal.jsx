import React, { useState, useEffect, useMemo, useCallback } from "react";
import { ManagerAPI } from "../../api/manager";
import useToast from "../../hooks/useToast";
import {
  CalendarOff,
  Check,
  X,
  AlertTriangle,
  Clock,
  Search,
  ShieldCheck,
  UserCheck,
  Info,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from "lucide-react";

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

export default function AvailabilityRequestsModal({
  open,
  onClose,
  currentUser,
  onUpdated
}) {
  if (!open) return null;

  return (
    <AvailabilityRequestsModalContent
      onClose={onClose}
      currentUser={currentUser}
      onUpdated={onUpdated}
    />
  );
}

function AvailabilityRequestsModalContent({ onClose, currentUser, onUpdated }) {
  const { notify } = useToast();
  const isAdmin = currentUser?.role === "admin";
  const isManager = currentUser?.role === "manager";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "rejected" | "all"
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | "staff" | "manager"
  const [search, setSearch] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [rejectionTarget, setRejectionTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ManagerAPI.getAvailabilityRequests();
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      notify("Failed to load availability requests.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length
    };
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      const matchTab = activeTab === "all" || req.status === activeTab;
      const reqRole = req.user_id?.role || "staff";
      const matchRole = roleFilter === "all" || reqRole === roleFilter;

      const userName = req.user_id?.full_name || "";
      const userEmail = req.user_id?.email || "";
      const reason = req.reason || "";
      const date = req.date || "";

      const matchSearch =
        !search ||
        userName.toLowerCase().includes(search.toLowerCase()) ||
        userEmail.toLowerCase().includes(search.toLowerCase()) ||
        reason.toLowerCase().includes(search.toLowerCase()) ||
        date.includes(search);

      return matchTab && matchRole && matchSearch;
    });
  }, [requests, activeTab, roleFilter, search]);

  const canReviewRequest = (req) => {
    const requesterId = req.user_id?._id || req.user_id;
    const requesterRole = req.user_id?.role || "staff";

    // Staff and managers cannot review their own requests
    if (String(currentUser?._id) === String(requesterId)) {
      return { allowed: false, reason: "You cannot approve or reject your own availability request." };
    }

    // Manager availability requests: Only Admin may approve or reject
    if (requesterRole === "manager") {
      if (!isAdmin) {
        return { allowed: false, reason: "Only Administrators can approve or reject Manager requests." };
      }
    }

    // Staff availability requests: Admin or Manager may approve or reject
    if (requesterRole === "staff") {
      if (!isAdmin && !isManager) {
        return { allowed: false, reason: "Unauthorized to review staff availability requests." };
      }
    }

    return { allowed: true };
  };

  const handleApprove = async (req) => {
    const authCheck = canReviewRequest(req);
    if (!authCheck.allowed) {
      notify(authCheck.reason, "error");
      return;
    }

    if (req.conflicts && req.conflicts.length > 0) {
      notify(
        `Cannot approve: ${req.user_id?.full_name || "Employee"} has ${req.conflicts.length} conflicting event assignment(s) on this date. Reassign or resolve the assignments first.`,
        "error"
      );
      return;
    }

    setActionLoadingId(req._id);
    try {
      const res = await ManagerAPI.approveAvailabilityRequest(req._id);
      notify(res.data?.message || "Availability request approved.", "success");
      await fetchRequests();
      if (onUpdated) onUpdated();
    } catch (err) {
      notify(
        err.response?.data?.message || "Failed to approve availability request.",
        "error"
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReject = (req) => {
    const authCheck = canReviewRequest(req);
    if (!authCheck.allowed) {
      notify(authCheck.reason, "error");
      return;
    }
    setRejectionTarget(req);
    setRejectionReason("");
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionTarget) return;

    setRejecting(true);
    try {
      const res = await ManagerAPI.rejectAvailabilityRequest(rejectionTarget._id, {
        rejection_reason: rejectionReason.trim()
      });
      notify(res.data?.message || "Availability request rejected.", "success");
      setRejectionTarget(null);
      setRejectionReason("");
      await fetchRequests();
      if (onUpdated) onUpdated();
    } catch (err) {
      notify(
        err.response?.data?.message || "Failed to reject availability request.",
        "error"
      );
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !actionLoadingId && !rejecting) {
          onClose();
        }
      }}
    >
      <div
        className="bg-card rounded-2xl border border-border max-w-3xl w-full p-4 sm:p-6 shadow-2xl space-y-4 my-auto animate-in fade-in zoom-in duration-150 flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="availability-requests-title"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <CalendarOff size={18} />
            </div>
            <div>
              <h2 id="availability-requests-title" className="text-base sm:text-lg font-bold text-foreground">
                Staff &amp; Manager Availability Requests
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Review and approve or reject requested off-duty dates with conflict detection
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar: Status Tabs & Role Filter & Search */}
        <div className="space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border/80 w-fit">
              {[
                { id: "pending", label: "Pending", count: counts.pending, tone: "amber" },
                { id: "approved", label: "Approved", count: counts.approved, tone: "emerald" },
                { id: "rejected", label: "Rejected", count: counts.rejected, tone: "rose" },
                { id: "all", label: "All", count: counts.all, tone: "slate" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-card text-foreground shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        tab.tone === "amber"
                          ? "bg-amber-100 text-amber-800"
                          : tab.tone === "emerald"
                          ? "bg-emerald-100 text-emerald-800"
                          : tab.tone === "rose"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Role Filter (Admins can toggle Staff vs Manager) */}
            {isAdmin && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground font-semibold">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border border-border rounded-lg px-2.5 py-1 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="staff">Staff Only</option>
                  <option value="manager">Managers Only</option>
                </select>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by employee name, email, date, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
              <Clock className="mx-auto text-muted-foreground/60 animate-spin" size={24} />
              <p>Loading availability requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-border/80 rounded-xl">
              <Calendar className="mx-auto text-muted-foreground/40" size={32} />
              <p className="font-semibold text-foreground">No requests found</p>
              <p className="text-[11px]">
                {activeTab === "pending"
                  ? "There are currently no pending availability requests awaiting review."
                  : "No availability requests matched your filter criteria."}
              </p>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const requester = req.user_id || {};
              const requesterRole = requester.role || "staff";
              const isManagerReq = requesterRole === "manager";
              const isPending = req.status === "pending";
              const isApproved = req.status === "approved";
              const isRejected = req.status === "rejected";
              const hasConflicts = req.conflicts && req.conflicts.length > 0;
              const auth = canReviewRequest(req);
              const isProcessing = actionLoadingId === req._id;

              return (
                <div
                  key={req._id}
                  className={`rounded-xl border p-3.5 sm:p-4 space-y-3 transition-colors ${
                    hasConflicts && isPending
                      ? "border-rose-300 bg-rose-50/20"
                      : isPending
                      ? "border-amber-200/90 bg-amber-50/15"
                      : "border-border bg-card hover:bg-muted/20"
                  }`}
                >
                  {/* Top Row: Requester Info & Status Badge */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 border border-primary/20">
                        {(requester.full_name || "?")
                          .split(" ")
                          .filter(Boolean)
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground">
                            {requester.full_name || "Unknown Member"}
                          </span>
                          {isManagerReq ? (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-mono font-bold rounded-md">
                              <ShieldCheck size={10} className="text-amber-600" /> Event Manager
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono font-semibold rounded-md">
                              <UserCheck size={10} className="text-slate-600" /> Staff
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground">
                            {requester.position || (isManagerReq ? "Coordinator" : "Catering Staff")}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {requester.email} {requester.phone ? `• ${requester.phone}` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 self-start sm:self-auto">
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <Clock size={11} className="text-amber-600" /> Pending Review
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check size={11} className="text-emerald-600" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          <X size={11} className="text-rose-600" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle Row: Requested Date & Reason */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-muted/40 p-2.5 rounded-lg border border-border/60">
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10.5px] uppercase tracking-wider">
                        Requested Unavailable Date
                      </span>
                      <span className="font-bold text-foreground text-xs sm:text-sm">
                        {formatDateDisplay(req.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[10.5px] uppercase tracking-wider">
                        Reason / Notes
                      </span>
                      <span className="font-medium text-foreground">
                        {req.reason || "No reason provided"}
                      </span>
                    </div>
                  </div>

                  {/* Conflict Detection Banner (CRITICAL) */}
                  {hasConflicts && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-300 text-xs text-rose-900 space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-1.5 font-bold text-rose-950">
                        <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                        <span>
                          Scheduling Conflict Detected ({req.conflicts.length} event assignment{req.conflicts.length === 1 ? "" : "s"})
                        </span>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-rose-800">
                        {requester.full_name} is already assigned to active event(s) on this date.
                        Approval is <strong>prevented</strong> until conflicting assignments are resolved or reassigned.
                      </p>
                      <div className="space-y-1 pt-1">
                        {req.conflicts.map((c) => (
                          <div
                            key={c.booking_id}
                            className="bg-white/90 p-2 rounded border border-rose-200 text-[11px] flex items-center justify-between gap-2"
                          >
                            <div>
                              <strong className="text-foreground">{c.reference}</strong> •{" "}
                              <span className="font-semibold text-rose-900">{c.event_type}</span> (
                              {c.customer_name})
                            </div>
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 font-semibold text-[10px]">
                              {c.assigned_as}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Review Audit Info (if approved or rejected) */}
                  {(isApproved || isRejected) && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t border-border/50">
                      {req.reviewed_by && (
                        <div>
                          Reviewed by <strong>{req.reviewed_by.full_name}</strong> ({req.reviewed_by.role})
                          {req.reviewed_at ? ` on ${new Date(req.reviewed_at).toLocaleString()}` : ""}
                        </div>
                      )}
                      {isRejected && req.rejection_reason && (
                        <div className="text-rose-700 bg-rose-50 p-1.5 rounded border border-rose-200 mt-1">
                          <strong>Rejection reason:</strong> {req.rejection_reason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Authorization Notice (if reviewer lacks role) */}
                  {!auth.allowed && isPending && (
                    <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded border border-amber-200 flex items-center gap-1.5">
                      <Info size={13} className="text-amber-600 shrink-0" />
                      <span>{auth.reason}</span>
                    </div>
                  )}

                  {/* Action Buttons for Reviewer */}
                  {isPending && auth.allowed && (
                    <div className="pt-2 border-t border-border flex items-center justify-end gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleOpenReject(req)}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Reject Request
                      </button>

                      <button
                        type="button"
                        disabled={isProcessing || hasConflicts}
                        onClick={() => handleApprove(req)}
                        title={hasConflicts ? "Cannot approve: Unresolved scheduling conflicts exist" : "Approve availability request"}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer ${
                          hasConflicts
                            ? "bg-slate-200 text-slate-500 border border-slate-300 cursor-not-allowed opacity-60"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        <Check size={13} />
                        <span>{isProcessing ? "Approving..." : "Approve Request"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-between shrink-0 text-xs">
          <span className="text-muted-foreground">
            Showing <strong>{filteredRequests.length}</strong> of <strong>{requests.length}</strong> requests
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Rejection Reason Submodal */}
      {rejectionTarget && (
        <div className="fixed inset-0 z-60 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleConfirmReject}
            className="bg-card rounded-xl border border-border max-w-md w-full p-4 sm:p-5 shadow-2xl space-y-3.5 animate-in fade-in zoom-in duration-150"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                <X size={16} className="text-rose-600" /> Reject Availability Request
              </h3>
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setRejectionTarget(null)}
                className="text-muted-foreground hover:text-foreground p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Rejecting request for <strong>{rejectionTarget.user_id?.full_name}</strong> on{" "}
              <strong>{formatDateDisplay(rejectionTarget.date)}</strong>. The requester will be notified.
            </p>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Reason for Rejection <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Inadequate staffing coverage for peak weekend events; please select alternate dates."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border border-border rounded-lg px-2.5 py-1.5 text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={rejecting}
                onClick={() => setRejectionTarget(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={rejecting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer disabled:opacity-50"
              >
                {rejecting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
