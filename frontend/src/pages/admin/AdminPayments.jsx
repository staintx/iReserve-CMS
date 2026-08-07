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
  Tag
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
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
import DetailDrawer from "../../components/admin/table/DetailDrawer";
import DrawerField from "../../components/admin/table/DrawerField";
import Pagination from "../../components/admin/table/Pagination";
import usePagination from "../../hooks/usePagination";

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
          <div className="text-xs font-mono font-bold text-[#111111] flex items-center gap-1">
            <FileText size={12} className="text-[#D4AF37]" />
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
                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-[#D4AF37] hover:underline cursor-pointer"
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
            <div className="w-7 h-7 rounded-full bg-[#FAF7F2] border border-[#EADBAC] text-[#D4AF37] flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-[#111111] truncate">{name}</div>
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60">
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
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${mInfo.cls}`}>
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
        const colorClass = statusLabel === "Paid" ? "text-emerald-600 font-bold" : statusLabel === "Pending" ? "text-amber-600 font-bold" : "text-gray-400 line-through";
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
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
              title="View Payment Details"
            >
              <Eye size={15} />
            </button>
            <button
              onClick={() => setReceiptModalRow(p)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-[#D4AF37] hover:bg-amber-50 transition-colors"
              title="Print Receipt"
            >
              <Printer size={15} />
            </button>

            {statusLabel === "Pending" && (
              <RowActionsMenu
                actions={[
                  { key: "view", label: "View Details", icon: Eye, onSelect: () => setDrawerRow(p) },
                  { key: "approve", label: "Approve Payment", icon: CheckCircle2, onSelect: () => handleUpdateStatus(p, "approved") },
                  { key: "verify", label: "Verify with Gateway", icon: ShieldCheck, show: p.method === "paymongo", onSelect: () => handleVerify(p) },
                  { key: "reject", label: "Reject Payment", icon: XCircle, onSelect: () => handleUpdateStatus(p, "rejected") },
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
      <div className="p-6 space-y-6 bg-[#F9FAFB] min-h-screen">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              Finance & Payments
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Track revenue, verify incoming customer payments, and record manual settlements.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Btn variant="secondary" size="sm" onClick={() => loadData(true)} className="gap-1.5">
              <RefreshCw size={13} className={refreshing ? "animate-spin text-[#D4AF37]" : ""} />
              Refresh
            </Btn>
            <Btn variant="secondary" size="sm" onClick={handleExportCSV} className="gap-1.5">
              <Download size={13} />
              Export CSV
            </Btn>
            <Btn variant="gold" size="sm" onClick={() => setRecordModalOpen(true)} className="gap-1.5">
              <Plus size={14} />
              Record Payment
            </Btn>
          </div>
        </div>

        {/* Finance KPI Cards Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* KPI 1: Total Collected */}
          <AdminCard className="!p-4 border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue Collected</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {fmt(stats.totalCollected)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
              <span>{stats.paidCount} approved transactions</span>
              <span className="font-semibold text-emerald-600">Paid</span>
            </div>
          </AdminCard>

          {/* KPI 2: Pending Verification */}
          <AdminCard className="!p-4 border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Verifications</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {fmt(stats.pendingTotal)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
              <span>{stats.pendingCount} payments awaiting review</span>
              <span className="font-semibold text-amber-600">Action Needed</span>
            </div>
          </AdminCard>

          {/* KPI 3: Revenue Breakdown */}
          <AdminCard className="!p-4 border-l-4 border-l-blue-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Online vs Manual</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1"><CreditCard size={10} /> Online:</span>
                <span className="font-semibold text-[#111111]">{fmt(stats.onlineTotal)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 flex items-center gap-1"><Banknote size={10} /> Manual:</span>
                <span className="font-semibold text-[#111111]">{fmt(stats.manualTotal)}</span>
              </div>
            </div>
          </AdminCard>

          {/* KPI 4: Total Receivables */}
          <AdminCard className="!p-4 border-l-4 border-l-purple-500">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Outstanding Balances</span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <FileText size={16} />
              </div>
            </div>
            <div style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#111111]">
              {fmt(stats.totalReceivables)}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Uncollected balances across active bookings
            </div>
          </AdminCard>
        </div>

        {/* Table & Toolbar Container */}
        <AdminCard className="!p-4">
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
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] capitalize"
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
                      className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] capitalize"
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
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">To Date</label>
                      <input
                        type="date"
                        value={draftDateRange.to}
                        onChange={(e) => setDraftDateRange((d) => ({ ...d, to: e.target.value }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
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

        {/* Detail Drawer */}
        <DetailDrawer
          open={!!drawerRow}
          onOpenChange={(open) => !open && setDrawerRow(null)}
          title={drawerRow ? `Payment Details: PAY-${drawerRow._id.slice(-6).toUpperCase()}` : ""}
          description={drawerRow ? getCustomerName(drawerRow) : ""}
          footer={
            drawerRow && (
              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex items-center gap-2">
                  <Btn variant="secondary" size="sm" onClick={() => setReceiptModalRow(drawerRow)}>
                    <Printer size={13} /> Official Receipt
                  </Btn>
                  {drawerRow.booking_id?.reference && (
                    <Btn
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/admin/bookings/${drawerRow.booking_id.reference}/details`)}
                    >
                      <ExternalLink size={13} /> Open Booking
                    </Btn>
                  )}
                </div>
                {getStatusBadgeLabel(drawerRow.status) === "Pending" && (
                  <div className="flex items-center gap-2">
                    {drawerRow.method === "paymongo" && (
                      <Btn variant="secondary" size="sm" onClick={() => handleVerify(drawerRow)} disabled={actionLoading}>
                        <ShieldCheck size={13} /> Verify Gateway
                      </Btn>
                    )}
                    <Btn variant="danger" size="sm" onClick={() => handleUpdateStatus(drawerRow, "rejected")} disabled={actionLoading}>
                      <XCircle size={13} /> Reject
                    </Btn>
                    <Btn variant="gold" size="sm" onClick={() => handleUpdateStatus(drawerRow, "approved")} disabled={actionLoading}>
                      <CheckCircle2 size={13} /> Approve Payment
                    </Btn>
                  </div>
                )}
              </div>
            )
          }
        >
          {drawerRow && (
            <div className="space-y-6">
              {/* Payment Summary Box */}
              <div className="bg-[#FAF7F2] p-4 rounded-xl border border-[#EADBAC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wide">Transaction Amount</span>
                  <Badge status={getStatusBadgeLabel(drawerRow.status)} />
                </div>
                <div style={{ fontFamily: "Playfair Display, serif" }} className="text-3xl font-bold text-[#111111]">
                  {fmt(drawerRow.amount)}
                </div>
                <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{getMilestoneLabel(drawerRow.payment_type)}</span>
                  <span>•</span>
                  <span>Method: {getMethodBadge(drawerRow.method).label}</span>
                </div>
              </div>

              {/* Grid Fields */}
              <div className="grid grid-cols-2 gap-4">
                <DrawerField label="Booking Ref" value={getBookingRef(drawerRow)} />
                <DrawerField label="Event Type" value={getEventType(drawerRow) || "—"} />
                <DrawerField label="Customer Name" value={getCustomerName(drawerRow)} />
                <DrawerField label="Customer Email" value={getCustomerEmail(drawerRow)} />
                <DrawerField label="Payment Method" value={getMethodBadge(drawerRow.method).label} />
                <DrawerField label="Milestone" value={getMilestoneLabel(drawerRow.payment_type)} />
                <DrawerField label="Date Paid" value={formatDateTime(drawerRow.paid_at || drawerRow.createdAt)} />
                <DrawerField label="Gateway Reference" value={drawerRow.gateway_reference || drawerRow.gateway_checkout_id || "—"} />
              </div>

              {/* Proof of Payment Viewer */}
              {drawerRow.proof_url ? (
                <div className="border-t border-gray-100 pt-4 space-y-2">
                  <label className="text-xs font-semibold text-gray-700 block">Proof of Payment Upload</label>
                  <div className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 max-h-48 flex items-center justify-center p-2">
                    <img
                      src={drawerRow.proof_url}
                      alt="Proof of Payment"
                      className="max-h-44 object-contain rounded-lg shadow-sm"
                    />
                    <div
                      onClick={() => setProofModalUrl(drawerRow.proof_url)}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold cursor-pointer gap-1.5"
                    >
                      <Eye size={16} /> Click to View Fullscreen
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4">
                  <span className="text-xs text-gray-400 italic">No proof image attached to this payment record.</span>
                </div>
              )}
            </div>
          )}
        </DetailDrawer>

        {/* Record Manual Payment Modal */}
        {recordModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-xl font-bold text-[#111111]">
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
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
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
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Milestone Type</label>
                    <select
                      value={recordForm.payment_type}
                      onChange={(e) => setRecordForm((prev) => ({ ...prev, payment_type: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
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
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
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
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
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
                    className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <Btn variant="secondary" size="sm" onClick={() => setRecordModalOpen(false)}>
                    Cancel
                  </Btn>
                  <Btn variant="gold" size="sm" type="submit" disabled={actionLoading}>
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
            <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-150 my-8">
              {/* Receipt Action Header */}
              <div className="flex items-center justify-between border-b border-gray-200 pb-4 print:hidden">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Official Receipt Preview</span>
                <div className="flex items-center gap-2">
                  <Btn variant="gold" size="sm" onClick={() => window.print()}>
                    <Printer size={13} /> Print Receipt
                  </Btn>
                  <button onClick={() => setReceiptModalRow(null)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Receipt Layout Printable Canvas */}
              <div className="space-y-6 text-[#111111]" id="receipt-print-area">
                {/* Header Branding */}
                <div className="text-center border-b border-gray-200 pb-4">
                  <h2 style={{ fontFamily: "Playfair Display, serif" }} className="text-2xl font-bold text-[#D4AF37]">
                    iReserve Events & Catering
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">Cavite, Philippines • Official Payment Voucher</p>
                </div>

                {/* Receipt Metadata */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 block">RECEIPT NUMBER</span>
                    <span className="font-mono font-bold text-sm text-[#111111]">
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
                  <div className="font-bold text-sm text-[#111111]">{getCustomerName(receiptModalRow)}</div>
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
                      <td className="py-3 font-semibold text-[#111111]">
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

