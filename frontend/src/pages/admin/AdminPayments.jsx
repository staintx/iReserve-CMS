import React, { useState, useEffect, useMemo } from "react";
import { 
  Eye, 
  Download, 
  Check, 
  X, 
  Plus, 
  RefreshCw, 
  Printer, 
  CreditCard, 
  Building2, 
  Wallet, 
  Banknote, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Search, 
  FileText,
  Calendar,
  User,
  ShieldCheck,
  ExternalLink,
  Tag,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
  ArrowUpRight,
  History
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import KPICard from "../../components/admin/ui/KPICard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";

import { useNavigate } from "react-router-dom";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import DataTable from "../../components/admin/table/DataTable";
import TableToolbar from "../../components/admin/table/TableToolbar";
import FilterPopover from "../../components/admin/table/FilterPopover";
import FilterChip from "../../components/admin/table/FilterChip";
import RowActionsMenu from "../../components/admin/table/RowActionsMenu";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";

export default function AdminPayments() {
  const navigate = useNavigate();
  const { notify } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [methodFilter, setMethodFilter] = useState("all");
  const [draftMethodFilter, setDraftMethodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [draftTypeFilter, setDraftTypeFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [draftDateRange, setDraftDateRange] = useState({ from: "", to: "" });

  // Drawers & Modals
  const [drawerRow, setDrawerRow] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [receiptModalRow, setReceiptModalRow] = useState(null);
  const [proofModalUrl, setProofModalUrl] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Record payment form
  const [recordForm, setRecordForm] = useState({
    booking_id: "",
    customer_id: "",
    amount: "",
    payment_type: "deposit",
    method: "cash",
    proof_url: "",
    status: "approved",
    notes: "",
  });

  const loadData = async (showToast = false) => {
    if (showToast) setRefreshing(true);
    else setLoading(true);

    try {
      const [pRes, bRes] = await Promise.all([
        AdminAPI.getPayments(),
        AdminAPI.getBookings().catch(() => ({ data: [] })),
      ]);
      setPayments(pRes.data || []);
      setBookings(bRes.data || []);
      if (showToast) notify("Payments updated successfully", "success");
    } catch (err) {
      notify("Failed to load payment records", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useRealTimeRefresh(loadData);

  // Helper formatting functions
  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const getCustomerName = (p) => {
    if (p.customer_id?.full_name) return p.customer_id.full_name;
    if (p.booking_id?.contact_first_name) {
      return `${p.booking_id.contact_first_name} ${p.booking_id.contact_last_name || ""}`.trim();
    }
    if (p.inquiry_id?.contact_first_name) {
      return `${p.inquiry_id.contact_first_name} ${p.inquiry_id.contact_last_name || ""}`.trim();
    }
    return "Guest Customer";
  };

  const getCustomerEmail = (p) => {
    return p.customer_id?.email || p.booking_id?.contact_email || p.inquiry_id?.contact_email || "N/A";
  };

  const getCustomerPhone = (p) => {
    return p.customer_id?.phone || p.booking_id?.contact_phone || p.inquiry_id?.contact_phone || "N/A";
  };

  const getBookingRef = (p) => {
    if (p.booking_id?.reference) return p.booking_id.reference;
    if (p.inquiry_id?.reference) return p.inquiry_id.reference;
    return "—";
  };

  const getEventType = (p) => {
    if (p.booking_id?.event_type) return p.booking_id.event_type;
    if (p.inquiry_id?.event_type) return p.inquiry_id.event_type;
    return null;
  };

  const getStatusBadgeLabel = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved" || s === "paid" || s === "succeeded") return "Paid";
    if (s === "pending") return "Pending";
    if (s === "rejected" || s === "failed") return "Failed";
    return "Pending";
  };

  const getMethodBadge = (method) => {
    const m = String(method || "").toLowerCase();
    if (m === "paymongo" || m === "online") {
      return { label: "Online (PayMongo)", icon: CreditCard, cls: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    if (m === "bank" || m === "bank_transfer") {
      return { label: "Bank Transfer", icon: Building2, cls: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (m === "gcash" || m === "e-wallet") {
      return { label: "GCash", icon: Wallet, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" };
    }
    if (m === "cash") {
      return { label: "Cash Onsite", icon: Banknote, cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    return { label: method || "Other", icon: DollarSign, cls: "bg-gray-50 text-gray-700 border-gray-200" };
  };

  const getMilestoneLabel = (type) => {
    const t = String(type || "").toLowerCase();
    if (t === "deposit") return "Deposit (Downpayment)";
    if (t === "balance") return "Final Balance";
    if (t === "full") return "Full Payment";
    if (t === "additional") return "Additional Charge";
    return type || "Payment";
  };

  // KPI Calculations
  const stats = useMemo(() => {
    let totalCollected = 0;
    let paidCount = 0;
    let pendingTotal = 0;
    let pendingCount = 0;
    let onlineTotal = 0;
    let manualTotal = 0;

    payments.forEach((p) => {
      const statusLabel = getStatusBadgeLabel(p.status);
      const amt = Number(p.amount) || 0;
      if (statusLabel === "Paid") {
        totalCollected += amt;
        paidCount++;
        if (p.method === "paymongo") onlineTotal += amt;
        else manualTotal += amt;
      } else if (statusLabel === "Pending") {
        pendingTotal += amt;
        pendingCount++;
      }
    });

    // Calculate overall outstanding receivables across active bookings
    let totalReceivables = 0;
    bookings.forEach((b) => {
      const isCompletedOrCancelled = ["completed", "Completed", "cancelled", "Cancelled"].includes(b.status);
      if (!isCompletedOrCancelled) {
        const bPaid = payments
          .filter((p) => String(p.booking_id?._id || p.booking_id) === String(b._id) && getStatusBadgeLabel(p.status) === "Paid")
          .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const rem = Math.max(0, (Number(b.total_price) || 0) - bPaid);
        totalReceivables += rem;
      }
    });

    return {
      totalCollected,
      paidCount,
      pendingTotal,
      pendingCount,
      onlineTotal,
      manualTotal,
      totalReceivables,
    };
  }, [payments, bookings]);

  // Methods list for filters
  const methodsList = useMemo(() => {
    const distinct = Array.from(new Set(payments.map((p) => p.method).filter(Boolean)));
    return ["all", ...distinct];
  }, [payments]);

  // Filtered Payments list
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const custName = getCustomerName(p).toLowerCase();
      const ref = getBookingRef(p).toLowerCase();
      const payId = (`PAY-${p._id.slice(-6)}`).toLowerCase();
      const q = search.toLowerCase();

      const matchSearch = !search || custName.includes(q) || ref.includes(q) || payId.includes(q) || (p.gateway_reference || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || getStatusBadgeLabel(p.status) === statusFilter;
      const matchMethod = methodFilter === "all" || p.method === methodFilter;
      const matchType = typeFilter === "all" || p.payment_type === typeFilter;

      const paidOn = p.paid_at || p.createdAt;
      const matchFrom = !dateRange.from || (paidOn && new Date(paidOn) >= new Date(dateRange.from));
      const matchTo = !dateRange.to || (paidOn && new Date(paidOn) <= new Date(`${dateRange.to}T23:59:59`));

      return matchSearch && matchStatus && matchMethod && matchType && matchFrom && matchTo;
    });
  }, [payments, search, statusFilter, methodFilter, typeFilter, dateRange]);

  const { pageRows, page, setPage, totalPages, total, pageSize } = usePagination(filtered, 10);

  // Active advanced filters count
  const advancedActiveCount = (methodFilter !== "all" ? 1 : 0) + (typeFilter !== "all" ? 1 : 0) + (dateRange.from || dateRange.to ? 1 : 0);

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && drawerRow) {
        setDrawerRow(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerRow]);

  // Related Booking and Financial Ledger calculations for Drawer
  const relatedBooking = useMemo(() => {
    if (!drawerRow?.booking_id) return null;
    const bId = drawerRow.booking_id?._id || drawerRow.booking_id;
    return bookings.find((b) => String(b._id) === String(bId)) || (typeof drawerRow.booking_id === "object" ? drawerRow.booking_id : null);
  }, [drawerRow, bookings]);

  const bookingPayments = useMemo(() => {
    if (!drawerRow) return [];
    const bId = String(drawerRow.booking_id?._id || drawerRow.booking_id || "");
    if (!bId) return [drawerRow];
    return payments.filter((p) => String(p.booking_id?._id || p.booking_id) === bId);
  }, [drawerRow, payments]);

  // Action handlers
  const handleVerify = async (p) => {
    setActionLoading(true);
    try {
      await AdminAPI.verifyPayment(p._id);
      notify("Payment verified with gateway.", "success");
      loadData();
      if (drawerRow?._id === p._id) setDrawerRow(null);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to verify payment.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateStatus = async (p, newStatus) => {
    setActionLoading(true);
    try {
      await AdminAPI.updatePayment(p._id, { status: newStatus, paid_at: newStatus === "approved" ? new Date() : undefined });
      notify(`Payment ${newStatus === "approved" ? "approved" : "updated"} successfully!`, "success");
      loadData();
      if (drawerRow?._id === p._id) setDrawerRow(null);
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update payment status.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filtered.length === 0) {
      notify("No payment records to export.", "warning");
      return;
    }

    const headers = ["Payment Ref", "Booking Ref", "Customer Name", "Customer Email", "Milestone", "Method", "Amount (PHP)", "Status", "Paid Date", "Created Date"];
    const rows = filtered.map((p) => [
      `PAY-${p._id.slice(-6).toUpperCase()}`,
      getBookingRef(p),
      `"${getCustomerName(p)}"`,
      `"${getCustomerEmail(p)}"`,
      `"${getMilestoneLabel(p.payment_type)}"`,
      p.method || "—",
      p.amount || 0,
      getStatusBadgeLabel(p.status),
      formatDate(p.paid_at),
      formatDate(p.createdAt),
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `iReserve_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("Exported payment report to CSV.", "success");
  };

  // Select booking in record form
  const handleBookingSelect = (bId) => {
    const selectedBooking = bookings.find((b) => b._id === bId);
    if (!selectedBooking) {
      setRecordForm((prev) => ({ ...prev, booking_id: "", customer_id: "", amount: "" }));
      return;
    }

    // Calculate remaining balance
    const bPaid = payments
      .filter((p) => String(p.booking_id?._id || p.booking_id) === String(selectedBooking._id) && getStatusBadgeLabel(p.status) === "Paid")
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const remaining = Math.max(0, (Number(selectedBooking.total_price) || 0) - bPaid);
    const defaultAmount = remaining > 0 ? remaining : (Number(selectedBooking.total_price) || 0) * 0.2;

    setRecordForm((prev) => ({
      ...prev,
      booking_id: selectedBooking._id,
      customer_id: selectedBooking.customer_id?._id || selectedBooking.customer_id || "",
      amount: defaultAmount ? String(defaultAmount) : "",
      payment_type: bPaid === 0 ? "deposit" : "balance",
    }));
  };

  // Submit manual payment
  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    if (!recordForm.booking_id) {
      notify("Please select a booking", "error");
      return;
    }
    if (!recordForm.amount || Number(recordForm.amount) <= 0) {
      notify("Please enter a valid amount", "error");
      return;
    }

    setActionLoading(true);
    try {
      await AdminAPI.createPayment({
        booking_id: recordForm.booking_id,
        customer_id: recordForm.customer_id,
        amount: Number(recordForm.amount),
        payment_type: recordForm.payment_type,
        method: recordForm.method,
        proof_url: recordForm.proof_url || undefined,
        status: recordForm.status,
      });

      notify("Payment recorded successfully!", "success");
      setRecordModalOpen(false);
      setRecordForm({
        booking_id: "",
        customer_id: "",
        amount: "",
        payment_type: "deposit",
        method: "cash",
        proof_url: "",
        status: "approved",
        notes: "",
      });
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to record payment.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Columns definition for DataTable
  const columns = [
    {
      key: "ref",
      header: "Payment Ref",
      render: (p) => (
        <div>
          <div className="text-xs font-mono font-bold text-foreground flex items-center gap-1">
            <FileText size={12} className="text-primary" />
            PAY-{p._id.slice(-6).toUpperCase()}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">{formatDate(p.paid_at || p.createdAt)}</div>
        </div>
      ),
    },
    {
      key: "booking",
      header: "Booking / Inquiry",
      render: (p) => {
        const ref = getBookingRef(p);
        const eventType = getEventType(p);
        return (
          <div>
            {ref !== "—" ? (
              <span
                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-primary hover:underline cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (p.booking_id?.reference) navigate(`/admin/bookings/${p.booking_id.reference}/details`);
                  else navigate("/admin/inquiries");
                }}
              >
                {ref}
                <ExternalLink size={10} />
              </span>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
            {eventType && <div className="text-[11px] text-gray-500 font-medium">{eventType}</div>}
          </div>
        );
      },
    },
    {
      key: "customer",
      header: "Customer",
      render: (p) => {
        const name = getCustomerName(p);
        const email = getCustomerEmail(p);
        const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground flex items-center justify-center text-xs font-bold font-mono shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">{name}</div>
              <div className="text-[11px] text-gray-400 truncate">{email}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "milestone",
      header: "Milestone",
      render: (p) => (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
          <Tag size={10} />
          {getMilestoneLabel(p.payment_type)}
        </span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (p) => {
        const mInfo = getMethodBadge(p.method);
        const IconComponent = mInfo.icon;
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${mInfo.cls}`}>
            <IconComponent size={11} />
            {mInfo.label}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      render: (p) => {
        const statusLabel = getStatusBadgeLabel(p.status);
        const colorClass = statusLabel === "Paid" ? "text-emerald-600 font-bold font-mono" : statusLabel === "Pending" ? "text-amber-600 font-bold font-mono" : "text-gray-400 line-through font-mono";
        return <span className={`text-sm ${colorClass}`}>{fmt(p.amount)}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <Badge status={getStatusBadgeLabel(p.status)} />,
    },
    {
      key: "actions",
      header: "Actions",
      stopRowClick: true,
      render: (p) => {
        const statusLabel = getStatusBadgeLabel(p.status);
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrawerRow(p)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer"
              title="View Payment Details"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={() => setReceiptModalRow(p)}
              className="p-1.5 rounded-md text-gray-500 hover:text-primary hover:bg-amber-50 transition-colors cursor-pointer"
              title="Print Receipt"
            >
              <Printer size={15} />
            </button>

            {statusLabel === "Pending" && (
              <RowActionsMenu
                actions={[
                  { key: "view", label: "View Details", icon: Eye, onSelect: () => setDrawerRow(p) },
                  { key: "verify", label: "Sync with Gateway", icon: ShieldCheck, show: p.method === "paymongo", onSelect: () => handleVerify(p) },
                  { key: "approve", label: "Approve Payment", icon: CheckCircle2, show: p.method !== "paymongo", onSelect: () => handleUpdateStatus(p, "approved") },
                  { key: "reject", label: "Reject Payment", icon: XCircle, show: p.method !== "paymongo", onSelect: () => handleUpdateStatus(p, "rejected") },
                ]}
              />
            )}
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-border/40">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Finance &amp; Payments
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track revenue, verify incoming customer payments, and record manual settlements.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Btn variant="secondary" size="sm" onClick={() => loadData(true)} className="gap-1.5">
              <RefreshCw size={13} className={refreshing ? "animate-spin text-primary" : ""} />
              Refresh
            </Btn>
            <Btn variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download size={13} />
              Export CSV
            </Btn>
            <Btn variant="primary" size="sm" onClick={() => setRecordModalOpen(true)} className="gap-1.5">
              <Plus size={13} />
              Record Payment
            </Btn>
          </div>
        </div>

        {/* Finance KPI Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <KPICard
            title="Total Revenue"
            value={fmt(stats.totalCollected)}
            sub={`${stats.paidCount} approved transactions`}
            icon={DollarSign}
          />
          <KPICard
            title="Pending Verification"
            value={fmt(stats.pendingTotal)}
            sub={`${stats.pendingCount} awaiting review`}
            badge={stats.pendingCount > 0 ? "Action Req" : null}
            icon={Clock}
          />
          <KPICard
            title="Online vs Manual"
            value={fmt(stats.onlineTotal)}
            sub={`Manual: ${fmt(stats.manualTotal)}`}
            icon={CreditCard}
          />
          <KPICard
            title="Outstanding Balance"
            value={fmt(stats.totalReceivables)}
            sub="Across all bookings"
            icon={FileText}
          />
        </div>


        {/* Table & Toolbar Container */}
        <AdminCard className="!p-3.5 sm:!p-4">

          <TableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by Customer, Booking Ref (CAZ-...), or Payment Ref..."
            quickFilters={[
              { value: "all", label: "All Payments" },
              { value: "Paid", label: `Paid (${stats.paidCount})` },
              { value: "Pending", label: `Pending (${stats.pendingCount})` },
              { value: "Failed", label: "Failed / Rejected" },
            ]}
            activeQuickFilter={statusFilter}
            onQuickFilterChange={setStatusFilter}
            right={
              <FilterPopover
                label="Advanced Filters"
                activeCount={advancedActiveCount}
                onApply={() => {
                  setMethodFilter(draftMethodFilter);
                  setTypeFilter(draftTypeFilter);
                  setDateRange(draftDateRange);
                }}
                onClear={() => {
                  setDraftMethodFilter("all");
                  setMethodFilter("all");
                  setDraftTypeFilter("all");
                  setTypeFilter("all");
                  setDraftDateRange({ from: "", to: "" });
                  setDateRange({ from: "", to: "" });
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Payment Method</label>
                    <select
                      value={draftMethodFilter}
                      onChange={(e) => setDraftMethodFilter(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                    >
                      <option value="all">All Methods</option>
                      <option value="paymongo">Online (PayMongo)</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="cash">Cash Onsite</option>
                      <option value="gcash">GCash / E-Wallet</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Milestone / Type</label>
                    <select
                      value={draftTypeFilter}
                      onChange={(e) => setDraftTypeFilter(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary capitalize"
                    >
                      <option value="all">All Types</option>
                      <option value="deposit">Deposit (Downpayment)</option>
                      <option value="balance">Final Balance</option>
                      <option value="full">Full Payment</option>
                      <option value="additional">Additional Charge</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">From Date</label>
                      <input
                        type="date"
                        value={draftDateRange.from}
                        onChange={(e) => setDraftDateRange((d) => ({ ...d, from: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={draftDateRange.to}
                        onChange={(e) => setDraftDateRange((d) => ({ ...d, to: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              </FilterPopover>
            }
          />

          {/* Active Filter Chips */}
          {advancedActiveCount > 0 && (
            <div className="flex items-center gap-2 mt-3 flex-wrap pt-2 border-t border-gray-100">
              {methodFilter !== "all" && (
                <FilterChip
                  label={`Method: ${methodFilter === "paymongo" ? "Online" : methodFilter}`}
                  onRemove={() => {
                    setMethodFilter("all");
                    setDraftMethodFilter("all");
                  }}
                />
              )}
              {typeFilter !== "all" && (
                <FilterChip
                  label={`Milestone: ${getMilestoneLabel(typeFilter)}`}
                  onRemove={() => {
                    setTypeFilter("all");
                    setDraftTypeFilter("all");
                  }}
                />
              )}
              {(dateRange.from || dateRange.to) && (
                <FilterChip
                  label={`Date: ${dateRange.from || "Start"} to ${dateRange.to || "End"}`}
                  onRemove={() => {
                    setDateRange({ from: "", to: "" });
                    setDraftDateRange({ from: "", to: "" });
                  }}
                />
              )}
            </div>
          )}
        </AdminCard>

        {/* Data Table */}
        <AdminCard className="!p-0 overflow-hidden shadow-sm">
          <DataTable
            columns={columns}
            rows={pageRows}
            getRowId={(p) => p._id}
            loading={loading}
            emptyTitle="No payments found"
            emptyHint={search || statusFilter !== "all" || advancedActiveCount > 0 ? "Try adjusting your search or filters." : "Recorded payments will appear here."}
            onRowClick={(p) => setDrawerRow(p)}
            minWidth="900px"
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} shownCount={pageRows.length} onPageChange={setPage} />
        </AdminCard>

        {/* Slide-Over Payment Summary Drawer */}
        {drawerRow && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-drawer-title"
          >
            {/* Backdrop Scrim */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in-0 duration-200"
              onClick={() => setDrawerRow(null)}
              aria-hidden="true"
            />

            {/* Slide-Over Panel */}
            <div className="relative w-full max-w-[460px] h-full bg-card border-l border-border/80 shadow-2xl flex flex-col z-10 text-xs animate-in slide-in-from-right duration-200">
              
              {/* Pinned Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/95 backdrop-blur-xs shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 id="payment-drawer-title" className="font-bold text-sm text-foreground truncate">
                    Payment Summary
                  </h3>
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md shrink-0">
                    PAY-{drawerRow._id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setDrawerRow(null)}
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Close details panel"
                  aria-label="Close details panel"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Drawer Body: Compact Payment-Focused View */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                
                {/* 1. Essential Payment Hero Card */}
                <div className="p-3.5 bg-muted/40 rounded-xl border border-border/70 space-y-3 shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Transaction Amount
                      </span>
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-600 tracking-tight">
                        {fmt(drawerRow.amount)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge status={getStatusBadgeLabel(drawerRow.status)} />
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold border ${getMethodBadge(drawerRow.method).cls}`}>
                        {(() => {
                          const MethodIcon = getMethodBadge(drawerRow.method).icon;
                          return <MethodIcon size={11} />;
                        })()}
                        {getMethodBadge(drawerRow.method).label}
                      </span>
                    </div>
                  </div>

                  {/* Essential Payment Details Grid */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2.5 border-t border-border/50 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Payment Reference</span>
                      <span className="font-mono font-bold text-foreground">PAY-{drawerRow._id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Milestone</span>
                      <span className="font-semibold text-foreground">{getMilestoneLabel(drawerRow.payment_type)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Date &amp; Time</span>
                      <span className="font-semibold text-foreground">{formatDateTime(drawerRow.paid_at || drawerRow.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-medium">Booking / Inquiry Ref</span>
                      {getBookingRef(drawerRow) !== "—" ? (
                        <span
                          className="inline-flex items-center gap-1 font-mono font-bold text-primary hover:underline cursor-pointer"
                          onClick={() => {
                            if (drawerRow.booking_id?.reference) {
                              navigate(`/admin/bookings/${drawerRow.booking_id.reference}/details`);
                            } else if (drawerRow.inquiry_id?.reference) {
                              navigate(`/admin/inquiries?search=${drawerRow.inquiry_id.reference}`);
                            }
                          }}
                        >
                          {getBookingRef(drawerRow)}
                          <ExternalLink size={10} />
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    {(drawerRow.gateway_reference || drawerRow.gateway_checkout_id) && (
                      <div className="col-span-2 pt-1 border-t border-border/40">
                        <span className="text-[10px] text-muted-foreground block font-medium">Gateway / Checkout Ref</span>
                        <span className="font-mono text-[11px] text-foreground block truncate" title={drawerRow.gateway_reference || drawerRow.gateway_checkout_id}>
                          {drawerRow.gateway_reference || drawerRow.gateway_checkout_id}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Customer & Status Section */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-2.5 shadow-2xs">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-accent/10 border border-accent/30 text-accent-foreground flex items-center justify-center text-xs font-bold font-mono shrink-0">
                        {getCustomerName(drawerRow).split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "CU"}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Customer</span>
                        <h4 className="font-bold text-foreground text-sm truncate">{getCustomerName(drawerRow)}</h4>
                      </div>
                    </div>
                    {getEventType(drawerRow) && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded shrink-0">
                        {getEventType(drawerRow)}
                      </span>
                    )}
                  </div>

                  {/* Quick Contact Line */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <Phone size={12} className="shrink-0 text-primary" />
                      <a href={`tel:${getCustomerPhone(drawerRow)}`} className="truncate hover:text-foreground hover:underline">
                        {getCustomerPhone(drawerRow)}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                      <Mail size={12} className="shrink-0 text-primary" />
                      <a href={`mailto:${getCustomerEmail(drawerRow)}`} className="truncate hover:text-foreground hover:underline">
                        {getCustomerEmail(drawerRow)}
                      </a>
                    </div>
                  </div>
                </div>

                {/* 3. Contextual Action Required Alert */}
                {getStatusBadgeLabel(drawerRow.status) === "Pending" && (
                  <div className="p-3 bg-amber-50/90 border border-amber-300/80 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <Clock size={14} className="text-amber-600 shrink-0" />
                      <span>Action Required: Verification Pending</span>
                    </div>
                    <p className="text-amber-800 text-[11px] pl-5 leading-relaxed">
                      {drawerRow.method === "paymongo"
                        ? "This online transaction is awaiting gateway confirmation. Sync with PayMongo or verify in gateway dashboard."
                        : "Manual transaction submission awaiting admin approval or rejection."}
                    </p>
                  </div>
                )}
                {getStatusBadgeLabel(drawerRow.status) === "Failed" && (
                  <div className="p-3 bg-rose-50/90 border border-rose-300/80 rounded-xl text-xs space-y-1 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-bold text-rose-900">
                      <XCircle size={14} className="text-rose-600 shrink-0" />
                      <span>Payment Rejected or Failed</span>
                    </div>
                    <p className="text-rose-800 text-[11px] pl-5 leading-relaxed">
                      This transaction was rejected or failed processing.
                    </p>
                  </div>
                )}

                {/* 4. Payment Proof Section */}
                <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                  <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Eye size={12} className="text-primary" /> Payment Proof
                  </h5>
                  {drawerRow.proof_url ? (
                    <div className="space-y-2">
                      <div className="relative group rounded-xl overflow-hidden border border-border/70 bg-muted/40 max-h-44 flex items-center justify-center p-2">
                        <img
                          src={drawerRow.proof_url}
                          alt="Proof of Payment"
                          className="max-h-40 object-contain rounded-lg shadow-2xs"
                        />
                        <div
                          onClick={() => setProofModalUrl(drawerRow.proof_url)}
                          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold cursor-pointer gap-1.5"
                        >
                          <Eye size={16} /> Click to View Fullscreen
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setProofModalUrl(drawerRow.proof_url)}
                        className="w-full py-1 text-xs text-muted-foreground hover:text-foreground font-medium flex items-center justify-center gap-1 hover:bg-muted rounded-md transition-colors cursor-pointer"
                      >
                        <ExternalLink size={12} /> Open Fullscreen Image
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-center text-muted-foreground italic text-xs">
                      No proof image attached to this payment record.
                    </div>
                  )}
                </div>

                {/* 5. Booking Payment History */}
                {bookingPayments.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <History size={12} className="text-primary" /> Booking Payment History
                      </h5>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {bookingPayments.length} {bookingPayments.length === 1 ? "record" : "records"}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {bookingPayments.map((p) => {
                        const isCurrent = p._id === drawerRow._id;
                        const pStatus = getStatusBadgeLabel(p.status);
                        return (
                          <div
                            key={p._id}
                            onClick={() => !isCurrent && setDrawerRow(p)}
                            className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-2 ${
                              isCurrent
                                ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20 cursor-default"
                                : "bg-muted/20 border-border/60 hover:bg-muted/40 cursor-pointer"
                            }`}
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-foreground">
                                  PAY-{p._id.slice(-6).toUpperCase()}
                                </span>
                                {isCurrent && (
                                  <span className="text-[9px] bg-primary text-primary-foreground font-bold px-1.5 py-0.2 rounded">
                                    Viewing
                                  </span>
                                )}
                              </div>
                              <div className="text-[10.5px] text-muted-foreground flex items-center gap-1.5">
                                <span>{getMilestoneLabel(p.payment_type)}</span>
                                <span>•</span>
                                <span>{formatDate(p.paid_at || p.createdAt)}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0 space-y-0.5">
                              <div className={`font-mono font-bold text-xs ${pStatus === "Paid" ? "text-emerald-600" : pStatus === "Pending" ? "text-amber-600" : "text-muted-foreground"}`}>
                                {fmt(p.amount)}
                              </div>
                              <Badge status={pStatus} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Pinned Drawer Footer: Refined Action Hierarchy */}
              <div className="p-3.5 border-t border-border bg-card/95 backdrop-blur-xs space-y-2 shrink-0">
                {getStatusBadgeLabel(drawerRow.status) === "Pending" && (
                  <div>
                    {drawerRow.method === "paymongo" ? (
                      <button
                        onClick={() => handleVerify(drawerRow)}
                        disabled={actionLoading}
                        className="w-full py-2 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer disabled:opacity-50"
                        title="Sync with PayMongo Gateway"
                      >
                        <ShieldCheck size={14} className={actionLoading ? "animate-spin" : ""} />
                        <span>Sync with Gateway</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateStatus(drawerRow, "rejected")}
                          disabled={actionLoading}
                          className="flex-1 py-2 px-3 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Reject Payment"
                        >
                          <XCircle size={14} />
                          <span>Reject</span>
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(drawerRow, "approved")}
                          disabled={actionLoading}
                          className="flex-1 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-center transition-colors shadow-2xs flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Approve Payment"
                        >
                          <CheckCircle2 size={14} />
                          <span>Approve Payment</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Secondary Actions Row */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReceiptModalRow(drawerRow)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-semibold text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                    title="View official receipt"
                  >
                    <Printer size={13} className="text-muted-foreground" />
                    <span>Official Receipt</span>
                  </button>

                  {drawerRow.booking_id?.reference ? (
                    <button
                      onClick={() => navigate(`/admin/bookings/${drawerRow.booking_id.reference}/details`)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                      title="Open full booking details"
                    >
                      <ExternalLink size={13} />
                      <span>Open Booking</span>
                    </button>
                  ) : drawerRow.inquiry_id?.reference ? (
                    <button
                      onClick={() => navigate(`/admin/inquiries?search=${drawerRow.inquiry_id.reference}`)}
                      className="flex-1 py-1.5 px-2.5 rounded-lg border border-border/80 bg-card font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
                      title="Open inquiry"
                    >
                      <ExternalLink size={13} />
                      <span>View Inquiry</span>
                    </button>
                  ) : null}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Record Manual Payment Modal */}
        {recordModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg max-w-lg w-full p-4 sm:p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                <h2 className="font-sans text-base sm:text-lg font-semibold tracking-tight text-[#16264A]">
                  Record Manual Payment
                </h2>

                <button onClick={() => setRecordModalOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRecordSubmit} className="space-y-4">
                {/* Select Booking */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Target Booking <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={recordForm.booking_id}
                    onChange={(e) => handleBookingSelect(e.target.value)}
                    required
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">-- Select Booking --</option>
                    {bookings.map((b) => (
                      <option key={b._id} value={b._id}>
                        [{b.reference || "No Ref"}] {b.contact_first_name} {b.contact_last_name} - {b.event_type} ({fmt(b.total_price)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount & Milestone */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Amount (₱) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      placeholder="e.g. 5000"
                      value={recordForm.amount}
                      onChange={(e) => setRecordForm((prev) => ({ ...prev, amount: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Milestone Type</label>
                    <select
                      value={recordForm.payment_type}
                      onChange={(e) => setRecordForm((prev) => ({ ...prev, payment_type: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="deposit">Deposit (Downpayment)</option>
                      <option value="balance">Final Balance</option>
                      <option value="full">Full Payment</option>
                      <option value="additional">Additional Charge</option>
                    </select>
                  </div>
                </div>

                {/* Method & Initial Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Payment Method</label>
                    <select
                      value={recordForm.method}
                      onChange={(e) => setRecordForm((prev) => ({ ...prev, method: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="cash">Cash Onsite</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="gcash">GCash</option>
                      <option value="check">Check</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Initial Status</label>
                    <select
                      value={recordForm.status}
                      onChange={(e) => setRecordForm((prev) => ({ ...prev, status: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="approved">Approved (Paid)</option>
                      <option value="pending">Pending Verification</option>
                    </select>
                  </div>
                </div>

                {/* Optional Proof URL */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Proof Image URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={recordForm.proof_url}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, proof_url: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <Btn variant="secondary" size="sm" onClick={() => setRecordModalOpen(false)}>
                    Cancel
                  </Btn>
                  <Btn variant="primary" size="sm" type="submit" disabled={actionLoading}>
                    {actionLoading ? "Recording..." : "Save Payment"}
                  </Btn>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Official Printable Receipt Modal */}
        {receiptModalRow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150 my-6">
              {/* Receipt Action Header */}

              <div className="flex items-center justify-between border-b border-gray-200 pb-4 print:hidden">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Official Receipt Preview</span>
                <div className="flex items-center gap-2">
                  <Btn variant="primary" size="sm" onClick={() => window.print()}>
                    <Printer size={13} /> Print Receipt
                  </Btn>
                  <button onClick={() => setReceiptModalRow(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Receipt Layout Printable Canvas */}
              <div className="space-y-6 text-foreground" id="receipt-print-area">
                {/* Header Branding */}
                <div className="text-center border-b border-gray-200 pb-4">
                  <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-accent">
                    iReserve Events & Catering
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Cavite, Philippines • Official Payment Voucher</p>
                </div>

                {/* Receipt Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">RECEIPT NUMBER</span>
                    <span className="font-mono font-bold text-sm text-foreground">
                      REC-{receiptModalRow._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-400 block">DATE & TIME</span>
                    <span className="font-semibold">{formatDateTime(receiptModalRow.paid_at || receiptModalRow.createdAt)}</span>
                  </div>
                </div>

                {/* Billed To */}
                <div className="bg-gray-50 p-4 rounded-xl space-y-1 text-xs border border-gray-100">
                  <div className="font-bold text-gray-400 uppercase tracking-wider text-[10px]">Payer Details</div>
                  <div className="font-bold text-sm text-foreground">{getCustomerName(receiptModalRow)}</div>
                  <div className="text-gray-500">{getCustomerEmail(receiptModalRow)}</div>
                  <div className="text-gray-500 font-mono">Booking Ref: {getBookingRef(receiptModalRow)}</div>
                </div>

                {/* Financial Table Breakdown */}
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase">
                      <th className="py-2">Description</th>
                      <th className="py-2">Method</th>
                      <th className="py-2 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="py-3 font-semibold text-foreground">
                        {getMilestoneLabel(receiptModalRow.payment_type)}
                      </td>
                      <td className="py-3 text-gray-600">
                        {getMethodBadge(receiptModalRow.method).label}
                      </td>
                      <td className="py-3 text-right font-bold text-emerald-600 text-sm">
                        {fmt(receiptModalRow.amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Status & Signature Footer */}
                <div className="border-t border-gray-200 pt-4 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px]">PAYMENT STATUS</span>
                    <span className="font-bold text-emerald-600 uppercase tracking-wider">
                      {getStatusBadgeLabel(receiptModalRow.status)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="border-b border-gray-400 w-32 ml-auto mb-1"></div>
                    <span className="text-[10px] text-gray-400 block uppercase">Authorized Signature</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen Proof Image Lightbox Modal */}
        {proofModalUrl && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setProofModalUrl(null)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors p-1"
              >
                <X size={24} />
              </button>
              <img
                src={proofModalUrl}
                alt="Proof Fullscreen"
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/20"
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

