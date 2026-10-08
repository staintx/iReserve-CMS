import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import CustomerReceiptModal from "../../components/customer/portal/CustomerReceiptModal";
import PaymentChoiceModal from "../../components/customer/PaymentChoiceModal";
import CustomerPolicyModal from "../../components/policy/CustomerPolicyModal";
import useBusinessInfo from "../../hooks/useBusinessInfo";
import useToast from "../../hooks/useToast";
import useMediaQuery from "../../hooks/useMediaQuery";
import StatTile from "../../components/customer/portal/StatTile";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  CreditCard,
  Wallet,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCcw,
  Search,
  Calendar,
  CalendarDays,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Table as TableIcon,
  Receipt,
  Clock,
  AlertCircle,
  Check,
  ArrowRight,
  ShieldCheck,
  ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MAX_FINANCIAL_AMOUNT } from "@/lib/validationRules";

const formatCurrency = (value) => `₱${Number(value || 0).toLocaleString()}`;

const ITEMS_PER_PAGE = 10;

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payingTargetId, setPayingTargetId] = useState(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const businessInfo = useBusinessInfo();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  // Receipt Modal State
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [receiptBooking, setReceiptBooking] = useState(null);

  // Payment Choice Modal State (for balance payments)
  const [choiceModalBooking, setChoiceModalBooking] = useState(null);
  const [choiceModalOpen, setChoiceModalOpen] = useState(false);

  // View Mode: 'events' (By Event) | 'transactions' (All Transactions)
  const [viewMode, setViewMode] = useState("events");
  const isMobile = useMediaQuery("(max-width: 639px)");

  // Accordion Expand State for By Event view: Set of booking IDs
  const [expandedEvents, setExpandedEvents] = useState(new Set());

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookingFilter, setSelectedBookingFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [pRes, bRes] = await Promise.all([
        CustomerAPI.getPayments(),
        CustomerAPI.getBookings(),
      ]);

      let data = pRes.data || [];
      const bookingsData = bRes.data || [];

      if (searchParams.get("status") === "success") {
        let updated = false;
        for (const p of data) {
          if (p.status === "pending") {
            try {
              const vRes = await CustomerAPI.verifyPayment(p._id);
              if (vRes.data?.payment?.status === "approved") {
                updated = true;
              }
            } catch {
              // Webhook or later refresh will handle
            }
          }
        }
        if (updated) {
          const fresh = await CustomerAPI.getPayments();
          data = fresh.data || [];
        }
      }

      setPayments(data);
      setBookings(bookingsData);

      // Compute refunds based on cancelled/refunded bookings
      const cancelledBookings = bookingsData.filter(
        (b) => b.status === "cancelled" || b.status === "refunded"
      );
      const computedRefunds = cancelledBookings
        .map((b) => {
          const bPayments = data.filter(
            (p) => String(p.booking_id?._id || p.booking_id) === String(b._id)
          );
          const totalPaid = bPayments
            .filter((p) => p.status === "approved")
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

          return {
            _id: b._id,
            id: b.reference || (b._id ? b._id.substring(b._id.length - 8).toUpperCase() : "-"),
            type: b.event_type || "Event",
            reason:
              b.cancellation_reason ||
              (b.ocular_visit?.outcome === "cancel" ? "Ocular cancelled" : "Cancelled"),
            deposit: totalPaid,
            amount:
              b.status === "refunded"
                ? totalPaid
                : totalPaid > 0
                ? "Pending Calculation"
                : 0,
            status:
              b.status === "refunded"
                ? "refunded"
                : totalPaid > 0
                ? "pending"
                : "no_refund",
          };
        })
        .filter((r) => r.status === "refunded" || r.status === "pending");

      setRefunds(computedRefunds);
    } catch {
      setPayments([]);
      setBookings([]);
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBookingFilter, statusFilter, viewMode, sortBy]);

  const paymentStatus = searchParams.get("status");

  // Helper: Total approved amount paid for a specific booking
  const getBookingPaidAmount = (bookingId) => {
    return payments
      .filter(
        (p) =>
          String(p.booking_id?._id || p.booking_id) === String(bookingId) &&
          p.status === "approved"
      )
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  };

  // Helper: Outstanding balance for a booking
  const getBookingRemainingBalance = (booking) => {
    if (!booking) return 0;
    if (["cancelled", "refunded"].includes((booking.status || "").toLowerCase())) return 0;
    const total = Number(booking.total_price || 0);
    const paid = getBookingPaidAmount(booking._id);
    return Math.max(0, total - paid);
  };

  // Customer-friendly summary metrics
  const totalSettled = useMemo(() => {
    return payments
      .filter((p) => p.status === "approved")
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [payments]);

  const approvedCount = useMemo(() => {
    return payments.filter((p) => p.status === "approved").length;
  }, [payments]);

  const totalContractValue = useMemo(() => {
    return bookings
      .filter((b) => !["cancelled", "refunded"].includes((b.status || "").toLowerCase()))
      .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
  }, [bookings]);

  // Bookings with an outstanding balance due or deposit required
  const actionableBalanceBookings = useMemo(() => {
    return bookings
      .filter((b) => !["cancelled", "refunded"].includes((b.status || "").toLowerCase()))
      .map((b) => {
        const remaining = getBookingRemainingBalance(b);
        const paid = getBookingPaidAmount(b._id);
        const isDepositStage =
          (b.status || "").toLowerCase().includes("deposit") ||
          b.payment_status === "pending" ||
          paid === 0;

        const progress = b.total_price > 0 ? Math.min(100, Math.round((paid / b.total_price) * 100)) : 0;

        return {
          ...b,
          paidAmount: paid,
          remainingBalance: remaining,
          isDepositStage,
          progress,
        };
      })
      .filter((b) => b.remainingBalance > 0);
  }, [bookings, payments]);

  const totalBalanceDue = useMemo(() => {
    return actionableBalanceBookings.reduce((sum, b) => sum + b.remainingBalance, 0);
  }, [actionableBalanceBookings]);

  const settlementPercentage = useMemo(() => {
    if (totalContractValue <= 0) return 100;
    const pct = (totalSettled / totalContractValue) * 100;
    return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
  }, [totalSettled, totalContractValue]);

  // Handle Pay Now for a booking balance
  const startPaymentForBooking = async (booking, amount, paymentType = "balance") => {
    if (!booking?._id) return;
    const payAmount = Number(amount || 0);
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      notify("This booking does not have a valid balance amount.", "error");
      return;
    }
    if (payAmount > MAX_FINANCIAL_AMOUNT) {
      notify("Amount cannot exceed ₱10,000,000.", "error");
      return;
    }

    if (paymentType === "balance" || !booking.isDepositStage) {
      setChoiceModalBooking(booking);
      setChoiceModalOpen(true);
      return;
    }

    // Deposit stage: direct PayMongo checkout to secure the booking
    setPayingTargetId(booking._id);
    try {
      notify("Opening secure PayMongo checkout...", "info");
      const res = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount: payAmount,
        payment_type: "deposit",
      });

      if (res.data?.checkout_url) {
        window.location.assign(res.data.checkout_url);
      } else {
        notify("Could not generate checkout session.", "error");
        setPayingTargetId(null);
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start payment checkout.", "error");
      setPayingTargetId(null);
    }
  };

  // Open Receipt Modal
  const handleOpenReceipt = (payment, booking) => {
    setReceiptPayment(payment);
    setReceiptBooking(booking || payment.booking_id);
  };

  // Accordion toggle helper
  const toggleEventExpand = (bookingId) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  // Payments grouped by Booking / Event
  const paymentsByBooking = useMemo(() => {
    const map = new Map();

    // Initialize with all bookings
    bookings.forEach((b) => {
      map.set(String(b._id), {
        booking: b,
        payments: [],
        totalPrice: Number(b.total_price || 0),
        paidAmount: 0,
      });
    });

    // Bucket payments into their respective booking
    payments.forEach((p) => {
      const bId = String(p.booking_id?._id || p.booking_id || "");
      if (bId && map.has(bId)) {
        const entry = map.get(bId);
        entry.payments.push(p);
        if (p.status === "approved") {
          entry.paidAmount += Number(p.amount || 0);
        }
      } else {
        const otherKey = p.inquiry_id?._id ? `inq-${p.inquiry_id._id}` : "unassigned";
        if (!map.has(otherKey)) {
          map.set(otherKey, {
            booking: p.inquiry_id || { event_type: "Catering Request", reference: "Inquiry" },
            payments: [],
            totalPrice: 0,
            paidAmount: 0,
          });
        }
        const entry = map.get(otherKey);
        entry.payments.push(p);
        if (p.status === "approved") {
          entry.paidAmount += Number(p.amount || 0);
        }
      }
    });

    // Filter by search and dropdowns
    return Array.from(map.values()).filter((group) => {
      const b = group.booking;
      const bId = String(b._id || "");

      // 1. Dropdown Filter
      if (selectedBookingFilter !== "all" && bId !== String(selectedBookingFilter)) {
        return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all") {
        const remaining = Math.max(0, group.totalPrice - group.paidAmount);
        if (statusFilter === "pending" && remaining <= 0) return false;
        if (statusFilter === "approved" && remaining > 0) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const eventType = (b.event_type || "").toLowerCase();
        const ref = (b.reference || "").toLowerCase();
        const celebrant = (b.celebrant_name || "").toLowerCase();
        const hasMatchingPayment = group.payments.some((p) => {
          const pRef = (p.gateway_reference || p.reference_number || "").toLowerCase();
          const pMethod = (p.method || p.payment_method || "").toLowerCase();
          return pRef.includes(q) || pMethod.includes(q);
        });

        return eventType.includes(q) || ref.includes(q) || celebrant.includes(q) || hasMatchingPayment;
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.booking?.event_date || 0);
      const dateB = new Date(b.booking?.event_date || 0);
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [bookings, payments, selectedBookingFilter, statusFilter, searchQuery, sortBy]);

  // All itemized transactions filtered
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // 1. Status Filter
      if (statusFilter !== "all") {
        const pStatus = String(p.status || "").toLowerCase();
        if (statusFilter === "approved" && pStatus !== "approved" && pStatus !== "successful") return false;
        if (statusFilter === "pending" && pStatus !== "pending") return false;
        if (statusFilter === "failed" && !["failed", "rejected", "cancelled"].includes(pStatus)) return false;
      }

      // 2. Booking Filter
      if (selectedBookingFilter !== "all") {
        const bId = String(p.booking_id?._id || p.booking_id || "");
        if (bId !== String(selectedBookingFilter)) {
          return false;
        }
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const b = p.booking_id;
        const eventType = (b?.event_type || "").toLowerCase();
        const ref = (b?.reference || "").toLowerCase();
        const pRef = (p.gateway_reference || p.reference_number || "").toLowerCase();
        const type = (p.payment_type || "").toLowerCase();
        const method = (p.method || p.payment_method || "").toLowerCase();

        return (
          eventType.includes(q) ||
          ref.includes(q) ||
          pRef.includes(q) ||
          type.includes(q) ||
          method.includes(q)
        );
      }

      return true;
    }).sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortBy === "newest" ? dateB - dateA : dateA - dateB;
    });
  }, [payments, statusFilter, selectedBookingFilter, searchQuery, sortBy]);

  // Paginated slices
  const totalItems = viewMode === "events" ? paymentsByBooking.length : filteredPayments.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalItems);

  const paginatedEvents = useMemo(() => {
    return paymentsByBooking.slice(startIndex, endIndex);
  }, [paymentsByBooking, startIndex, endIndex]);

  const paginatedTransactions = useMemo(() => {
    return filteredPayments.slice(startIndex, endIndex);
  }, [filteredPayments, startIndex, endIndex]);

  // Mobile vs Desktop responsive card lists:
  // On mobile: display all available items in the stacked card UI directly without pagination controls.
  // On desktop/tablet: preserve cursor/page pagination behavior.
  const displayedEvents = useMemo(() => {
    return isMobile ? paymentsByBooking : paginatedEvents;
  }, [isMobile, paymentsByBooking, paginatedEvents]);

  const displayedTransactions = useMemo(() => {
    return isMobile ? filteredPayments : paginatedTransactions;
  }, [isMobile, filteredPayments, paginatedTransactions]);

  // Status badge renderer
  const renderPaymentStatusBadge = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "approved" || s === "successful" || s === "paid") {
      return (
        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold select-none">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Successful</span>
        </span>
      );
    }
    if (s === "pending") {
      return (
        <span className="bg-amber-50 text-amber-800 border border-amber-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold select-none">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Pending</span>
        </span>
      );
    }
    return (
      <span className="bg-rose-50 text-rose-700 border border-rose-200/80 inline-flex items-center gap-1 text-[11px] py-0.5 px-2 rounded-md font-semibold select-none">
        <XCircle className="w-3 h-3 text-rose-600" />
        <span>Failed</span>
      </span>
    );
  };

  // Payment type / milestone label
  const renderMilestoneLabel = (type) => {
    const t = String(type || "").toLowerCase();
    if (t === "deposit") return "Deposit";
    if (t === "balance") return "Balance payment";
    if (t === "full") return "Full Payment";
    return "Payment";
  };

  // Outstanding Balances Pagination
  const BALANCES_PER_PAGE = 5;
  const [balancePage, setBalancePage] = useState(1);
  const [showAllBalances, setShowAllBalances] = useState(false);

  const totalBalancePages = Math.max(1, Math.ceil(actionableBalanceBookings.length / BALANCES_PER_PAGE));
  const currentBalances = useMemo(() => {
    if (showAllBalances) return actionableBalanceBookings;
    const start = (balancePage - 1) * BALANCES_PER_PAGE;
    return actionableBalanceBookings.slice(start, start + BALANCES_PER_PAGE);
  }, [actionableBalanceBookings, balancePage, showAllBalances]);

  const displayedBalances = useMemo(() => {
    return isMobile ? actionableBalanceBookings : currentBalances;
  }, [isMobile, actionableBalanceBookings, currentBalances]);

  // Payment method badge
  const renderMethodBadge = (p) => {
    const m = String(p.method || p.payment_method || "PayMongo").toLowerCase();
    let label = "PayMongo";
    if (m.includes("gcash")) label = "GCash";
    else if (m.includes("maya")) label = "Maya";
    else if (m.includes("card")) label = "Card";
    else if (m.includes("cash")) label = "Cash";
    else if (m.includes("bank")) label = "Bank Transfer";

    return (
      <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded text-[11px] font-medium text-slate-700 select-none">
        <CreditCard className="w-3 h-3 text-slate-400" />
        {label}
      </span>
    );
  };

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="h-[calc(100vh-3.5rem)] w-full bg-[#F8FAFC] flex flex-col font-sans antialiased overflow-hidden">
        {/* ── Contained Top Page Header (Consistent with Inquiries & Bookings) ── */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Payments
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">
              Track your balances, payment activity, and receipts.
            </p>
          </div>
        </div>

        {/* ── Main Scrollable Content Workspace ── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-[1400px] mx-auto">
          {/* PayMongo Callback Alerts */}
          {paymentStatus === "success" && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl shadow-2xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-bold">Payment Confirmed!</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your transaction has been verified with PayMongo and applied to your event balance.
                </p>
              </div>
            </div>
          )}

          {paymentStatus === "cancelled" && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl shadow-2xs animate-in fade-in">
              <XCircle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-bold">Checkout Session Cancelled</p>
                <p className="text-xs text-amber-800 mt-0.5">
                  The payment process was cancelled before completion. No charges were made to your account.
                </p>
              </div>
            </div>
          )}

          {/* ── Summary Metrics Grid (Customer-friendly terminology, responsive reflow) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <StatTile
              icon={Wallet}
              label="Total Paid"
              value={formatCurrency(totalSettled)}
              hint={`${approvedCount} successful payment${approvedCount !== 1 ? "s" : ""}`}
            />
            <StatTile
              icon={CreditCard}
              label="Balance Due"
              value={formatCurrency(totalBalanceDue)}
              hint={
                totalBalanceDue > 0
                  ? `${actionableBalanceBookings.length} event${actionableBalanceBookings.length > 1 ? "s" : ""} pending`
                  : "All accounts settled"
              }
              className={totalBalanceDue > 0 ? "border-amber-300 bg-amber-50/10" : undefined}
            />
            <StatTile
              icon={CalendarDays}
              label="Total Event Cost"
              value={formatCurrency(totalContractValue)}
              hint={`Across ${bookings.length} catering reservation${bookings.length !== 1 ? "s" : ""}`}
            />
          </div>

          {/* ── 1. Outstanding Payments / Balance Due (FIRST SECTION) ── */}
          {actionableBalanceBookings.length > 0 ? (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#4C81E0] stroke-[1.75]" />
                  <h2 className="text-base font-bold text-slate-900 font-sans">
                    Outstanding Balances
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 ml-1">
                    {actionableBalanceBookings.length} Action Needed
                  </span>
                </div>

                {/* Compact Pagination / View All Controls for Scalable Dataset (Desktop / Tablet only) */}
                {actionableBalanceBookings.length > BALANCES_PER_PAGE && (
                  <div className="hidden sm:flex items-center gap-2 self-end sm:self-auto text-xs text-slate-500">
                    <button
                      type="button"
                      onClick={() => setShowAllBalances(!showAllBalances)}
                      className="font-semibold text-[#4C81E0] hover:text-[#3B6EC6] hover:underline cursor-pointer mr-1"
                    >
                      {showAllBalances ? "Show paginated" : `View all balances (${actionableBalanceBookings.length})`}
                    </button>

                    {!showAllBalances && (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400 mr-1">
                          {(balancePage - 1) * BALANCES_PER_PAGE + 1}–{Math.min(balancePage * BALANCES_PER_PAGE, actionableBalanceBookings.length)} of {actionableBalanceBookings.length}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setBalancePage((p) => Math.max(1, p - 1))}
                          disabled={balancePage === 1}
                          className="h-7 w-7 rounded-lg border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          aria-label="Previous balances"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setBalancePage((p) => Math.min(totalBalancePages, p + 1))}
                          disabled={balancePage === totalBalancePages}
                          className="h-7 w-7 rounded-lg border-slate-200 text-slate-600 disabled:opacity-30 cursor-pointer"
                          aria-label="Next balances"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Outstanding Balance Cards: Customer-First Visual Hierarchy */}
              <div className="grid grid-cols-1 gap-3 sm:gap-3.5">
                {displayedBalances.map((b) => (
                  <div
                    key={b._id}
                    className="p-4 sm:p-5 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-all shadow-2xs space-y-3 sm:space-y-3.5"
                  >
                    {/* Top: Event Name, Reference & Date, Package Name */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 min-w-0">
                      <div className="space-y-0.5 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-slate-900 tracking-tight font-sans truncate">
                          {b.event_type || "Catering Event"}
                        </h3>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-slate-700">{b.reference || `CAZ-${b._id.slice(-6).toUpperCase()}`}</span>
                          <span>·</span>
                          <span>
                            {b.event_date
                              ? new Date(b.event_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Date TBD"}
                          </span>
                          {b.celebrant_name && (
                            <>
                              <span>·</span>
                              <span className="text-slate-600">For {b.celebrant_name}</span>
                            </>
                          )}
                        </div>
                        {b.package_name_snapshot && (
                          <div className="text-xs text-slate-600 font-normal pt-0.5">
                            {b.package_name_snapshot}
                          </div>
                        )}
                      </div>

                      {/* Subtle status tag */}
                      <span
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border self-start",
                          b.isDepositStage
                            ? "bg-blue-50 text-[#4C81E0] border-blue-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        )}
                      >
                        {b.isDepositStage ? "Deposit Due" : "Balance Due"}
                      </span>
                    </div>

                    {/* Middle: Financial Progress */}
                    <div className="space-y-1.5 max-w-lg">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">
                          Paid <strong className="text-emerald-700 font-bold">{formatCurrency(b.paidAmount)}</strong> of {formatCurrency(b.total_price)}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{b.progress}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${b.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Bottom: Visually Prominent Balance Due & Customer Action */}
                    <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-black text-amber-700 tabular-nums font-sans">
                          {formatCurrency(b.remainingBalance)}
                        </span>
                        <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                          due
                        </span>
                      </div>

                      <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end">
                        <Link
                          to={`/customer/bookings/${b._id}`}
                          className="text-xs font-semibold text-slate-600 hover:text-[#4C81E0] hover:underline cursor-pointer px-1 py-1"
                        >
                          View booking
                        </Link>
                        <Button
                          size="sm"
                          onClick={() =>
                            startPaymentForBooking(
                              b,
                              b.remainingBalance,
                              b.isDepositStage ? "deposit" : "balance"
                            )
                          }
                          disabled={payingTargetId === b._id}
                          className="h-9 px-4 text-xs font-bold gap-1.5 shadow-xs rounded-xl bg-[#4C81E0] hover:bg-[#3B6EC6] text-white cursor-pointer active:scale-[0.98] transition-all"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>
                            {payingTargetId === b._id
                              ? "Opening..."
                              : b.isDepositStage
                              ? "Pay deposit"
                              : "Pay balance"}
                          </span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Calm State: All accounts settled */
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 font-sans">
                    All accounts are up to date
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    You have no outstanding balances or pending deposit payments due at this time.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/customer/bookings")}
                className="text-xs font-semibold text-[#4C81E0] border-blue-200 hover:bg-blue-50 rounded-xl cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <span>View all bookings</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}

          {/* ── 2. Payment History (SECOND SECTION) ── */}
          <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
            {/* History Header & View Switcher */}
            <div className="py-4 px-5 sm:px-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-sans text-slate-900 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#4C81E0] stroke-[1.75]" />
                  Payment History
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Itemized records, transaction details, and official receipts
                </p>
              </div>

              {/* View Mode Toggle: By Event vs All Transactions */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/70 shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setViewMode("events")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === "events"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>By Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("transactions")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                    viewMode === "transactions"
                      ? "bg-white text-slate-900 shadow-2xs font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>Transactions</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Lightweight Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Search Bar */}
                <div className="sm:col-span-6 relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search payments, event, or reference..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-lg border-slate-200 bg-white placeholder:text-slate-400 focus:border-[#4C81E0]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Event Dropdown Filter */}
                <div className="sm:col-span-3">
                  <select
                    value={selectedBookingFilter}
                    onChange={(e) => setSelectedBookingFilter(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-[#4C81E0]"
                  >
                    <option value="all">All Events ({bookings.length})</option>
                    {bookings.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.event_type} ({b.reference || "BK"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter Dropdown */}
                <div className="sm:col-span-3">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-[#4C81E0]"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Successful</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed / Cancelled</option>
                  </select>
                </div>
              </div>

              {/* ── View 1: By Event (Grouped Accordions) ── */}
              {viewMode === "events" && (
                <div className="space-y-3">
                  {displayedEvents.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                      <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-700">No matching events or payments</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search keywords.</p>
                    </div>
                  ) : (
                    displayedEvents.map(({ booking, payments: groupPayments, totalPrice, paidAmount }) => {
                      const bId = String(booking._id || "");
                      const isExpanded = expandedEvents.has(bId);
                      const eventTitle = booking.event_type || "Catering Event";
                      const bookingRef = booking.reference || (bId ? `BK-${bId.slice(-6).toUpperCase()}` : "-");
                      const remaining = Math.max(0, totalPrice - paidAmount);
                      const progress = totalPrice > 0 ? Math.min(100, Math.round((paidAmount / totalPrice) * 100)) : 100;
                      const isFullyPaid = remaining <= 0 && totalPrice > 0;

                      return (
                        <div
                          key={bId || bookingRef}
                          className="rounded-xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs transition-all"
                        >
                          {/* Collapsed / Row Header */}
                          <div
                            onClick={() => toggleEventExpand(bId)}
                            className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition-colors select-none"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={cn(
                                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                                  isFullyPaid
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-blue-50 text-[#4C81E0] border-blue-200"
                                )}
                              >
                                {isFullyPaid ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
                              </div>

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-bold text-sm text-slate-900 truncate font-sans">
                                    {eventTitle}
                                  </h4>
                                  <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-600">
                                    {bookingRef}
                                  </span>
                                  {isFullyPaid ? (
                                    <span className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md">
                                      Fully Paid
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                                      {formatCurrency(remaining)} Due
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                                  {booking.event_date && (
                                    <span>
                                      {new Date(booking.event_date).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                    </span>
                                  )}
                                  <span>•</span>
                                  <span>
                                    {groupPayments.length} payment{groupPayments.length !== 1 ? "s" : ""}
                                  </span>
                                  {booking.package_name_snapshot && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-600">{booking.package_name_snapshot}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Row Right: Progress & Toggle */}
                            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              <div className="text-left sm:text-right space-y-1">
                                <div className="text-xs text-slate-600">
                                  Paid: <strong className="text-emerald-700 font-bold">{formatCurrency(paidAmount)}</strong>
                                  {totalPrice > 0 && <span className="text-slate-400"> / {formatCurrency(totalPrice)}</span>}
                                </div>
                                <div className="w-28 bg-slate-100 rounded-full h-1.5 sm:ml-auto overflow-hidden">
                                  <div
                                    className="bg-emerald-600 h-full rounded-full"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5">
                                {bId && (
                                  <Link
                                    to={`/customer/bookings/${bId}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] px-2 py-1 rounded-md hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                                    title="View Booking Details"
                                  >
                                    <span>View</span>
                                    <ExternalLink className="w-3 h-3 opacity-70" />
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  aria-label={isExpanded ? "Collapse transactions" : "Expand transactions"}
                                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Transaction Drawer */}
                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                              {groupPayments.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-500 bg-white rounded-lg border border-slate-200/80">
                                  <p>No payments recorded yet for this event.</p>
                                  {remaining > 0 && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        startPaymentForBooking(
                                          booking,
                                          remaining,
                                          paidAmount === 0 ? "deposit" : "balance"
                                        )
                                      }
                                      className="mt-2.5 h-8 text-xs font-semibold bg-[#4C81E0] hover:bg-[#3B6EC6] text-white rounded-lg shadow-2xs"
                                    >
                                      <span>Pay deposit</span>
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <div className="bg-white rounded-lg border border-slate-200/80 divide-y divide-slate-100 overflow-hidden">
                                  {groupPayments.map((p) => (
                                    <div
                                      key={p._id}
                                      className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                                          <Receipt className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <span className="font-bold text-xs text-slate-900">
                                              {renderMilestoneLabel(p.payment_type)}
                                            </span>
                                            {renderPaymentStatusBadge(p.status)}
                                          </div>
                                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span>
                                              {p.createdAt
                                                ? new Date(p.createdAt).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                  })
                                                : "-"}
                                            </span>
                                            <span>•</span>
                                            {renderMethodBadge(p)}
                                            {(p.gateway_reference || p.reference_number) && (
                                              <>
                                                <span>•</span>
                                                <span className="font-mono text-[10px] text-slate-400">
                                                  Ref: {p.gateway_reference || p.reference_number}
                                                </span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0">
                                        <span className="font-bold text-sm text-slate-900 tabular-nums">
                                          {formatCurrency(p.amount)}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleOpenReceipt(p, booking)}
                                          className="h-7 text-xs font-semibold gap-1 text-[#4C81E0] hover:text-[#3B6EC6] hover:bg-blue-50 px-2.5 rounded-lg cursor-pointer"
                                        >
                                          <Receipt className="w-3.5 h-3.5" />
                                          <span>Receipt</span>
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── View 2: All Transactions ── */}
              {viewMode === "transactions" && (
                <>
                  {/* Mobile View: Natural Vertically Stacked Transaction Cards */}
                  <div className="space-y-3 sm:hidden">
                    {displayedTransactions.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                        <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">No payment transactions found</p>
                        <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search terms.</p>
                      </div>
                    ) : (
                      displayedTransactions.map((p) => {
                        const b = bookings.find(
                          (item) => String(item._id) === String(p.booking_id?._id || p.booking_id)
                        );
                        const eventTitle = b?.event_type || p.inquiry_id?.event_type || "Catering Event";
                        const refCode = b?.reference || p.inquiry_id?.reference || "-";
                        const dateStr = p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "-";
                        const timeStr = p.createdAt
                          ? new Date(p.createdAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "";

                        return (
                          <div
                            key={p._id}
                            className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-2xs"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-900 truncate leading-snug">
                                  {eventTitle}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5 flex-wrap">
                                  <span className="font-mono text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {refCode}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    <span>{dateStr}</span>
                                    {timeStr && <span className="text-slate-400">{timeStr}</span>}
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0">
                                {renderPaymentStatusBadge(p.status)}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800">
                                  {renderMilestoneLabel(p.payment_type)}
                                </span>
                                <span>•</span>
                                {renderMethodBadge(p)}
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                  Amount
                                </span>
                                <span className="font-extrabold text-base text-slate-900 tabular-nums font-sans">
                                  {formatCurrency(p.amount)}
                                </span>
                              </div>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenReceipt(p, b)}
                                className="h-8 text-xs font-semibold gap-1.5 text-[#4C81E0] border-blue-200 hover:bg-blue-50 px-3 rounded-lg cursor-pointer"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Desktop / Tablet View: Flat Table View */}
                  <div className="hidden sm:block rounded-xl border border-slate-200/80 overflow-hidden bg-white shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            <th className="py-3 px-4">Date &amp; Time</th>
                            <th className="py-3 px-4 min-w-[200px]">Event / Reference</th>
                            <th className="py-3 px-4">Payment Type</th>
                            <th className="py-3 px-4">Method</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Receipt</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {displayedTransactions.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="py-12 text-center text-slate-400">
                                <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-semibold text-slate-700">No payment transactions found</p>
                                <p className="text-xs text-slate-400 mt-0.5">Try adjusting your filters or search terms.</p>
                              </td>
                            </tr>
                          ) : (
                            displayedTransactions.map((p) => {
                              const b = bookings.find(
                                (item) => String(item._id) === String(p.booking_id?._id || p.booking_id)
                              );
                              const eventTitle = b?.event_type || p.inquiry_id?.event_type || "Catering Event";
                              const refCode = b?.reference || p.inquiry_id?.reference || "-";
                              const dateStr = p.createdAt
                                ? new Date(p.createdAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "-";
                              const timeStr = p.createdAt
                                ? new Date(p.createdAt).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })
                                : "";

                              return (
                                <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-3.5 px-4 text-xs text-slate-600">
                                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                      <span>{dateStr}</span>
                                    </div>
                                    {timeStr && <span className="text-[10px] text-slate-400 pl-5">{timeStr}</span>}
                                  </td>

                                  <td className="py-3.5 px-4 text-xs">
                                    <div className="font-bold text-slate-900">{eventTitle}</div>
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono mt-0.5">
                                      {b?._id ? (
                                        <Link
                                          to={`/customer/bookings/${b._id}`}
                                          className="text-[#4C81E0] hover:underline inline-flex items-center gap-0.5"
                                        >
                                          <span>{refCode}</span>
                                          <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                                        </Link>
                                      ) : (
                                        <span>{refCode}</span>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 text-xs">
                                    <span className="font-semibold text-slate-800">
                                      {renderMilestoneLabel(p.payment_type)}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-xs">
                                    {renderMethodBadge(p)}
                                  </td>

                                  <td className="py-3.5 px-4 text-xs">
                                    <span className="font-bold text-slate-900 tabular-nums text-sm">
                                      {formatCurrency(p.amount)}
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-xs">
                                    {renderPaymentStatusBadge(p.status)}
                                  </td>

                                  <td className="py-3.5 px-4 text-xs text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenReceipt(p, b)}
                                      className="h-7 text-xs font-semibold gap-1 text-[#4C81E0] hover:text-[#3B6EC6] hover:bg-blue-50 px-2.5 rounded-lg cursor-pointer"
                                    >
                                      <Receipt className="w-3.5 h-3.5" />
                                      <span>Receipt</span>
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ── Clean Pagination Bar (Desktop / Tablet only) ── */}
              {totalItems > 0 && (
                <div className="hidden sm:flex pt-2 flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100">
                  <div>
                    Showing <span className="font-semibold text-slate-800">{startIndex + 1}</span>–
                    <span className="font-semibold text-slate-800">{endIndex}</span> of{" "}
                    <span className="font-semibold text-slate-800">{totalItems}</span>{" "}
                    {viewMode === "events" ? "events" : "transactions"}
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-2.5 text-xs rounded-lg border-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-0.5" />
                      <span>Previous</span>
                    </Button>

                    <div className="flex items-center gap-1 px-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((page, idx, arr) => {
                          const prevPage = arr[idx - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <span key={page} className="flex items-center">
                              {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={cn(
                                  "w-7 h-7 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                                  currentPage === page
                                    ? "bg-[#4C81E0] text-white shadow-2xs"
                                    : "text-slate-600 hover:bg-slate-100"
                                )}
                              >
                                {page}
                              </button>
                            </span>
                          );
                        })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2.5 text-xs rounded-lg border-slate-200 disabled:opacity-40 cursor-pointer"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Refunds & Cancellations Section (if applicable) ── */}
          {refunds.length > 0 && (
            <div className="rounded-2xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <div className="py-3.5 px-5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-sans">
                  <RefreshCcw className="w-3.5 h-3.5 text-[#4C81E0]" />
                  Refunds &amp; Cancellations
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(true)}
                  className="text-xs font-semibold text-[#4C81E0] hover:text-[#3B6EC6] hover:underline cursor-pointer"
                >
                  Policy Guidelines →
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {refunds.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">{r.type}</h4>
                      <div className="text-xs text-slate-400 mt-0.5 font-mono">Ref: {r.id}</div>
                      <div className="text-xs text-slate-500 mt-0.5">Reason: {r.reason}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400">
                          Paid: {formatCurrency(r.deposit)}
                        </div>
                        {r.status === "refunded" ? (
                          <div className="text-base font-bold text-emerald-700">
                            Refunded: {formatCurrency(r.amount)}
                          </div>
                        ) : (
                          <div className="text-base font-bold text-amber-700">
                            Refund Pending
                          </div>
                        )}
                      </div>
                      <Badge
                        variant={r.status === "refunded" ? "default" : "secondary"}
                        className={r.status === "refunded" ? "bg-emerald-600" : ""}
                      >
                        {r.status === "refunded" ? "Refunded" : "Processing"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Official Printable Receipt Modal ── */}
        {receiptPayment && (
          <CustomerReceiptModal
            payment={receiptPayment}
            booking={receiptBooking}
            onClose={() => {
              setReceiptPayment(null);
              setReceiptBooking(null);
            }}
            formatCurrency={formatCurrency}
            businessInfo={businessInfo}
          />
        )}

        {/* ── Payment Choice Modal ── */}
        {choiceModalOpen && choiceModalBooking && (
          <PaymentChoiceModal
            open={choiceModalOpen}
            onClose={() => {
              setChoiceModalOpen(false);
              setChoiceModalBooking(null);
            }}
            booking={choiceModalBooking}
            balanceAmount={getBookingRemainingBalance(choiceModalBooking)}
            onSuccess={() => fetchData()}
          />
        )}

        {/* ── Cancellation & Refund Policy Dialog ── */}
        <CustomerPolicyModal
          open={showPolicyModal}
          onClose={() => setShowPolicyModal(false)}
          initialPolicy="cancellation"
          businessInfo={businessInfo}
        />
      </div>
    </CustomerDashboardLayout>
  );
}
