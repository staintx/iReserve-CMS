import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Check, 
  Phone, 
  Mail, 
  MapPin, 
  AlertCircle, 
  Edit, 
  Calendar, 
  Clock, 
  Users, 
  CreditCard, 
  Send, 
  Utensils, 
  FileText, 
  XCircle, 
  CheckCircle2, 
  RefreshCw,
  MessageSquare,
  UserCheck,
  Eye,
  ShieldCheck,
  UserPlus,
  Truck,
  Sparkles,
  Layers,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  ShieldAlert,
  HeartPulse,
  History,
  ArrowUpRight,
  Info,
  Tag,
  Plus,
  X
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import AdminAssignStaffModal from "../../components/admin/ui/AdminAssignStaffModal";
import RevisionProposalModal from "../../components/booking/RevisionProposalModal";
import BookingRevisionHistory from "../../components/booking/BookingRevisionHistory";
import PrintableInvoice from "../../components/admin/ui/PrintableInvoice";
import InvoiceModal from "../../components/common/invoice/InvoiceModal";
import useBusinessInfo from "../../hooks/useBusinessInfo";
import AdminOcularDateTimePicker from "../../components/admin/ui/AdminOcularDateTimePicker";
import AdminBookingEditModal from "../../components/admin/booking/AdminBookingEditModal";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { createConversation } from "../../api/messages";
import { menuAmountLabel, menuLineTotal } from "../../utils/quotationPricing";
import { isFoodOnly, isSetupOnly, resolveServiceType } from "../../components/customer/portal/statusMeta";

