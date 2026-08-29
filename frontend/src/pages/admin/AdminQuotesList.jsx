import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import { AdminAPI } from "../../api/admin";

import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { 
  FileText, 
  Clock, 
  Send, 
  CheckCircle, 
  Check,
  Search, 
  Filter, 
  PlusCircle,
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Utensils,
  ChevronDown,
  ChevronRight,
  CreditCard,
  History
} from "lucide-react";

/** Version pill in the revision history: unsent draft, current, or superseded. */
function versionBadgeTone(isDraft, isLatestIssued) {
  if (isDraft) return "bg-amber-100 text-amber-800";
  if (isLatestIssued) return "bg-emerald-100 text-emerald-800";
  return "bg-slate-100 text-slate-600";
}

export default function AdminQuotesList() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all_quotes");
  const [expandedRows, setExpandedRows] = useState({});

  /**
   * Payment state per booking, keyed by booking id.
   *
   * A converted booking that already paid its deposit is not "awaiting
   * deposit" even though its quotation still carries the same total.
   * Quotations themselves do not record payment, so we read the booking's
   * live payment_status back from the bookings collection to decide.
   */
  const [bookingPayments, setBookingPayments] = useState(() => new Map());

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [qtnRes, bookingRes] = await Promise.all([
        AdminAPI.getAllQuotations(),
        AdminAPI.getBookings().catch(() => ({ data: [] })),
      ]);
      setQuotations(qtnRes.data || []);
      setBookingPayments(
        new Map((bookingRes.data || []).map((b) => [String(b._id), b.payment_status || "pending"])),
      );
    } catch (err) {
      notify(err.response?.data?.message || "Could not load quotations list.", "error");
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealTimeRefresh(loadData);

  const toggleExpand = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group quotations by inquiry ID to present only the latest active version per inquiry thread
  const groupedQuotations = useMemo(() => {
    const groups = {};
    quotations.forEach(q => {
      const inqId = (q.inquiry_id && q.inquiry_id._id) ? String(q.inquiry_id._id) : String(q.inquiry_id || q._id);
      if (!groups[inqId]) {
        groups[inqId] = [];
      }
      groups[inqId].push(q);
    });

    return Object.values(groups).map(versionList => {
      versionList.sort((a, b) => (b.version_number || 1) - (a.version_number || 1));
      // A draft carries the next version number but has never been issued, so
      // it must not stand in for the version the customer is actually holding.
      // It would otherwise replace a Sent quotation's status and total here,
      // and drop that quotation out of the counts above.
      const issued = versionList.filter(q => q.status !== "Draft");
      const draft = versionList.find(q => q.status === "Draft") || null;
      const latest = issued[0] || draft;
      return {
        ...latest,
        hasDraft: Boolean(draft),
        history: versionList
      };
    });
  }, [quotations]);

  /**
   * Whether an accepted quotation is still waiting on the customer's deposit.
   *
   * Only accepted quotations take deposits — an inquiry still under review
   * or a draft nobody has sent yet is waiting on the office, not on money.
   * If the quotation has already been converted to a booking, we look at the
   * booking's payment_status; if it is still only an inquiry, the deposit
   * has not been recorded yet.
   */
  const isAwaitingDeposit = useCallback((q) => {
    const isAccepted =
      q.status === "Accepted" ||
      q.status === "Quote Accepted" ||
      q.status === "Awaiting Final Confirmation" ||
      q.status === "Converted to Booking";
    if (!isAccepted) return false;

    if (q.payment_status === "deposit_paid" || q.payment_status === "fully_paid" || q.is_paid) {
      return false;
    }

    const bookingId = q.inquiry_id?.converted_booking_id;
    if (!bookingId) return true;
    const paymentStatus = bookingPayments.get(String(bookingId?._id || bookingId));
    return paymentStatus === undefined || paymentStatus === "pending";
  }, [bookingPayments]);

  // Compute Metrics using latest version per inquiry
  const metrics = useMemo(() => {
    const totalQuotations = groupedQuotations.length;
    const sentQuotations = groupedQuotations.filter(q => q.status === "Sent" || q.status === "Quotation Sent").length;
    const revisionRequests = groupedQuotations.filter(q => q.status === "Revision Requested").length;
    const acceptedQuotations = groupedQuotations.filter(q =>
      q.status === "Accepted" || q.status === "Quote Accepted" || q.status === "Awaiting Final Confirmation" || q.status === "Converted to Booking"
    ).length;
    const awaitingDeposit = groupedQuotations.filter(isAwaitingDeposit).length;
    return { totalQuotations, sentQuotations, revisionRequests, acceptedQuotations, awaitingDeposit };
  }, [groupedQuotations, isAwaitingDeposit]);

  // Combine items depending on activeTab
  const displayItems = useMemo(() => {
    // Latest Quotations per Inquiry thread
    let items = groupedQuotations.map(q => {
      const inq = q.inquiry_id || {};
      const isPaid = Boolean(q.is_paid || q.payment_status === "deposit_paid" || q.payment_status === "fully_paid" || !isAwaitingDeposit(q));
      const payStatus = q.payment_status || (isPaid ? "deposit_paid" : "unpaid");

      return {
        type: "QUOTATION",
        id: q._id,
        inquiryId: inq._id || q.inquiry_id,
        quotationNumber: q.quotation_number || `QTN-${q._id.slice(-6).toUpperCase()}`,
        reference: inq.reference || "INQ",
        eventType: inq.event_type || "Event",
        customerName: inq.contact_first_name ? `${inq.contact_first_name} ${inq.contact_last_name}` : ([inq.customer_id?.first_name, inq.customer_id?.last_name].filter(Boolean).join(" ") || inq.customer_id?.full_name || "Customer"),
        customerContact: inq.contact_phone || inq.contact_email || inq.customer_id?.email,
        eventDate: inq.event_date,
        guestCount: q.guest_count || inq.guest_count,
        status: q.status,
        paymentStatus: payStatus,
        isPaid,
        awaitingDeposit: isAwaitingDeposit(q),
        hasDraft: Boolean(q.hasDraft),
        version: q.version_number || 1,
        totalCost: q.total_cost || 0,
        history: q.history || [q]
      };
    });

    if (activeTab === "sent") {
      items = items.filter(i => i.status === "Sent" || i.status === "Quotation Sent");
    } else if (activeTab === "revision") {
      items = items.filter(i => i.status === "Revision Requested");
    } else if (activeTab === "awaiting_deposit") {
      items = items.filter(i => i.awaitingDeposit);
    } else if (activeTab === "accepted") {
      items = items.filter(i =>
        i.status === "Accepted" || i.status === "Quote Accepted" || i.status === "Awaiting Final Confirmation" || i.status === "Converted to Booking"
      );
    }

    // Search filter
    if (search.trim()) {
      const query = search.toLowerCase();
      items = items.filter(item => {
        const ref = (item.reference || "").toLowerCase();
        const qtn = (item.quotationNumber || "").toLowerCase();
        const name = (item.customerName || "").toLowerCase();
        const event = (item.eventType || "").toLowerCase();
        return ref.includes(query) || qtn.includes(query) || name.includes(query) || event.includes(query);
      });
    }

    return items;
  }, [groupedQuotations, activeTab, search, isAwaitingDeposit]);

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pending Review":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Pending Review</span>;
      case "Under Review":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Under Review</span>;
      case "Revision Requested":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-200/60 flex items-center gap-1.5 w-fit"><RefreshCw size={12} /> Revision Requested</span>;
      case "Sent":
      case "Quotation Sent":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200/60 flex items-center gap-1.5 w-fit"><Send size={12} /> Quotation Sent</span>;
      case "Awaiting Final Confirmation":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 border border-purple-200/60 flex items-center gap-1.5 w-fit"><Clock size={12} /> Awaiting Final Confirmation</span>;
      case "Accepted":
      case "Quote Accepted":
      case "Converted to Booking":
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 flex items-center gap-1.5 w-fit"><CheckCircle size={12} /> Accepted</span>;
      default:
        return <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1.5 w-fit">{status}</span>;
    }
  };

  const getPaymentBadge = (status, isPaid) => {
    if (isPaid || status === "deposit_paid") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 flex items-center gap-1 w-fit">
          <Check size={11} className="text-emerald-700" /> Deposit Paid
        </span>
      );
    }
    if (status === "fully_paid") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200/60 flex items-center gap-1 w-fit">
          <CheckCircle size={11} className="text-emerald-700" /> Fully Paid
        </span>
      );
    }
    if (status === "pending") {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200/60 flex items-center gap-1 w-fit">
          <Clock size={11} /> Pending
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1 w-fit">
        Unpaid
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Quotations</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              One row per inquiry, showing its current quoted version.
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-card border border-border/80 text-foreground rounded-lg hover:bg-muted shadow-2xs transition-colors w-fit cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* KPI Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard title="All Quotations" value={metrics.totalQuotations} sub="Inquiry threads" icon={FileText} />
          <KPICard title="Revisions Requested" value={metrics.revisionRequests} sub="Customer requested" badge={metrics.revisionRequests > 0 ? "Review Needed" : null} icon={RefreshCw} />
          <KPICard title="Accepted Quotes" value={metrics.acceptedQuotations} sub="Approved by client" icon={CheckCircle} />
          <KPICard title="Awaiting Deposit" value={metrics.awaitingDeposit} sub="Pending downpayment" badge={metrics.awaitingDeposit > 0 ? "Deposit Pending" : null} icon={CreditCard} />
        </div>

        {/* Toolbar & Filters */}
        <AdminCard className="!p-3.5 sm:!p-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { id: "all_quotes", label: `All (${metrics.totalQuotations})` },
                { id: "sent", label: `Sent (${metrics.sentQuotations})` },
                { id: "revision", label: `Revisions (${metrics.revisionRequests})` },
                { id: "accepted", label: `Accepted (${metrics.acceptedQuotations})` },
                { id: "awaiting_deposit", label: `Awaiting Deposit (${metrics.awaitingDeposit})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? "bg-primary text-white shadow-2xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>


            {/* Search Bar */}

            <div className="relative w-full md:w-64">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search ref, QTN#, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs bg-card focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </AdminCard>


        {/* Quotation Records Table */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw size={24} className="animate-spin text-primary" />
              <p className="text-sm font-medium">Loading quotations...</p>
            </div>
          ) : displayItems.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <FileText size={40} className="mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">No Records Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">There are no records matching your current filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="py-3.5 px-6 font-semibold">Quote / Inquiry Ref</th>
                    <th className="py-3.5 px-6 font-semibold">Customer</th>
                    <th className="py-3.5 px-6 font-semibold">Event Date</th>
                    <th className="py-3.5 px-6 font-semibold">Quoted Total</th>
                    <th className="py-3.5 px-6 font-semibold">Quote Status</th>
                    <th className="py-3.5 px-6 font-semibold">Payment Status</th>
                    <th className="py-3.5 px-6 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {displayItems.map((item) => {
                    const isExpanded = !!expandedRows[item.id];
                    const hasHistory = item.history && item.history.length > 1;

                    return (
                      <React.Fragment key={item.id}>
                        <tr className={`transition-colors ${isExpanded ? "bg-amber-50/30" : "hover:bg-slate-50/80"}`}>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-powder text-primary rounded-lg border border-primary/20">
                                <Utensils size={18} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-slate-900">{item.quotationNumber || item.reference}</span>
                                  {item.version && (
                                    <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded border border-slate-200">
                                      v{item.version}
                                    </span>
                                  )}
                                  {hasHistory && (
                                    <button
                                      type="button"
                                      onClick={() => toggleExpand(item.id)}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded transition-colors shadow-2xs"
                                    >
                                      <History size={10} />
                                      <span>{item.history.length} Revisions</span>
                                      {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                    </button>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500 block mt-0.5">{item.eventType} ({item.reference})</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800 block">{item.customerName}</span>
                            <span className="text-xs text-slate-500">{item.customerContact || "No contact"}</span>
                          </td>
                          <td className="py-4 px-6 text-slate-600">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Calendar size={14} className="text-slate-400" />
                              {item.eventDate ? new Date(item.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {item.totalCost !== null ? (
                              <span className="font-bold text-emerald-600">₱{Number(item.totalCost).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</span>
                            ) : (
                              <span className="text-xs text-slate-400 italic">Not Quoted Yet</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex flex-col items-start gap-1.5">
                              {getStatusBadge(item.status)}
                              {item.hasDraft && item.status !== "Draft" && (
                                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                  Draft in progress
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            {getPaymentBadge(item.paymentStatus, item.isPaid)}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/quotes/${item.inquiryId}/details`)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary-hover rounded-lg transition-colors shadow-sm"
                            >
                              <Eye size={14} />
                              <span>View & Edit</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Version History Sub-row */}
                        {isExpanded && hasHistory && (
                          <tr className="bg-slate-50/90 border-t border-b border-amber-200/60">
                            <td colSpan={7} className="p-4 pl-14">
                              <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <History size={14} className="text-primary" /> Revision History for Inquiry {item.reference}
                                  </h4>
                                  <span className="text-[11px] text-slate-500 font-medium">Total Versions: {item.history.length}</span>
                                </div>
                                <div className="divide-y divide-slate-100 border border-slate-100 rounded-md overflow-hidden text-xs">
                                  {item.history.map((ver, idx) => {
                                    // A draft was never issued, so it is neither
                                    // the latest version nor something with an
                                    // issue date to report.
                                    const isDraft = ver.status === "Draft";
                                    const isLatestIssued = !isDraft && !item.history.slice(0, idx).some(v => v.status !== "Draft");
                                    return (
                                    <div key={ver._id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                      <div className="flex items-center gap-3">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${versionBadgeTone(isDraft, isLatestIssued)}`}>
                                          v{ver.version_number || 1} {isDraft ? "(Draft)" : isLatestIssued ? "(Latest)" : ""}
                                        </span>
                                        <span className="font-mono font-semibold text-slate-800">
                                          {ver.quotation_number || `QTN-${ver._id.slice(-6).toUpperCase()}`}
                                        </span>
                                        <span className="text-slate-400">|</span>
                                        <span className="text-slate-500">
                                          {isDraft ? "Not sent" : `Issued: ${ver.createdAt ? new Date(ver.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}`}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <span className="font-bold text-emerald-600">
                                          ₱{Number(ver.total_cost || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                        </span>
                                        {getStatusBadge(ver.status)}
                                      </div>
                                    </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}