const safeDateToIsoString = (val) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [sourceInquiry, setSourceInquiry] = useState(null);
  const [sourceQuotation, setSourceQuotation] = useState(null);
  const [activeTab, setActiveTab] = useState("overview"); // 'overview' | 'inquiry_quote' | 'staff_equipment' | 'financials_history'
  const businessInfo = useBusinessInfo();

  // Modals state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteOcularModal, setShowCompleteOcularModal] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [showAssignTeamModal, setShowAssignTeamModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Cancellation modal states
  const [showApproveCancelModal, setShowApproveCancelModal] = useState(false);
  const [showRejectCancelModal, setShowRejectCancelModal] = useState(false);
  const [cancelActionLoading, setCancelActionLoading] = useState(false);
  const [adminCancelNote, setAdminCancelNote] = useState("");
  const [refundMode, setRefundMode] = useState("queue"); // 'queue' | 'custom'
  const [customRefundAmount, setCustomRefundAmount] = useState("");
  const [customRefundReason, setCustomRefundReason] = useState("");

  // Form states
  const [quoteForm, setQuoteForm] = useState({ total_price: "", notes: "" });
  const [editForm, setEditForm] = useState({ guest_count: "", event_date: "", start_time: "", venue_type: "", status: "", total_price: "" });
  const [proposeToCustomer, setProposeToCustomer] = useState(true);
  const [revisionNote, setRevisionNote] = useState("");
  const [ocularDate, setOcularDate] = useState("");
  const [ocularTime, setOcularTime] = useState("");
  const [ocularOutcome, setOcularOutcome] = useState("proceed");
  const [ocularInspectionNotes, setOcularInspectionNotes] = useState("");
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);
  const [managers, setManagers] = useState([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [savingManager, setSavingManager] = useState(false);

  const handleUpdateManager = async () => {
    if (!booking) return;
    setSavingManager(true);
    try {
      await AdminAPI.updateBooking(booking._id, { event_manager_id: selectedManagerId || null });
      notify("Event coordinator updated successfully.", "success");
      setShowAssignManagerModal(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update event manager.", "error");
    } finally {
      setSavingManager(false);
    }
  };

  const handleApproveCancellation = async () => {
    if (!booking) return;
    setCancelActionLoading(true);
    try {
      const payload = {
        admin_notes: adminCancelNote,
      };
      if (refundMode === "custom" && customRefundAmount !== "") {
        payload.refund_amount = Number(customRefundAmount);
        payload.refund_reason = customRefundReason || adminCancelNote || "Approved cancellation refund";
      }
      await AdminAPI.approveCancellation(booking._id, payload);
      notify("Booking cancellation approved.", "success");
      setShowApproveCancelModal(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to approve cancellation.", "error");
    } finally {
      setCancelActionLoading(false);
    }
  };

  const handleRejectCancellation = async () => {
    if (!booking) return;
    if (!adminCancelNote.trim()) {
      notify("Please provide a reason for declining the cancellation request.", "warning");
      return;
    }
    setCancelActionLoading(true);
    try {
      await AdminAPI.rejectCancellation(booking._id, { admin_notes: adminCancelNote });
      notify("Cancellation request declined.", "info");
      setShowRejectCancelModal(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to decline cancellation.", "error");
    } finally {
      setCancelActionLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let bookingData = null;
      try {
        const bRes = await AdminAPI.getBooking(id);
        bookingData = bRes.data;
      } catch {
        try {
          const inqRes = await AdminAPI.getInquiry(id);
          if (inqRes.data?.converted_booking_id) {
            const bRes2 = await AdminAPI.getBooking(inqRes.data.converted_booking_id);
            bookingData = bRes2.data;
          } else {
            bookingData = inqRes.data;
          }
        } catch {
          const allB = await AdminAPI.getBookings();
          bookingData = allB.data.find(b => b._id === id || b.reference === id || b.converted_booking_id === id);
        }
      }

      if (!bookingData) {
        setBooking(null);
        return;
      }

      setBooking(bookingData);
      setSelectedManagerId(bookingData.event_manager_id?._id || bookingData.event_manager_id || "");

      // Fetch manager staff list
      try {
        const staffRes = await AdminAPI.getStaff();
        const staffList = Array.isArray(staffRes.data) ? staffRes.data : [];
        setManagers(staffList.filter((s) => s.role === "manager" && s.is_active !== false));
      } catch {
        setManagers([]);
      }

      // Fetch payments for this booking
      try {
        const pRes = await AdminAPI.getPayments();
        const bId = bookingData._id;
        setPayments((pRes.data || []).filter(p => String(p.booking_id?._id || p.booking_id) === String(bId) || String(p.inquiry_id?._id || p.inquiry_id) === String(bId)));
      } catch {
        setPayments([]);
      }

      // Fetch full source inquiry and quotation lineage
      try {
        let inquiryId = bookingData.inquiry_id?._id || bookingData.inquiry_id;
        if (!inquiryId) {
          const inqRes = await AdminAPI.getInquiries();
          const foundInq = (inqRes.data || []).find(
            (i) => String(i.converted_booking_id?._id || i.converted_booking_id || "") === String(bookingData._id)
          );
          inquiryId = foundInq?._id;
        }

        if (inquiryId) {
          try {
            const fullInq = await AdminAPI.getInquiry(inquiryId);
            setSourceInquiry(fullInq.data || null);
          } catch {
            setSourceInquiry(null);
          }

          try {
            const qRes = await AdminAPI.getQuotationsForInquiry(inquiryId);
            const allVersions = qRes.data || [];
            setSourceQuotation(allVersions.length > 0 ? { versions: allVersions } : null);
          } catch {
            setSourceQuotation(null);
          }
        } else {
          setSourceInquiry(null);
          setSourceQuotation(null);
        }
      } catch {
        setSourceInquiry(null);
        setSourceQuotation(null);
      }

      // Populate edit form
      setEditForm({
        guest_count: bookingData.guest_count || "",
        event_date: safeDateToIsoString(bookingData.event_date),
        start_time: bookingData.start_time || "",
        venue_type: bookingData.venue_type || "",
        status: bookingData.status || "",
        total_price: bookingData.total_price || ""
      });

      if (bookingData.ocular_visit) {
        setOcularDate(safeDateToIsoString(bookingData.ocular_visit.scheduled_date));
        setOcularTime(bookingData.ocular_visit.scheduled_time || "");
        setOcularOutcome(bookingData.ocular_visit.outcome || "proceed");
        setOcularInspectionNotes(bookingData.ocular_visit.notes || "");
      }
    } catch {
      notify("Failed to load booking details.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-12 min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs font-medium text-slate-500">Loading reservation details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout>
        <div className="p-12 min-h-[50vh] flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-500" />
          <h3 className="text-base font-bold text-slate-900">Booking Record Not Found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            We could not locate a booking or inquiry matching ID: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">{id}</code>.
          </p>
          <Btn variant="primary" size="sm" onClick={() => navigate("/admin/bookings/reservations")}>
            <ChevronLeft size={14} /> Return to Reservations
          </Btn>
        </div>
      </AdminLayout>
    );
  }

  const serviceType = booking.service_type || "Food and Event Setup";
  const isFoodOnlyService = isFoodOnly(serviceType);
  const isSetupOnlyService = isSetupOnly(serviceType);

  const TIMELINE_STEPS = isFoodOnlyService
    ? [
        "Inquiry",
        "Quotation",
        "Accepted",
        "Deposit Paid",
        "Confirmed",
        "Food Prep",
        "Out for Delivery",
        "Completed",
      ]
    : isSetupOnlyService
    ? [
        "Inquiry",
        "Quotation",
        "Accepted",
        "Deposit Paid",
        "Confirmed",
        "Ocular Visit",
        "Setup Prep",
        "Completed",
      ]
    : [
        "Inquiry",
        "Quotation",
        "Accepted",
        "Deposit Paid",
        "Confirmed",
        "Ocular Visit",
        "Ready for Event",
        "Completed",
      ];
  
  let completedIdx = 0;
  const rawStatus = (booking.status || "").toLowerCase();
  const ocularStatus = (booking.ocular_visit?.status || "").toLowerCase();
  const ocularOutcomeVal = (booking.ocular_visit?.outcome || "").toLowerCase();
  const hasOcularScheduledOrDone = ocularStatus === "completed" || ocularOutcomeVal === "proceed" || ocularStatus === "scheduled" || ocularStatus === "skipped";

  if (isFoodOnlyService) {
    if (["completed", "delivered"].includes(rawStatus)) {
      completedIdx = 7;
    } else if (["out for delivery", "in transit", "ready for delivery"].includes(rawStatus)) {
      completedIdx = 6;
    } else if (["preparing", "food preparation", "ongoing", "ready for event"].includes(rawStatus)) {
      completedIdx = 5;
    } else if (["confirmed", "converted to booking"].includes(rawStatus)) {
      completedIdx = 4;
    } else if (booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid") {
      completedIdx = 3;
    } else if (rawStatus === "customer_accepted") {
      completedIdx = 2;
    } else if (rawStatus === "quote_sent") {
      completedIdx = 1;
    }
  } else {
    if (rawStatus === "completed") {
      completedIdx = 7;
    } else if (["ready for event", "ongoing", "preparing"].includes(rawStatus)) {
      completedIdx = 6;
    } else if (hasOcularScheduledOrDone || rawStatus === "ocular scheduled") {
      completedIdx = 5;
    } else if (["confirmed", "converted to booking"].includes(rawStatus)) {
      completedIdx = 4;
    } else if (booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid") {
      completedIdx = 3;
    } else if (rawStatus === "customer_accepted") {
      completedIdx = 2;
    } else if (rawStatus === "quote_sent") {
      completedIdx = 1;
    }
  }

  const fmt = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const customerName = booking.customer_id?.full_name || `${booking.contact_first_name || ""} ${booking.contact_last_name || ""}`.trim() || "Customer";
  
  const totalPaid = payments.filter(p => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = Math.max(0, (booking.total_price || 0) - totalPaid);

  const isCancellationPending =
    booking?.cancellation_request?.status === "pending" ||
    (booking?.change_request?.status === "pending" &&
      booking?.change_request?.message?.toLowerCase().includes("cancel"));

  const cancellationReason =
    booking?.cancellation_request?.reason ||
    booking?.cancellation_reason ||
    booking?.change_request?.message ||
    "Customer requested a cancellation and refund.";

  const pkg = booking.package_id;
  const guestCount = Number(booking.guest_count) || 0;

  // Price Calculations
  const serviceItemsSubtotal = (booking.service_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const additionalChargesSubtotal = (booking.additional_charges || []).reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const menuItemsAddonSubtotal = (booking.menu_items || []).reduce(
    (sum, item) => sum + menuLineTotal(item, guestCount),
    0
  );
  const addOnsSubtotal = serviceItemsSubtotal + additionalChargesSubtotal + menuItemsAddonSubtotal;
  
  let basePackageSubtotal = 0;
  let pkgRateText = "";
  if (pkg) {
    if (pkg.package_type === "Event Setup Only") {
      basePackageSubtotal = Number(pkg.setup_price || 0);
      pkgRateText = `${pkg.name || "Event Setup"} (Flat Setup Fee)`;
    } else {
      const perGuestRate = Number(pkg.price_per_guest || 0);
      basePackageSubtotal = perGuestRate * guestCount;
      pkgRateText = `${pkg.name || "Catering Package"} (${fmt(perGuestRate)}/head × ${guestCount} pax)`;
    }
  }

  const grandTotal = Number(booking.total_price) || 0;
  const discountAmount = Number(booking.discount_amount || 0);

  if (basePackageSubtotal === 0 && grandTotal > 0) {
    basePackageSubtotal = Math.max(0, grandTotal + discountAmount - addOnsSubtotal);
    pkgRateText = `Base Package (${guestCount} pax)`;
  }

  const handleApprove = () => {
    AdminAPI.updateBooking(booking._id, { status: "confirmed" })
      .then(() => {
        notify("Booking approved and confirmed successfully.", "success");
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to approve booking.", "error"));
  };

  const handleSendQuote = (e) => {
    e.preventDefault();
    if (!quoteForm.total_price) {
      notify("Please enter the total price for the quote.", "error");
      return;
    }
    AdminAPI.sendQuote(booking._id, { 
      total_price: Number(quoteForm.total_price), 
      notes: quoteForm.notes 
    })
    .then(() => {
      notify("Quote sent to customer successfully.", "success");
      setShowQuoteModal(false);
      loadData();
    })
    .catch((err) => notify(err.response?.data?.message || "Failed to send quote.", "error"));
  };

  const handleOpenEditModal = () => {
    if (booking) {
      let dateVal = "";
      if (booking.event_date) {
        try {
          dateVal = new Date(booking.event_date).toISOString().split("T")[0];
        } catch {
          dateVal = "";
        }
      }
      setEditForm({
        event_date: dateVal,
        start_time: booking.start_time || "",
        guest_count: booking.guest_count || "",
        total_price: booking.total_price || "",
        venue_type: booking.venue_type || "",
        status: booking.status || "confirmed"
      });
      setRevisionNote("");
      setProposeToCustomer(true);
    }
    setShowEditModal(true);
  };

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    if (!editForm.event_date) {
      notify("Please select a valid target event date.", "error");
      return;
    }
    if (!editForm.start_time || !String(editForm.start_time).trim()) {
      notify("Please specify the event start time.", "error");
      return;
    }
    if (editForm.guest_count === "" || Number(editForm.guest_count) <= 0) {
      notify("Please enter a valid guest count greater than 0.", "error");
      return;
    }
    if (editForm.total_price === "" || editForm.total_price === null || Number(editForm.total_price) < 0) {
      notify("Please enter a valid total price (cannot be negative).", "error");
      return;
    }
    if (!editForm.venue_type || !String(editForm.venue_type).trim()) {
      notify("Please specify the venue type or location.", "error");
      return;
    }
    if (proposeToCustomer && (!revisionNote || !revisionNote.trim())) {
      notify("Please provide a revision note / reason for this proposal so the customer understands the changes.", "error");
      return;
    }

    try {
      if (proposeToCustomer) {
        await AdminAPI.proposeRevision(booking._id, {
          ...editForm,
          guest_count: Number(editForm.guest_count),
          total_price: Number(editForm.total_price),
          message: revisionNote.trim()
        });
        notify("Revised booking proposal sent to customer for confirmation!", "success");
      } else {
        await AdminAPI.updateBooking(booking._id, { 
          ...editForm, 
          guest_count: Number(editForm.guest_count),
          total_price: Number(editForm.total_price),
          revision_note: revisionNote ? revisionNote.trim() : undefined 
        });
        notify("Booking details updated successfully.", "success");
      }
      setShowEditModal(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || (proposeToCustomer ? "Failed to propose revision." : "Failed to update booking."), "error");
    }
  };

  const handleAcceptRevision = async () => {
    try {
      await AdminAPI.acceptRevision(booking._id);
      notify("Revised booking deal confirmed & applied successfully!", "success");
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to confirm revision deal", "error");
    }
  };

  const handleRejectRevision = async (reason) => {
    try {
      await AdminAPI.rejectRevision(booking._id, { reason });
      notify("Revision proposal declined.", "info");
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to decline revision proposal", "error");
    }
  };

  const handleScheduleOcular = (e) => {
    e.preventDefault();
    AdminAPI.scheduleOcular(booking._id, {
      scheduled_date: ocularDate,
      scheduled_time: ocularTime
    })
    .then(() => {
      notify("Ocular schedule updated.", "success");
      setShowRescheduleModal(false);
      loadData();
    })
    .catch(err => notify(err.response?.data?.message || "Failed to confirm ocular schedule", "error"));
  };

  const handleCompleteOcular = async (e) => {
    e.preventDefault();
    setIsSubmittingOcular(true);
    try {
      await AdminAPI.completeOcular(booking._id, {
        outcome: ocularOutcome,
        notes: ocularInspectionNotes.trim(),
      });
      notify("Ocular inspection outcome recorded successfully.", "success");
      setShowCompleteOcularModal(false);
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to complete ocular inspection.", "error");
    } finally {
      setIsSubmittingOcular(false);
    }
  };

  const openCustomerChat = async () => {
    try {
      const convo = await createConversation({ booking_id: booking._id });
      navigate(`/admin/messages/${convo._id}`);
    } catch (err) {
      notify(err.response?.data?.message || "Could not open chat thread.", "error");
    }
  };

  const handleMarkCompleted = async () => {
    if (!window.confirm("Are you sure you want to mark this event as Completed? This will finalize the event and allow the customer to leave a review.")) return;
    try {
      await AdminAPI.markBookingCompleted(booking._id);
      notify("Event marked as Completed successfully!", "success");
      loadData();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to mark event as completed.", "error");
    }
  };

  const quotationVersions = sourceQuotation?.versions || [];
  const latestQuotation = quotationVersions[0] || null;

  return (
    <AdminLayout>
      <div className="w-full max-w-[1600px] mx-auto space-y-4 pb-16">
        
        {/* ============================================================ */}
        {/* 1. TOP COMMAND HEADER & ACTION BAR                           */}
        {/* ============================================================ */}
        <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <button 
                  onClick={() => navigate("/admin/bookings/reservations")} 
                  className="hover:text-foreground flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <ChevronLeft size={13} /> Reservations
                </button>
                <ChevronRight size={11} className="text-muted-foreground/40" />
                <span className="font-mono font-bold text-foreground">
                  {booking.reference || `BK-${String(booking._id).slice(-6).toUpperCase()}`}
                </span>
                {sourceInquiry && (
                  <>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="text-[11px] text-muted-foreground">
                      From Inquiry #{sourceInquiry.reference || String(sourceInquiry._id).slice(-6).toUpperCase()}
                    </span>
                  </>
                )}
              </div>

              {/* Title & Status Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">
                  {customerName}
                </h1>
                <Badge status={booking.status} />
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-tight border ${
                  booking.payment_status === "fully_paid"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : ["deposit_paid"].includes(booking.payment_status)
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {booking.payment_status === "fully_paid" ? "Fully Paid" : booking.payment_status === "deposit_paid" ? "Deposit Paid" : "Unpaid"}
                </span>
                {booking.is_revised && (
                  <span className="bg-amber-100/90 text-amber-900 border border-amber-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md">
                    Revised v{booking.revision_count || 1}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Btn size="sm" variant="secondary" onClick={() => setShowInvoiceModal(true)} title="Print or preview invoice">
                <Printer size={13} /> Print Invoice
              </Btn>

              <Btn size="sm" variant="secondary" onClick={openCustomerChat} title="Message client">
                <MessageSquare size={13} /> Message
              </Btn>

              {booking.status === "inquiry" && (
                <Btn size="sm" variant="primary" onClick={() => setShowQuoteModal(true)}>
                  <Send size={13} /> Send Official Quote
                </Btn>
              )}

              {["pending deposit", "Deposit Pending"].includes(booking.status) && (
                <Btn size="sm" variant="primary" onClick={handleApprove}>
                  <Check size={13} /> Confirm Booking
                </Btn>
              )}

              {["confirmed", "Confirmed", "preparing", "Ready for Event", "ready for event", "ongoing"].includes(booking.status) && (
                <Btn size="sm" variant="primary" onClick={handleMarkCompleted} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-2xs">
                  <CheckCircle2 size={13} /> Mark Completed
                </Btn>
              )}

              {!["cancelled", "completed"].includes(rawStatus) && (
                <Btn size="sm" variant="secondary" onClick={handleOpenEditModal}>
                  <Edit size={13} /> Edit Booking
                </Btn>
              )}
            </div>
          </div>

          {/* Pending Revision Alert Banner */}
          {booking.pending_revision && ["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status) && (
            <div className="bg-amber-50/95 border border-amber-300/90 rounded-lg p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-amber-600 mt-0.5 shrink-0 animate-spin" />
                <div>
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                    {booking.pending_revision.status === "pending_customer_approval" ? "Revised Proposal Sent to Customer (Awaiting Confirmation)" : "Customer Proposed Booking Revision (Action Required)"}
                  </h4>
                  <p className="text-amber-800 text-[11px] font-medium mt-0.5">
                    {booking.pending_revision.message || "Proposed changes are pending mutual confirmation."}
                  </p>
                </div>
              </div>
              <Btn size="sm" variant="primary" className="shrink-0 font-bold" onClick={() => setShowProposalModal(true)}>
                Review Deal
              </Btn>
            </div>
          )}

          {/* Dedicated Cancellation Request Alert Banner */}
          {isCancellationPending && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-rose-950 text-xs sm:text-sm">
                      Customer Requested Booking Cancellation
                    </h4>
                    <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 font-bold px-2 py-0.5 rounded-full">
                      Action Required
                    </span>
                  </div>
                  <p className="text-rose-900 text-xs mt-1 font-medium">
                    Reason: <span className="italic font-normal">"{cancellationReason}"</span>
                  </p>
                  <p className="text-rose-700 text-[11px] mt-0.5">
                    Amount Paid: <span className="font-semibold font-mono">₱{totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    {totalPaid > 0 ? " — cancellation requires refund resolution." : " — no payment made."}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <Btn
                  size="sm"
                  variant="secondary"
                  className="font-bold text-slate-700 border-slate-300 hover:bg-slate-100"
                  onClick={() => {
                    setAdminCancelNote("");
                    setShowRejectCancelModal(true);
                  }}
                >
                  <X className="w-3.5 h-3.5 mr-1 text-slate-500" /> Decline Request
                </Btn>
                <Btn
                  size="sm"
                  variant="destructive"
                  className="font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                  onClick={() => {
                    setAdminCancelNote("");
                    setCustomRefundAmount(totalPaid > 0 ? String(totalPaid * 0.5) : "0");
                    setRefundMode("queue");
                    setShowApproveCancelModal(true);
                  }}
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Review &amp; Approve
                </Btn>
              </div>
            </div>
          )}

          {/* Previous Cancellation Request Declined Banner */}
          {booking.cancellation_request?.status === "rejected" && !["cancelled", "completed"].includes(rawStatus) && (
            <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 sm:p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-amber-900">
                  Previous customer cancellation request was <strong>declined</strong>: {booking.cancellation_request.admin_notes}
                </span>
              </div>
            </div>
          )}

          {/* Customer Change Request Alert Banner (for non-cancellations) */}
          {!isCancellationPending && booking.change_request?.status === "pending" && booking.change_request?.message && (!booking.pending_revision || !["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status)) && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 sm:p-3.5 flex items-start justify-between gap-3 text-xs">
              <div className="flex items-start gap-2.5">
                <Send className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">Pending Customer Change Request</h4>
                  <p className="text-indigo-800 text-[11px] mt-0.5">{booking.change_request.message}</p>
                </div>
              </div>
              <Btn
                size="sm"
                variant="primary"
                className="shrink-0 font-bold"
                onClick={() => {
                  handleOpenEditModal();
                  setRevisionNote(booking.change_request.message);
                }}
              >
                Review &amp; Edit
              </Btn>
            </div>
          )}

          {/* Compact Stepper */}
          <div className="pt-2 border-t border-border/50 overflow-x-auto">
            <div className="flex items-center justify-between min-w-max text-xs py-1">
              {TIMELINE_STEPS.map((step, i) => (
                <div key={step} className="flex items-center flex-shrink-0">
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      i <= completedIdx ? "bg-primary text-primary-foreground font-bold shadow-2xs" :
                      i === completedIdx + 1 ? "border border-primary text-primary bg-primary/5" :
                      "border border-border text-muted-foreground bg-muted/30"
                    }`}>
                      {i <= completedIdx ? <Check size={11} strokeWidth={3} /> : i + 1}
                    </div>
                    <span className={`text-[11px] whitespace-nowrap ${
                      i <= completedIdx ? "font-bold text-foreground" : "text-muted-foreground font-medium"
                    }`}>
                      {step}
                    </span>
                  </div>
                  {i < TIMELINE_STEPS.length - 1 && (
                    <div className={`h-0.5 w-6 sm:w-10 mx-2 transition-colors ${i < completedIdx ? "bg-primary" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. UNIFIED TOP KPI SUMMARY STRIP (Replaces 3 separate cards) */}
        {/* ============================================================ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Metric 1: Schedule & Venue */}
          <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              <Calendar size={12} className="text-primary" /> Date &amp; Venue
            </div>
            <div className="font-bold text-xs sm:text-sm text-foreground truncate">
              {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBA"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {booking.start_time || "TBA"} · {booking.venue_type || booking.municipality || "Venue TBA"}
            </div>
          </div>

          {/* Metric 2: Service & Guests */}
          <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
              <Users size={12} className="text-primary" /> Guest &amp; Service
            </div>
            <div className="font-bold text-xs sm:text-sm text-foreground truncate">
              {guestCount} Pax · {booking.event_type || "Catering Event"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {resolveServiceType(booking)}
            </div>
          </div>

          {/* Metric 3: Financial Overview */}
          <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <CreditCard size={12} className="text-primary" /> Total Cost
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${remainingBalance > 0 ? "text-amber-700 bg-amber-50" : "text-emerald-700 bg-emerald-50"}`}>
                {remainingBalance > 0 ? `Due ${fmt(remainingBalance)}` : "Settled"}
              </span>
            </div>
            <div className="font-mono font-bold text-xs sm:text-sm text-foreground">
              {fmt(grandTotal)}
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Paid: <strong className="text-emerald-700 font-semibold">{fmt(totalPaid)}</strong>
            </div>
          </div>

          {/* Metric 4: Team Execution */}
          <div className="bg-card border border-border/80 rounded-xl p-3 sm:p-3.5 space-y-1 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
                <ShieldCheck size={12} className="text-primary" /> Coordinator &amp; Crew
              </span>
              {Array.isArray(booking.staff_assignments) && booking.staff_assignments.length > 0 ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {booking.staff_assignments.length} Crew
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  No Team
                </span>
              )}
            </div>
            <div className="font-bold text-xs sm:text-sm text-foreground truncate">
              {booking.event_manager_id?.full_name || "Unassigned Coordinator"}
            </div>
            <div className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
              <Phone size={10} className="text-muted-foreground/60" />
              <span>{booking.contact_phone || booking.customer_id?.phone || "No client phone"}</span>
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. STRUCTURED 4-TAB NAVIGATION (Eliminates Card Overload)    */}
        {/* ============================================================ */}
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-2xs">
          {/* Tab Selection Bar */}
          <div className="flex items-center gap-1 px-3 sm:px-4 pt-2.5 border-b border-border/70 overflow-x-auto bg-muted/20">
            {[
              { id: "overview", label: "Overview & Operations", icon: Layers },
              { 
                id: "inquiry_quote", 
                label: "Inquiry & Quotation Lineage", 
                icon: FileText,
                badge: sourceInquiry ? "Linked" : undefined
              },
              { 
                id: "staff_equipment", 
                label: "Staff & Equipment", 
                icon: Users,
                count: booking.staff_assignments?.length || undefined
              },
              { 
                id: "financials_history", 
                label: "Financials & History", 
                icon: CreditCard,
                count: booking.revision_count || undefined
              },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 py-2 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? "border-primary text-primary font-bold bg-card"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <TabIcon size={13} className={isActive ? "text-primary" : "text-muted-foreground"} />
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
                      {tab.badge}
                    </span>
                  )}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="text-[9.5px] px-1.5 py-0.2 rounded-full font-bold bg-muted text-muted-foreground">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ============================================================ */}
          {/* TAB 1: OVERVIEW & OPERATIONS                                 */}
          {/* ============================================================ */}
          {activeTab === "overview" && (
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Event Specs & Venue */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} className="text-primary" /> Event &amp; Venue Details
                  </h3>
                  <button 
                    onClick={handleOpenEditModal}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit size={11} /> Edit Specs
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Event Type</span>
                    <strong className="text-foreground">{booking.event_type || "Catering Event"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Celebrant / For</span>
                    <strong className="text-foreground">{booking.celebrant_name || (booking.booking_for === "someone_else" ? "Someone Else" : "Client")}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Theme &amp; Palette</span>
                    <strong className="text-foreground">{booking.event_theme || "Standard Styling"}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Venue Type</span>
                    <strong className="text-foreground">{booking.venue_type || "Standard Venue"}</strong>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4 pt-2 border-t border-border/40">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <MapPin size={11} className="text-primary" /> Complete Address &amp; Directions
                    </span>
                    <span className="text-foreground leading-snug mt-0.5 block">
                      {[booking.street, booking.barangay, booking.municipality, booking.province, booking.zip_code].filter(Boolean).join(", ") || "No venue address recorded"}
                      {booking.landmark && <span className="text-muted-foreground font-normal"> · Landmark: {booking.landmark}</span>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Menu & Service Breakdown */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    {isSetupOnlyService ? <Layers size={13} className="text-primary" /> : <Utensils size={13} className="text-primary" />}
                    {isSetupOnlyService ? "Venue Styling & Equipment Breakdown" : "Itemized Menu & Service Dishes"}
                  </h3>
                  <span className="text-[11px] font-mono font-medium text-muted-foreground">
                    {pkgRateText}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Menu Dishes */}
                  {!isSetupOnlyService && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Selected Dishes ({booking.menu_items?.length || 0})
                      </span>
                      <div className="divide-y divide-border/50 border border-border/60 rounded-lg overflow-hidden bg-card">
                        {booking.menu_items && booking.menu_items.length > 0 ? (
                          booking.menu_items.map((item, idx) => {
                            const itemTotal = menuLineTotal(item, guestCount);
                            return (
                              <div key={idx} className="p-2.5 flex justify-between items-center hover:bg-muted/30 transition-colors">
                                <div>
                                  <span className="font-semibold text-foreground">{item.name || item}</span>
                                  {menuAmountLabel(item) && (
                                    <span className="ml-1.5 text-[11px] font-semibold text-muted-foreground">
                                      {menuAmountLabel(item)}
                                    </span>
                                  )}
                                  {item.note && <span className="block text-muted-foreground text-[10.5px]">{item.note}</span>}
                                </div>
                                <span className="font-mono font-semibold text-muted-foreground">
                                  {itemTotal > 0 ? fmt(itemTotal) : "Included"}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-xs">No specific menu items recorded.</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Add-ons & Extra Services */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Add-ons &amp; Service Items ({booking.service_items?.length || 0})
                    </span>
                    <div className="divide-y divide-border/50 border border-border/60 rounded-lg overflow-hidden bg-card">
                      {booking.service_items && booking.service_items.length > 0 ? (
                        booking.service_items.map((item, idx) => (
                          <div key={idx} className="p-2.5 flex justify-between items-center hover:bg-muted/30 transition-colors">
                            <span className="font-semibold text-foreground">
                              {item.name} {item.quantity ? `(x${item.quantity})` : ""}
                            </span>
                            <span className="font-mono font-semibold text-muted-foreground">
                              {fmt(item.price)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-muted-foreground text-xs">No extra add-on services selected.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Logistics Section: Ocular Inspection OR Delivery Dispatch */}
              {isFoodOnlyService ? (
                <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-border/50 pb-2">
                    <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Truck size={13} className="text-primary" /> Food Drop-Off &amp; Delivery Logistics
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      Food Drop-Off (No Ocular Needed)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Arrival Schedule</span>
                      <strong className="text-foreground">
                        {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBA"} @ {booking.start_time || "TBA"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Method</span>
                      <strong className="text-foreground capitalize">{booking.delivery_method || "Drop-Off Delivery"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Contact</span>
                      <strong className="text-foreground">{customerName} · {booking.contact_phone || "No phone"}</strong>
                    </div>
                  </div>

                  {booking.special_requests && (
                    <div className="p-2.5 bg-card border border-border/60 rounded-lg text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">Special Instructions:</span> {booking.special_requests}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Eye size={13} className="text-primary" /> Ocular Visit &amp; Venue Inspection
                      </h3>
                      {booking.ocular_visit?.status === "completed" && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Inspection Passed ✓
                        </span>
                      )}
                      {booking.ocular_visit?.status === "scheduled" && (
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          Scheduled
                        </span>
                      )}
                      {(!booking.ocular_visit?.status || booking.ocular_visit?.status === "pending") && (
                        <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          Pending Schedule
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Btn
                        size="xs"
                        variant="secondary"
                        onClick={() => {
                          setOcularDate(safeDateToIsoString(booking.ocular_visit?.scheduled_date));
                          setOcularTime(booking.ocular_visit?.scheduled_time || "");
                          setShowRescheduleModal(true);
                        }}
                      >
                        <Calendar size={12} /> {booking.ocular_visit?.scheduled_date ? "Reschedule" : "Schedule Visit"}
                      </Btn>

                      {booking.ocular_visit?.status === "scheduled" && (
                        <Btn
                          size="xs"
                          variant="primary"
                          onClick={() => {
                            setOcularOutcome(booking.ocular_visit?.outcome || "proceed");
                            setOcularInspectionNotes(booking.ocular_visit?.notes || "");
                            setShowCompleteOcularModal(true);
                          }}
                        >
                          <CheckCircle2 size={12} /> Complete
                        </Btn>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Visit Date &amp; Time</span>
                      <strong className="text-foreground">
                        {booking.ocular_visit?.scheduled_date ? new Date(booking.ocular_visit.scheduled_date).toLocaleDateString() : "Not scheduled"}
                        {booking.ocular_visit?.scheduled_time ? ` @ ${booking.ocular_visit.scheduled_time}` : ""}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Inspection Status</span>
                      <strong className="text-foreground capitalize">{booking.ocular_visit?.status || "Pending"}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Outcome</span>
                      <strong className="text-foreground">
                        {booking.ocular_visit?.outcome === "proceed" ? "Passed (Proceed with Setup)" : booking.ocular_visit?.outcome || "Pending Inspection"}
                      </strong>
                    </div>
                  </div>

                  {booking.ocular_visit?.notes && (
                    <div className="p-2.5 bg-card border border-border/60 rounded-lg text-xs text-muted-foreground">
                      <span className="font-bold text-foreground">Place Measurements &amp; Notes:</span> {booking.ocular_visit.notes}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 2: INQUIRY & QUOTATION LINEAGE (Direct Client Solution!) */}
          {/* ============================================================ */}
          {activeTab === "inquiry_quote" && (
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Original Customer Request */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} className="text-primary" /> Original Customer Request
                    </h3>
                    {sourceInquiry && (
                      <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                        #{sourceInquiry.reference || String(sourceInquiry._id).slice(-6).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {sourceInquiry && (
                    <button
                      onClick={() => navigate(`/admin/bookings/inquiries/${sourceInquiry._id}/details`)}
                      className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowUpRight size={11} /> Open Inquiry Page
                    </button>
                  )}
                </div>

                {sourceInquiry ? (
                  <div className="space-y-3 text-xs">
                    {/* Health & Safety Safety Alerts */}
                    {(sourceInquiry.allergies || sourceInquiry.dietary_restrictions || booking.allergies || booking.dietary_restrictions) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-lg bg-red-50/70 border border-red-200">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 flex items-center gap-1">
                            <ShieldAlert size={12} /> Allergies Reported
                          </span>
                          <p className="text-red-900 font-semibold mt-0.5">
                            {sourceInquiry.allergies || booking.allergies || "None reported"}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                            <HeartPulse size={12} /> Dietary Restrictions
                          </span>
                          <p className="text-amber-900 font-semibold mt-0.5">
                            {sourceInquiry.dietary_restrictions || booking.dietary_restrictions || "Standard diet"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Customer Budget</span>
                        <strong className="text-emerald-700 font-mono">
                          {sourceInquiry.budget_range || "Flexible / Not specified"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Celebrant / For</span>
                        <strong className="text-foreground">
                          {sourceInquiry.celebrant_name || (sourceInquiry.booking_for === "someone_else" ? "Someone Else" : "Client")}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Inquiry Submitted</span>
                        <strong className="text-foreground">
                          {sourceInquiry.createdAt ? new Date(sourceInquiry.createdAt).toLocaleDateString() : "N/A"}
                        </strong>
                      </div>
                    </div>

                    {sourceInquiry.special_requests && (
                      <div className="p-3 bg-card border border-border/60 rounded-lg">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                          Special Requests &amp; Notes
                        </span>
                        <p className="text-foreground whitespace-pre-line leading-relaxed">
                          {sourceInquiry.special_requests}
                        </p>
                      </div>
                    )}

                    {/* Inspiration Pegs & Moodboard */}
                    {Array.isArray(sourceInquiry.inspiration_images) && sourceInquiry.inspiration_images.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                          <Sparkles size={11} className="text-primary" /> Customer Inspiration Pegs ({sourceInquiry.inspiration_images.length})
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                          {sourceInquiry.inspiration_images.map((imgUrl, i) => (
                            <a
                              key={i}
                              href={imgUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-video rounded-lg overflow-hidden border border-border bg-card shadow-2xs hover:ring-2 hover:ring-primary transition-all block"
                              title="Click to open full resolution image"
                            >
                              <img
                                src={imgUrl}
                                alt={`Inspiration Peg ${i + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                                <ExternalLink size={10} /> View
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                    <Info size={20} className="mx-auto text-muted-foreground/60 mb-1" />
                    <p className="font-semibold text-foreground">Direct Admin Reservation</p>
                    <p>This booking was created directly by the admin without a customer-submitted web inquiry.</p>
                  </div>
                )}
              </div>

              {/* Quotation Lineage & Versions */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard size={13} className="text-primary" /> Official Quotation Lineage
                    </h3>
                    {quotationVersions.length > 0 && (
                      <span className="font-mono text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">
                        {quotationVersions.length} Version{quotationVersions.length === 1 ? "" : "s"} Issued
                      </span>
                    )}
                  </div>
                  {latestQuotation && (
                    <Btn
                      size="xs"
                      variant="secondary"
                      onClick={() => setShowInvoiceModal(true)}
                    >
                      <Printer size={12} /> View Official Quote PDF
                    </Btn>
                  )}
                </div>

                {latestQuotation ? (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-card border border-border/60 rounded-lg">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quotation Ref</span>
                        <strong className="font-mono text-foreground">{latestQuotation.quotation_number || "QTN"}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Issued Date</span>
                        <strong className="text-foreground">
                          {latestQuotation.createdAt ? new Date(latestQuotation.createdAt).toLocaleDateString() : "N/A"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quoted Amount</span>
                        <strong className="font-mono text-foreground">{fmt(latestQuotation.total_cost)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Required Deposit</span>
                        <strong className="font-mono text-emerald-700">{fmt(latestQuotation.deposit_amount)}</strong>
                      </div>
                    </div>

                    {/* Version History pills */}
                    {quotationVersions.length > 1 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Quotation Version Revisions
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {quotationVersions.map((q, idx) => (
                            <div key={q._id || idx} className="p-2.5 rounded-lg border border-border/60 bg-card text-xs space-y-0.5">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-bold text-foreground">v{q.version_number || (idx + 1)}</span>
                                <span className="font-mono font-bold text-foreground">{fmt(q.total_cost)}</span>
                              </div>
                              <span className="text-[10.5px] text-muted-foreground block">
                                {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : ""} · {q.status || "Issued"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
                    <Info size={20} className="mx-auto text-muted-foreground/60 mb-1" />
                    <p className="font-semibold text-foreground">No Quotation Records</p>
                    <p>This reservation was created with fixed pricing and did not undergo quotation drafting.</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 3: STAFF & EQUIPMENT                                     */}
          {/* ============================================================ */}
          {activeTab === "staff_equipment" && (
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Coordinator Management */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-primary" /> Event Coordinator
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManagerId(booking.event_manager_id?._id || booking.event_manager_id || "");
                      setShowAssignManagerModal(true);
                    }}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {booking.event_manager_id ? <><Edit size={11} /> Change Coordinator</> : <><UserPlus size={11} /> Assign Coordinator</>}
                  </button>
                </div>

                {booking.event_manager_id ? (
                  <div className="p-3 bg-card border border-border/60 rounded-lg flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 border border-primary/20 text-sm">
                        {(booking.event_manager_id.full_name || "M").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-foreground text-sm truncate flex items-center gap-2">
                          <span>{booking.event_manager_id.full_name}</span>
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                            Active Lead
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-3 mt-0.5">
                          {booking.event_manager_id.email && <span>{booking.event_manager_id.email}</span>}
                          {booking.event_manager_id.phone && <span>• {booking.event_manager_id.phone}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      setSelectedManagerId("");
                      setShowAssignManagerModal(true);
                    }}
                    className="p-5 border border-dashed border-border rounded-lg text-center cursor-pointer hover:border-primary/60 hover:bg-card transition-colors group space-y-1"
                  >
                    <UserPlus size={18} className="mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-xs font-semibold text-foreground">No Coordinator Assigned</p>
                    <p className="text-[11px] text-muted-foreground">Click here to assign an active manager to supervise this event.</p>
                  </div>
                )}
              </div>

              {/* Staff Team Dispatch */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={13} className="text-primary" /> Dispatched Staff Team &amp; Crew
                    </h3>
                    <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {booking.staff_assignments?.length || 0} Crew Members
                    </span>
                  </div>
                  <Btn
                    size="xs"
                    variant="secondary"
                    onClick={() => setShowAssignTeamModal(true)}
                  >
                    {booking.staff_assignments?.length > 0 ? <><Edit size={12} /> Edit Staff Team</> : <><UserPlus size={12} /> Assign Team</>}
                  </Btn>
                </div>

                {Array.isArray(booking.staff_assignments) && booking.staff_assignments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {booking.staff_assignments.map((assignment, idx) => {
                      const memberName = assignment.name || assignment.user_id?.full_name || "Staff Member";
                      const memberPhone = assignment.phone || assignment.user_id?.phone || "No phone";
                      const memberRole = assignment.role || "Crew";
                      const isHeadCook = memberRole.toLowerCase().includes("cook") || memberRole.toLowerCase().includes("chef");
                      const isServer = memberRole.toLowerCase().includes("server");
                      const isSetup = memberRole.toLowerCase().includes("setup");

                      return (
                        <div key={idx} className="p-3 bg-card border border-border/60 rounded-lg flex items-start gap-2.5 text-xs shadow-2xs">
                          <div className={`w-8 h-8 rounded-md font-bold text-xs flex items-center justify-center shrink-0 border ${
                            isHeadCook ? "bg-amber-100 text-amber-900 border-amber-300" :
                            isServer ? "bg-blue-100 text-blue-900 border-blue-200" :
                            isSetup ? "bg-emerald-100 text-emerald-900 border-emerald-200" :
                            "bg-muted text-muted-foreground border-border"
                          }`}>
                            {memberName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-foreground truncate">{memberName}</span>
                              <span className="text-[9px] font-bold uppercase tracking-tight px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                {memberRole}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                              <Phone size={10} className="text-muted-foreground/60 shrink-0" />
                              <span>{memberPhone}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div 
                    onClick={() => setShowAssignTeamModal(true)}
                    className="p-5 border border-dashed border-border rounded-lg text-center cursor-pointer hover:border-primary/60 hover:bg-card transition-colors group space-y-1"
                  >
                    <Users size={18} className="mx-auto text-muted-foreground group-hover:text-primary transition-colors" />
                    <p className="text-xs font-semibold text-foreground">No Crew Assigned</p>
                    <p className="text-[11px] text-muted-foreground">Click here to dispatch head cooks, servers, and setup crew for event day.</p>
                  </div>
                )}
              </div>


            </div>
          )}

          {/* ============================================================ */}
          {/* TAB 4: FINANCIALS & REVISION HISTORY                         */}
          {/* ============================================================ */}
          {activeTab === "financials_history" && (
            <div className="p-4 sm:p-5 space-y-4">
              
              {/* Unified Single Financial Breakdown (No double cards!) */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard size={13} className="text-primary" /> Unified Financial Breakdown
                  </h3>
                  <button
                    onClick={() => navigate(`/admin/payments?booking=${booking._id}`)}
                    className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowUpRight size={11} /> Record / View Payments
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Itemized Calculation */}
                  <div className="space-y-2 p-3 bg-card border border-border/60 rounded-lg">
                    <div className="flex justify-between py-1 text-muted-foreground">
                      <span>Base Package Subtotal:</span>
                      <strong className="font-mono text-foreground">{fmt(basePackageSubtotal)}</strong>
                    </div>
                    <div className="flex justify-between py-1 text-muted-foreground">
                      <span>Add-ons &amp; Services Subtotal:</span>
                      <strong className="font-mono text-foreground">{fmt(addOnsSubtotal)}</strong>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between py-1 text-emerald-700">
                        <span>Discount / Special Reduction:</span>
                        <strong className="font-mono">- {fmt(discountAmount)}</strong>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-border font-bold text-sm text-foreground">
                      <span>Grand Total:</span>
                      <span className="font-mono text-primary">{fmt(grandTotal)}</span>
                    </div>
                  </div>

                  {/* Payment Settlement & Preference */}
                  <div className="space-y-2 p-3 bg-card border border-border/60 rounded-lg flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Payment Status:</span>
                        <Badge status={booking.payment_status} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Approved Paid:</span>
                        <strong className="font-mono text-emerald-700 font-bold">{fmt(totalPaid)}</strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Remaining Balance:</span>
                        <strong className={`font-mono font-bold ${remainingBalance > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                          {fmt(remainingBalance)}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-border/40">
                        <span className="text-muted-foreground">Settlement Preference:</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-foreground">
                          {booking.balance_payment_preference === "in_person" ? "Cash on Event Day" : "Online Payment"}
                        </span>
                      </div>
                    </div>

                    <Btn
                      size="xs"
                      variant="secondary"
                      className="w-full justify-center mt-2"
                      onClick={() => navigate(`/admin/payments?booking=${booking._id}`)}
                    >
                      Open Payments Portal
                    </Btn>
                  </div>
                </div>
              </div>

              {/* Revision History & Deal Audit Trail */}
              <div className="bg-muted/20 border border-border/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/50 pb-2">
                  <h3 className="font-bold text-xs text-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <History size={13} className="text-primary" /> Booking Revisions &amp; Audit Trail
                  </h3>
                  <span className="text-[10.5px] font-mono font-bold text-muted-foreground">
                    {booking.revision_count || 0} Revisions Logged
                  </span>
                </div>

                <BookingRevisionHistory booking={booking} sourceQuotation={sourceQuotation} />
              </div>

            </div>
          )}

        </div>

        {/* ============================================================ */}
        {/* 4. MODALS & SUB-COMPONENTS (100% PRESERVED)                  */}
        {/* ============================================================ */}


        {/* Modal: Revision Proposal Review */}
        <RevisionProposalModal
          open={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          booking={booking}
          onAccept={handleAcceptRevision}
          onReject={handleRejectRevision}
          isCustomer={false}
        />

        {/* Modal: Full Booking Edit */}
        <AdminBookingEditModal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          booking={booking}
          totalPaid={totalPaid}
          onSaved={loadData}
        />

        {/* Modal: Send Quote */}
        <Dialog open={showQuoteModal} onOpenChange={setShowQuoteModal}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleSendQuote}>
              <DialogHeader>
                <DialogTitle>Send Official Quotation</DialogTitle>
                <DialogDescription>Set total price and pricing notes for this customer inquiry.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Total Cost (₱)</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 55000"
                    value={quoteForm.total_price} 
                    onChange={(e) => setQuoteForm({ ...quoteForm, total_price: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Notes / Terms</label>
                  <textarea 
                    rows={4}
                    className="w-full text-xs rounded-xl border border-border p-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Include terms e.g. Requires 20% deposit..."
                    value={quoteForm.notes} 
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })} 
                  />
                </div>
              </div>

              <DialogFooter>
                <Btn type="button" variant="secondary" onClick={() => setShowQuoteModal(false)}>Cancel</Btn>
                <Btn type="submit" variant="primary">Send Quote</Btn>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Reschedule Ocular Visit */}
        <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
          <DialogContent className="sm:max-w-[560px]">
            <form onSubmit={handleScheduleOcular}>
              <DialogHeader className="border-b border-border pb-3">
                <DialogTitle className="text-base font-bold text-foreground">
                  {booking?.ocular_visit?.scheduled_date ? "Reschedule Ocular Visit" : "Schedule Ocular Visit"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Set the inspection date and time slot for venue place measurements.
                </DialogDescription>
              </DialogHeader>

              <div className="py-3">
                <AdminOcularDateTimePicker
                  selectedBooking={booking}
                  dateValue={ocularDate}
                  timeValue={ocularTime}
                  onDateChange={setOcularDate}
                  onTimeChange={setOcularTime}
                />
              </div>

              <DialogFooter className="border-t border-border pt-3">
                <Btn type="button" variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Btn>
                <Btn type="submit" variant="primary" disabled={!ocularDate || !ocularTime}>
                  Confirm Schedule
                </Btn>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Complete Ocular Inspection */}
        <Dialog open={showCompleteOcularModal} onOpenChange={setShowCompleteOcularModal}>
          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleCompleteOcular}>
              <DialogHeader>
                <DialogTitle>Complete Ocular Inspection</DialogTitle>
                <DialogDescription>
                  Log the venue measurement findings and inspection outcome.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Inspection Outcome</label>
                  <select
                    value={ocularOutcome}
                    onChange={(e) => setOcularOutcome(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-input bg-background font-medium text-foreground focus:ring-1 focus:ring-primary"
                  >
                    <option value="proceed">Inspection Passed — Proceed with Event</option>
                    <option value="revise">Revision Needed — Requires Setup Adjustment</option>
                    <option value="reschedule">Reschedule Needed — Site Not Ready</option>
                    <option value="cancel">Cancel Booking — Venue Infeasible</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">Inspection Notes &amp; Place Measurements</label>
                  <textarea 
                    rows={4}
                    className="w-full text-xs rounded-xl border border-border p-3 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Log venue area dimensions, scaffold sizing, power outlets, kitchen access..."
                    value={ocularInspectionNotes} 
                    onChange={(e) => setOcularInspectionNotes(e.target.value)} 
                  />
                </div>
              </div>

              <DialogFooter>
                <Btn type="button" variant="secondary" onClick={() => setShowCompleteOcularModal(false)}>Cancel</Btn>
                <Btn type="submit" variant="primary" disabled={isSubmittingOcular}>
                  {isSubmittingOcular ? "Saving..." : "Record Outcome"}
                </Btn>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Assign Coordinator */}
        <Dialog open={showAssignManagerModal} onOpenChange={setShowAssignManagerModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                  <ShieldCheck size={20} className="text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">Assign Event Coordinator</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Designate an active Event Manager to oversee this reservation.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-2.5 py-3 max-h-[360px] overflow-y-auto pr-1">
              {/* Option: Unassigned */}
              <div
                onClick={() => setSelectedManagerId("")}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  selectedManagerId === ""
                    ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground"
                    : "border-border hover:border-border/80 bg-card text-muted-foreground"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                    —
                  </div>
                  <div>
                    <div className="text-xs font-bold text-foreground">Unassigned (No Coordinator)</div>
                    <div className="text-[11px] text-muted-foreground">Leave unassigned for now</div>
                  </div>
                </div>
                {selectedManagerId === "" && (
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* List of Available Managers */}
              {managers.map((mgr) => {
                const isSelected = String(selectedManagerId) === String(mgr._id);
                const initials = (mgr.full_name || "M").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={mgr._id}
                    onClick={() => setSelectedManagerId(mgr._id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary text-foreground shadow-2xs"
                        : "border-border hover:border-border/80 bg-card text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-primary/10 text-primary border border-primary/20">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <span className="truncate">{mgr.full_name}</span>
                          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded shrink-0">
                            Active
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate flex items-center gap-2 mt-0.5">
                          {mgr.email && <span className="truncate">{mgr.email}</span>}
                          {mgr.phone && <span>• {mgr.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 ml-2">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}

              {managers.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground bg-muted/30 rounded-xl">
                  No active Event Managers found in staff directory.
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Btn 
                type="button" 
                variant="secondary" 
                onClick={() => setShowAssignManagerModal(false)}
                disabled={savingManager}
              >
                Cancel
              </Btn>
              <Btn 
                type="button" 
                variant="primary" 
                onClick={handleUpdateManager}
                disabled={savingManager}
              >
                {savingManager ? "Saving..." : "Confirm & Save"}
              </Btn>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Staff Team Modal */}
        <AdminAssignStaffModal
          booking={booking}
          open={showAssignTeamModal}
          onClose={() => setShowAssignTeamModal(false)}
          onSave={(updatedBooking) => {
            if (updatedBooking) setBooking(updatedBooking);
            loadData();
          }}
        />

        {/* Invoice Modal & Printable Document */}
        <InvoiceModal
          open={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          booking={booking}
          payments={payments}
          businessInfo={businessInfo}
          context="admin"
        />

        {/* Printable Invoice */}
        {!showInvoiceModal && (
          <PrintableInvoice booking={booking} payments={payments} businessInfo={businessInfo} />
        )}

        {/* Approve Booking Cancellation Modal */}
        <Dialog open={showApproveCancelModal} onOpenChange={setShowApproveCancelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-1 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Approve Booking Cancellation?
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This will officially cancel booking <strong>#{booking.reference || booking._id}</strong>, release any reserved inventory items, and update customer status.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="p-3 bg-muted/40 rounded-lg border border-border/70 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client:</span>
                  <span className="font-semibold text-foreground">{customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Event Date:</span>
                  <span className="font-semibold text-foreground">
                    {booking.event_date ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "TBD"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid:</span>
                  <span className="font-bold text-emerald-700 font-mono">{fmt(totalPaid)}</span>
                </div>
                <div className="pt-1 border-t border-border/50 text-[11px] text-muted-foreground">
                  <strong>Customer Reason:</strong> "{cancellationReason}"
                </div>
              </div>

              {totalPaid > 0 && (
                <div className="space-y-2 pt-1 border-t border-border/60">
                  <label className="text-xs font-bold text-foreground block">
                    Refund Resolution Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRefundMode("queue")}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        refundMode === "queue"
                          ? "border-primary bg-primary/5 text-foreground font-semibold ring-1 ring-primary"
                          : "border-border bg-background text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground mb-0.5">Send to Refund Queue</div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Calculate exact deductions &amp; issue refund voucher in Refund Management.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRefundMode("custom")}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                        refundMode === "custom"
                          ? "border-primary bg-primary/5 text-foreground font-semibold ring-1 ring-primary"
                          : "border-border bg-background text-muted-foreground hover:border-border/80"
                      }`}
                    >
                      <div className="font-bold text-xs text-foreground mb-0.5">Direct Refund Now</div>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Specify immediate refund amount and record refund transaction now.
                      </p>
                    </button>
                  </div>

                  {refundMode === "custom" && (
                    <div className="p-3 bg-muted/30 rounded-lg border border-border/80 space-y-2 mt-2">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Refund Amount (₱)
                        </label>
                        <Input
                          type="number"
                          max={totalPaid}
                          min="0"
                          step="any"
                          value={customRefundAmount}
                          onChange={(e) => setCustomRefundAmount(e.target.value)}
                          placeholder="0.00"
                          className="text-xs font-mono h-8"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Maximum refundable: {fmt(totalPaid)}
                        </span>
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Refund / Deduction Reason
                        </label>
                        <Input
                          type="text"
                          value={customRefundReason}
                          onChange={(e) => setCustomRefundReason(e.target.value)}
                          placeholder="e.g., 50% deposit refund per cancellation terms"
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Admin Internal Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={adminCancelNote}
                  onChange={(e) => setAdminCancelNote(e.target.value)}
                  placeholder="Additional context or notes regarding this cancellation approval..."
                  className="w-full text-xs rounded-lg border border-border p-2 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Btn
                type="button"
                variant="secondary"
                onClick={() => setShowApproveCancelModal(false)}
                disabled={cancelActionLoading}
              >
                Cancel
              </Btn>
              <Btn
                type="button"
                variant="destructive"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                onClick={handleApproveCancellation}
                disabled={cancelActionLoading}
              >
                {cancelActionLoading ? "Processing..." : "Confirm Cancellation"}
              </Btn>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Decline Booking Cancellation Modal */}
        <Dialog open={showRejectCancelModal} onOpenChange={setShowRejectCancelModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mb-1 text-amber-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-bold text-foreground">
                Decline Cancellation Request
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                This will decline the customer's cancellation request and keep booking <strong>#{booking.reference || booking._id}</strong> active.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-1">
              <div className="p-3 bg-muted/40 rounded-lg border border-border/70 text-xs">
                <p className="text-muted-foreground mb-1">Customer's Requested Reason:</p>
                <p className="font-medium text-foreground italic">"{cancellationReason}"</p>
              </div>

              <div>
                <label className="text-xs font-bold text-foreground block mb-1">
                  Reason for Declining <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={adminCancelNote}
                  onChange={(e) => setAdminCancelNote(e.target.value)}
                  placeholder="Explain why the cancellation cannot be approved (this will be sent to the customer)..."
                  className="w-full text-xs rounded-lg border border-border p-2.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  The client will be notified via their dashboard and in-app notifications.
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Btn
                type="button"
                variant="secondary"
                onClick={() => setShowRejectCancelModal(false)}
                disabled={cancelActionLoading}
              >
                Cancel
              </Btn>
              <Btn
                type="button"
                variant="primary"
                className="font-bold"
                onClick={handleRejectCancellation}
                disabled={cancelActionLoading}
              >
                {cancelActionLoading ? "Submitting..." : "Send Decline Notice"}
              </Btn>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </AdminLayout>
  );
}
