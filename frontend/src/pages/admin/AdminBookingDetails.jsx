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
  Boxes,
  PackageCheck,
  PackagePlus,
  Eye,
  ShieldCheck,
  UserPlus,
  Truck,
  Sparkles,
  Layers,
  AlertTriangle
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminCard from "../../components/admin/ui/AdminCard";
import Btn from "../../components/admin/ui/Btn";
import Badge from "../../components/admin/ui/Badge";
import AssignEquipmentModal from "../../components/admin/ui/AssignEquipmentModal";
import RevisionProposalModal from "../../components/booking/RevisionProposalModal";
import BookingRevisionHistory from "../../components/booking/BookingRevisionHistory";
import PrintableInvoice from "../../components/admin/ui/PrintableInvoice";
import { AdminAPI } from "../../api/admin";
import useToast from "../../hooks/useToast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { createConversation } from "../../api/messages";
import { menuAmountLabel } from "../../utils/quotationPricing";
import { isFoodOnly, isSetupOnly, isOcularRequired } from "../../components/customer/portal/statusMeta";

export default function AdminBookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  // Modals state
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showCompleteOcularModal, setShowCompleteOcularModal] = useState(false);
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [sourceQuotation, setSourceQuotation] = useState(null);

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

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Try fetching booking directly
      let bookingData = null;
      try {
        const bRes = await AdminAPI.getBooking(id);
        bookingData = bRes.data;
      } catch (err) {
        // Fallback: check if id is an inquiry or converted booking ID
        try {
          const inqRes = await AdminAPI.getInquiry(id);
          if (inqRes.data?.converted_booking_id) {
            const bRes2 = await AdminAPI.getBooking(inqRes.data.converted_booking_id);
            bookingData = bRes2.data;
          } else {
            bookingData = inqRes.data;
          }
        } catch (inqErr) {
          // Fallback: search in getBookings list
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
      } catch (sErr) {
        setManagers([]);
      }

      // Fetch payments for this booking
      try {
        const pRes = await AdminAPI.getPayments();
        const bId = bookingData._id;
        setPayments((pRes.data || []).filter(p => String(p.booking_id?._id || p.booking_id) === String(bId) || String(p.inquiry_id?._id || p.inquiry_id) === String(bId)));
      } catch (pErr) {
        setPayments([]);
      }

      // Fetch source quotation lineage
      try {
        let inquiryId = bookingData.inquiry_id?._id || bookingData.inquiry_id;
        if (!inquiryId) {
          const inqRes = await AdminAPI.getInquiries();
          const sourceInquiry = (inqRes.data || []).find(
            (i) => String(i.converted_booking_id || "") === String(bookingData._id)
          );
          inquiryId = sourceInquiry?._id;
        }
        if (inquiryId) {
          const qRes = await AdminAPI.getQuotationsForInquiry(inquiryId);
          const allVersions = qRes.data || [];
          if (allVersions.length > 0) {
            setSourceQuotation({ versions: allVersions });
          } else {
            setSourceQuotation(null);
          }
        } else {
          setSourceQuotation(null);
        }
      } catch (qErr) {
        setSourceQuotation(null);
      }

      // Populate edit form
      setEditForm({
        guest_count: bookingData.guest_count || "",
        event_date: bookingData.event_date ? new Date(bookingData.event_date).toISOString().split('T')[0] : "",
        start_time: bookingData.start_time || "",
        venue_type: bookingData.venue_type || "",
        status: bookingData.status || "",
        total_price: bookingData.total_price || ""
      });

      if (bookingData.ocular_visit) {
        setOcularDate(bookingData.ocular_visit.scheduled_date ? new Date(bookingData.ocular_visit.scheduled_date).toISOString().split('T')[0] : "");
        setOcularTime(bookingData.ocular_visit.scheduled_time || "");
        setOcularOutcome(bookingData.ocular_visit.outcome || "proceed");
        setOcularInspectionNotes(bookingData.ocular_visit.notes || "");
      }
    } catch (err) {
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
        <div className="p-12 min-h-screen bg-background flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500" />
          <p className="text-sm font-medium text-slate-500">Loading reservation details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!booking) {
    return (
      <AdminLayout>
        <div className="p-12 min-h-screen bg-background flex flex-col items-center justify-center text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500" />
          <h3 className="text-lg font-serif font-bold text-slate-900">Booking Record Not Found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            We could not locate a booking or inquiry matching ID: <code className="font-mono">{id}</code>. It may have been deleted or converted.
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
        "Inquiry Received",
        "Quotation Sent",
        "Quote Accepted",
        "Deposit Paid",
        "Confirmed",
        "Food Preparation",
        "Out for Delivery",
        "Delivered & Completed",
      ]
    : isSetupOnlyService
    ? [
        "Inquiry Received",
        "Quotation Sent",
        "Quote Accepted",
        "Deposit Paid",
        "Confirmed",
        "Ocular Scheduled",
        "Setup Preparation",
        "Completed",
      ]
    : [
        "Inquiry Received",
        "Quotation Sent",
        "Quote Accepted",
        "Deposit Paid",
        "Confirmed",
        "Ocular Scheduled",
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

  // Independent Financial Breakdown Calculations
  const serviceItemsSubtotal = (booking.service_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const additionalChargesSubtotal = (booking.additional_charges || []).reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const menuItemsAddonSubtotal = (booking.menu_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0),
    0
  );
  const addOnsSubtotal = serviceItemsSubtotal + additionalChargesSubtotal + menuItemsAddonSubtotal;

  const pkg = booking.package_id;
  const guestCount = Number(booking.guest_count) || 0;
  
  let basePackageSubtotal = 0;
  let pkgRateText = "";
  if (pkg) {
    if (pkg.package_type === "Event Setup Only") {
      basePackageSubtotal = Number(pkg.setup_price || 0);
      pkgRateText = `${pkg.name || "Event Setup"} (Flat Setup Fee)`;
    } else {
      const perGuestRate = Number(pkg.price_per_guest || 0);
      basePackageSubtotal = perGuestRate * guestCount;
      pkgRateText = `${pkg.name || "Catering Package"} (${fmt(perGuestRate)}/head × ${guestCount} guests)`;
    }
  }

  const grandTotal = Number(booking.total_price) || 0;
  const discountAmount = Number(booking.discount_amount || 0);

  if (basePackageSubtotal === 0 && grandTotal > 0) {
    basePackageSubtotal = Math.max(0, grandTotal + discountAmount - addOnsSubtotal);
    pkgRateText = `Base Package Subtotal (${guestCount} guests)`;
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

  const handleResolveChange = () => {
    AdminAPI.resolveChangeRequest(booking._id, { status: "approved" })
      .then(() => {
        notify("Change request marked as resolved.", "success");
        setShowChangeModal(false);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to resolve change request.", "error"));
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

  const handleUpdateDetails = (e) => {
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

    if (proposeToCustomer) {
      AdminAPI.proposeRevision(booking._id, {
        ...editForm,
        guest_count: Number(editForm.guest_count),
        total_price: Number(editForm.total_price),
        message: revisionNote.trim()
      })
      .then(() => {
        notify("Revised booking proposal sent to customer for confirmation!", "success");
        setShowEditModal(false);
        if (showChangeModal) setShowChangeModal(false);
        loadData();
      })
      .catch((err) => notify(err.response?.data?.message || "Failed to propose revision.", "error"));
    } else {
      AdminAPI.updateBooking(booking._id, { 
        ...editForm, 
        guest_count: Number(editForm.guest_count),
        total_price: Number(editForm.total_price),
        revision_note: revisionNote ? revisionNote.trim() : undefined 
      })
        .then(() => {
          notify("Booking details updated successfully.", "success");
          setShowEditModal(false);
          if (showChangeModal) setShowChangeModal(false);
          loadData();
        })
        .catch((err) => notify(err.response?.data?.message || "Failed to update booking.", "error"));
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

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 bg-background min-h-screen">
        
        {/* Top Breadcrumb & Action Navigation */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <button onClick={() => navigate("/admin/bookings/reservations")} className="hover:text-slate-900 flex items-center gap-1 font-medium transition-colors">
              <ChevronLeft size={14} /> Reservations
            </button>
            <ChevronRight size={12} className="text-slate-300" />
            <span className="font-mono font-bold text-amber-700">{booking.reference || `BK-${booking._id.substring(0,6).toUpperCase()}`}</span>
            <Badge status={booking.status} />
            {booking.is_revised && (
              <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold font-mono px-2 py-0.5 rounded-md">
                Revised (v{booking.revision_count || 1})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Btn size="sm" variant="secondary" onClick={() => window.print()}>
              <Printer size={13} /> Print Invoice
            </Btn>

            <Btn size="sm" variant="secondary" onClick={openCustomerChat}>
              <MessageSquare size={13} /> Message Customer
            </Btn>

            {booking.status === "inquiry" && (
              <Btn size="sm" variant="primary" onClick={() => setShowQuoteModal(true)}>
                <Send size={13} /> Send Official Quote
              </Btn>
            )}

            {["pending deposit", "Deposit Pending"].includes(booking.status) && (
              <Btn size="sm" variant="primary" onClick={handleApprove}>
                <Check size={13} /> Confirm & Approve Booking
              </Btn>
            )}

            {!["cancelled", "completed"].includes(rawStatus) && (
              <Btn size="sm" variant="secondary" onClick={handleOpenEditModal}>
                <Edit size={13} /> Propose / Edit Details
              </Btn>
            )}
          </div>
        </div>

        {/* Pending Revision Proposal Banner */}
        {booking.pending_revision && ["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status) && (
          <div className="bg-amber-50 border border-amber-300 rounded-md shadow-2xs p-3.5 sm:p-4 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-4 h-4 text-amber-600 mt-0.5 shrink-0 animate-spin-slow" />
              <div>
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                  {booking.pending_revision.status === "pending_customer_approval" ? "Revised Proposal Sent to Customer (Awaiting Confirmation)" : "Customer Proposed Booking Revision (Action Required)"}
                </h4>
                <p className="text-amber-800 mt-0.5 leading-relaxed font-medium text-[11px]">
                  {booking.pending_revision.message || "Proposed changes pending mutual deal confirmation."}
                </p>
              </div>
            </div>
            <Btn size="sm" variant="primary" className="shrink-0 font-bold" onClick={() => setShowProposalModal(true)}>
              Review Revision Deal
            </Btn>
          </div>
        )}

        {/* Change Request Alert Banner */}
        {booking.change_request?.status === "pending" && booking.change_request?.message && (!booking.pending_revision || !["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status)) && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-md shadow-2xs p-3.5 sm:p-4 flex items-start justify-between gap-4 text-xs">
            <div className="flex items-start gap-3">
              <Send className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <h4 className="font-bold text-indigo-950 text-xs sm:text-sm">Customer Change Request Pending Review</h4>
                <p className="text-indigo-800 mt-0.5 leading-relaxed text-[11px]">{booking.change_request.message}</p>
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
              Review &amp; Propose Changes
            </Btn>
          </div>
        )}

        {/* Progress Stepper Bar */}
        <AdminCard className="!p-5 overflow-x-auto">
          <p className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-4">Booking Lifecycle Progress</p>
          <div className="flex items-center justify-between min-w-max pb-2">
            {TIMELINE_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                    i <= completedIdx ? "border-amber-500 bg-amber-500 text-slate-950" :
                    i === completedIdx + 1 ? "border-amber-500 bg-white text-amber-600" :
                    "border-slate-200 bg-white text-slate-400"
                  }`}>
                    {i <= completedIdx ? <Check size={12} strokeWidth={3} /> : i + 1}
                  </div>
                  <p className={`text-[10px] font-semibold mt-1.5 text-center max-w-16 leading-tight ${
                    i <= completedIdx ? "text-slate-900" : "text-slate-400"
                  }`}>{step}</p>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`h-0.5 w-10 mb-5 mx-1.5 transition-colors ${i < completedIdx ? "bg-amber-500" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>
        </AdminCard>

        {/* Main 3-Column Info Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Customer Info Card */}
          <AdminCard className="!p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Customer Details</span>
              <UserCheck className="w-4 h-4 text-slate-400" />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-amber-100 text-amber-800 font-bold text-sm flex items-center justify-center shrink-0">
                {customerName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{customerName}</h4>
                <span className="text-xs text-slate-500">Registered Client</span>
              </div>
            </div>


            <div className="space-y-3 text-xs pt-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{booking.contact_phone || booking.customer_id?.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="truncate">{booking.contact_email || booking.customer_id?.email || "N/A"}</span>
              </div>
              <div className="flex items-start gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {[booking.street, booking.barangay, booking.municipality, booking.province, booking.zip_code]
                    .filter(Boolean)
                    .join(", ") || "No address specified"}
                  {booking.landmark && <span className="block text-slate-400 text-[11px]">Landmark: {booking.landmark}</span>}
                </span>
              </div>
            </div>
          </AdminCard>

          {/* Event Schedule Info Card */}
          <AdminCard className="!p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event & Location</span>
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-slate-50">
                <span className="text-slate-500">Event Type</span>
                <strong className="text-slate-900 font-bold">{booking.event_type || "Catering Event"}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-50">
                <span className="text-slate-500">Target Date</span>
                <strong className="text-slate-900">{booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBA"}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-50">
                <span className="text-slate-500">Start Time</span>
                <strong className="text-slate-900">{booking.start_time || "TBA"}</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-50">
                <span className="text-slate-500">Guest Count</span>
                <strong className="text-slate-900">{booking.guest_count || 0} Guests</strong>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-50">
                <span className="text-slate-500">Venue / Location</span>
                <strong className="text-slate-900 text-right max-w-44 truncate">{booking.venue_type || booking.municipality || "TBA"}</strong>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                    {isFoodOnlyService ? "Kitchen / Dispatch Contact" : isSetupOnlyService ? "Event Stylist / Setup Lead" : "Event Coordinator"}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedManagerId(booking.event_manager_id?._id || booking.event_manager_id || "");
                      setShowAssignManagerModal(true);
                    }}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 hover:underline cursor-pointer transition-colors"
                  >
                    {booking.event_manager_id ? (
                      <>
                        <Edit size={11} /> Change
                      </>
                    ) : (
                      <>
                        <UserPlus size={11} /> Assign
                      </>
                    )}
                  </button>
                </div>

                {booking.event_manager_id ? (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-md shadow-2xs flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-amber-200 text-amber-950 font-bold text-xs flex items-center justify-center shrink-0 border border-amber-300">
                        {(booking.event_manager_id.full_name || "M").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate flex items-center gap-1.5">
                          <span>{booking.event_manager_id.full_name}</span>
                          <span className="text-[10px] text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded-md font-semibold shrink-0">
                            {isFoodOnlyService ? "Dispatch Lead" : isSetupOnlyService ? "Stylist" : "Manager"}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {booking.event_manager_id.email || booking.event_manager_id.phone || "Assigned Contact"}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : isFoodOnlyService ? (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-slate-400" />
                      <span>Not required on-site (Drop-off Delivery)</span>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      setSelectedManagerId("");
                      setShowAssignManagerModal(true);
                    }}
                    className="p-2.5 border border-dashed border-slate-200 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/40 rounded-md flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-2 text-slate-400 group-hover:text-amber-800">
                      <UserPlus size={14} />
                      <span className="text-xs font-medium">No Coordinator Assigned</span>
                    </div>
                    <span className="text-[11px] font-bold text-amber-700 group-hover:underline">
                      + Assign Now
                    </span>
                  </div>
                )}
              </div>
            </div>
          </AdminCard>

          {/* Financial Summary Card */}
          <AdminCard className="!p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Financial Overview</span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between pb-1 border-b border-slate-50">
                <span className="text-slate-500">Base Package Subtotal</span>
                <strong className="text-slate-900 font-bold">{fmt(basePackageSubtotal)}</strong>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-50">
                <span className="text-slate-500">Add-ons Subtotal</span>
                <strong className="text-slate-900 font-bold">{fmt(addOnsSubtotal)}</strong>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between pb-1 border-b border-slate-50 text-emerald-600 font-semibold">
                  <span>Discount / Adjustment</span>
                  <span>- {fmt(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pb-1.5 border-b border-slate-100 pt-1">
                <span className="text-slate-700 font-bold">Grand Total</span>
                <strong className="text-amber-900 text-sm font-bold">{fmt(grandTotal)}</strong>
              </div>
              <div className="flex justify-between pb-1 border-b border-slate-50">
                <span className="text-slate-500">Total Paid</span>
                <strong className="text-emerald-700 font-bold">{fmt(totalPaid)}</strong>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-slate-50">
                <span className="text-slate-500">Payment Status</span>
                <Badge status={booking.payment_status} />
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-600 font-semibold">Remaining Balance</span>
                <strong className={`text-sm font-bold ${remainingBalance > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {fmt(remainingBalance)}
                </strong>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Ocular Visit Card (for Setup/Full Catering) OR Delivery & Logistics Card (for Food Only) */}
        {isFoodOnlyService ? (
          <AdminCard className="!p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
                    Food Delivery &amp; Logistics Dispatch
                    <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                      Food Drop-Off (No Ocular Needed)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Food preparation dispatch, arrival schedule, and drop-off destination for this order.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-600 font-medium bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                  Delivery Method: <strong className="text-slate-900 capitalize">{booking.delivery_method || "Drop-Off Delivery"}</strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Target Arrival Date</span>
                <strong className="text-slate-900 font-bold text-sm block">
                  {booking.event_date
                    ? new Date(booking.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Date TBA"}
                </strong>
                <span className="text-[11px] text-slate-500">
                  {booking.start_time ? `Drop-off by ${booking.start_time}` : "Time TBA"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Delivery Destination</span>
                <strong className="text-slate-900 font-bold text-sm block truncate">
                  {booking.municipality || booking.barangay || "Local Delivery"}
                </strong>
                <span className="text-[11px] text-slate-500 truncate block">
                  {[booking.street, booking.barangay, booking.municipality].filter(Boolean).join(", ") || "Address TBA"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Drop-Off Contact</span>
                <strong className="text-slate-900 font-bold text-sm block truncate">
                  {customerName}
                </strong>
                <span className="text-[11px] text-slate-500 truncate block">
                  {booking.contact_phone || "No phone listed"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Service Handling</span>
                <strong className="text-slate-900 font-bold text-sm block text-amber-800">
                  Food Drop-Off Only
                </strong>
                <span className="text-[11px] text-slate-500 block">
                  Packed Catering / Drop &amp; Leave
                </span>
              </div>
            </div>

            {/* Delivery & Kitchen Notes */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Delivery Instructions &amp; Landmark
              </span>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
                {booking.landmark ? (
                  <div>
                    <strong>Landmark / Directions:</strong> {booking.landmark}
                    {booking.special_requests && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200">
                        <strong>Special Instructions:</strong> {booking.special_requests}
                      </div>
                    )}
                  </div>
                ) : booking.special_requests ? (
                  <div>
                    <strong>Special Instructions:</strong> {booking.special_requests}
                  </div>
                ) : (
                  <span className="text-slate-400 italic">No specific delivery landmark or instructions provided.</span>
                )}
              </div>
            </div>
          </AdminCard>
        ) : (
          <AdminCard className="!p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
                    Ocular Visit &amp; Venue Inspection
                    {booking.ocular_visit?.status === "completed" && (
                      <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                        {booking.ocular_visit.outcome === "proceed" ? "Inspection Passed ✓" : "Completed"}
                      </span>
                    )}
                    {booking.ocular_visit?.status === "scheduled" && (
                      <span className="text-[10px] font-bold font-mono text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md border border-blue-200">
                        Scheduled
                      </span>
                    )}
                    {booking.ocular_visit?.status === "requested" && (
                      <span className="text-[10px] font-bold font-mono text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                        Requested by Client
                      </span>
                    )}
                    {(!booking.ocular_visit?.status || booking.ocular_visit?.status === "pending") && (
                      <span className="text-[10px] font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        Pending Schedule
                      </span>
                    )}
                    {booking.ocular_visit?.is_required && (
                      <span className="text-[10px] font-bold font-mono text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                        Required
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Site inspection schedule, venue layout verification, and measurements for this reservation.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Btn
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    AdminAPI.updateBooking(booking._id, { 
                      ocular_visit: { 
                        ...(booking.ocular_visit || {}), 
                        is_required: !booking.ocular_visit?.is_required 
                      } 
                    })
                    .then(() => {
                      notify(`Ocular visit marked as ${!booking.ocular_visit?.is_required ? "required" : "optional"}`, "success");
                      loadData();
                    })
                    .catch(err => notify(err.response?.data?.message || "Failed to update ocular requirement", "error"));
                  }}
                  className={`text-xs ${booking.ocular_visit?.is_required ? 'border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {booking.ocular_visit?.is_required ? "Required" : "Mark as Required"}
                </Btn>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setOcularDate(booking.ocular_visit?.scheduled_date ? new Date(booking.ocular_visit.scheduled_date).toISOString().split('T')[0] : "");
                    setOcularTime(booking.ocular_visit?.scheduled_time || "");
                    setShowRescheduleModal(true);
                  }}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {booking.ocular_visit?.scheduled_date ? "Reschedule / Edit Visit" : "Schedule Ocular Visit"}
                </Btn>

                {booking.ocular_visit?.status === "scheduled" && (
                  <Btn
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setOcularOutcome(booking.ocular_visit?.outcome || "proceed");
                      setOcularInspectionNotes(booking.ocular_visit?.notes || "");
                      setShowCompleteOcularModal(true);
                    }}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Complete Inspection
                  </Btn>
                )}

                <Btn
                  size="sm"
                  variant="ghost"
                  onClick={() => navigate("/admin/bookings/ocular")}
                >
                  View in Ocular Management &rarr;
                </Btn>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs pt-2">
              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Visit Date &amp; Time</span>
                <strong className="text-slate-900 font-bold text-sm block">
                  {booking.ocular_visit?.scheduled_date
                    ? new Date(booking.ocular_visit.scheduled_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                    : "Not Scheduled"}
                </strong>
                <span className="text-[11px] text-slate-500">
                  {booking.ocular_visit?.scheduled_time ? `@ ${booking.ocular_visit.scheduled_time}` : "Time TBA"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Inspection Status</span>
                <strong className="text-slate-900 font-bold text-sm block capitalize">
                  {booking.ocular_visit?.status || "Pending"}
                </strong>
                <span className="text-[11px] text-slate-500">
                  {booking.ocular_visit?.completed_at
                    ? `Completed on ${new Date(booking.ocular_visit.completed_at).toLocaleDateString()}`
                    : "Awaiting site inspection"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Inspection Outcome</span>
                <strong className="text-slate-900 font-bold text-sm block">
                  {booking.ocular_visit?.outcome === "proceed"
                    ? "Inspection Passed (Proceed)"
                    : booking.ocular_visit?.outcome === "revise"
                    ? "Revision Needed"
                    : booking.ocular_visit?.outcome === "reschedule"
                    ? "Reschedule Needed"
                    : booking.ocular_visit?.outcome === "cancel"
                    ? "Cancelled"
                    : "Pending Inspection"}
                </strong>
                <span className="text-[11px] text-slate-500">
                  {booking.ocular_visit?.outcome === "proceed"
                    ? "Venue verified for setup"
                    : booking.ocular_visit?.outcome
                    ? "Follow-up required"
                    : "Outcome not logged yet"}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-md border border-slate-200/80 space-y-1 shadow-2xs">
                <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider block">Assigned Coordinator</span>
                <strong className="text-slate-900 font-bold text-sm block truncate">
                  {booking.event_manager_id?.full_name || "Unassigned"}
                </strong>
                <span className="text-[11px] text-slate-500 truncate block">
                  {booking.event_manager_id?.phone || booking.event_manager_id?.email || "No contact info"}
                </span>
              </div>
            </div>

            {/* Ocular Notes & Place Measurements */}
            <div className="pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Ocular Notes &amp; Place Measurements
              </span>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700 leading-relaxed whitespace-pre-line shadow-2xs">
                {booking.ocular_visit?.notes || (
                  <span className="text-slate-400 italic">No ocular inspection notes or place measurements recorded yet.</span>
                )}
              </div>
            </div>
          </AdminCard>
        )}

        {/* Itemized Menu & Service Details */}
        <AdminCard className="!p-6 space-y-4">
          <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
            {isSetupOnlyService ? (
              <>
                <Layers className="w-5 h-5 text-amber-600" /> Venue Styling &amp; Equipment Breakdown
              </>
            ) : (
              <>
                <Utensils className="w-5 h-5 text-amber-600" /> Itemized Menu &amp; Service Breakdown
              </>
            )}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Menu Items OR Venue Styling Details */}
            {isSetupOnlyService ? (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Venue Styling &amp; Inclusions</span>
                <div className="border border-slate-200 rounded-md p-3.5 bg-slate-50/50 text-xs space-y-2.5 shadow-2xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Theme / Concept:</span>
                    <strong className="text-slate-900">{booking.event_theme || booking.event_type || "Event Setup"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Venue Layout:</span>
                    <strong className="text-slate-900">{booking.venue_type || "Standard Venue"}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Guest Capacity:</span>
                    <strong className="text-slate-900">{booking.guest_count || 0} Guests</strong>
                  </div>
                  <div className="pt-2 border-t border-slate-200 text-slate-600 leading-relaxed">
                    <span className="font-semibold text-slate-700">Setup Service:</span> Includes complete backdrop, floral styling, table arrangements, and on-site setup team.
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Selected Menu Dishes</span>
                <div className="border border-slate-200 rounded-md overflow-hidden text-xs shadow-2xs">
                  {booking.menu_items && booking.menu_items.length > 0 ? (
                    booking.menu_items.map((item, idx) => (
                      <div key={idx} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center bg-white">
                        <div>
                          <strong className="text-slate-900">{item.name || item}</strong>
                          {/* The amount the quotation settled on, so the kitchen
                              reads the same order the customer accepted. */}
                          {menuAmountLabel(item) && (
                            <span className="ml-1.5 text-[11px] font-semibold text-slate-500">
                              {menuAmountLabel(item)}
                            </span>
                          )}
                          {item.note && <span className="block text-slate-400 text-[11px]">{item.note}</span>}
                        </div>
                        <span className="font-semibold text-slate-700">{item.price ? fmt(item.price) : "Included"}</span>
                      </div>
                    ))
                  ) : (
                    <p className="p-4 text-center text-slate-400 text-xs">No specific menu items listed.</p>
                  )}
                </div>
              </div>
            )}

            {/* Service & Add-ons */}
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Add-ons &amp; Equipment Services</span>
              <div className="border border-slate-200 rounded-md overflow-hidden text-xs shadow-2xs">
                {booking.service_items && booking.service_items.length > 0 ? (
                  booking.service_items.map((item, idx) => (
                    <div key={idx} className="p-3 border-b border-slate-100 last:border-0 flex justify-between items-center bg-white">
                      <strong className="text-slate-900">{item.name} {item.quantity ? `(x${item.quantity})` : ""}</strong>
                      <span className="font-semibold text-slate-700">{fmt(item.price)}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-slate-400 text-xs">No extra add-on items specified.</p>
                )}
              </div>
            </div>
          </div>

          {/* Financial Calculation Breakdown Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 mt-4 space-y-2.5 text-xs shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">Independent Price Calculation Breakdown</span>
              <span className="text-[10px] font-bold font-mono text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                Package &amp; Add-ons Separated
              </span>
            </div>


            <div className="space-y-2 text-slate-700 pt-1">
              <div className="flex justify-between items-center">
                <span>
                  <strong className="text-slate-900">Base Package Subtotal:</strong> {pkgRateText}
                </span>
                <strong className="text-slate-900 font-bold">{fmt(basePackageSubtotal)}</strong>
              </div>

              <div className="flex justify-between items-center">
                <span>
                  <strong className="text-slate-900">Add-ons & Equipment Subtotal:</strong> {(booking.service_items?.length || 0)} equipment items + {(booking.additional_charges?.length || 0)} extra charges
                </span>
                <strong className="text-slate-900 font-bold">{fmt(addOnsSubtotal)}</strong>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-semibold">
                  <span>
                    <strong>Discount / Special Reduction:</strong> Applied adjustment
                  </span>
                  <span>- {fmt(discountAmount)}</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-200 text-sm font-bold text-slate-950">
                <span>Grand Total</span>
                <span className="text-amber-950 text-base font-mono">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </AdminCard>

        {/* Assigned Equipment & Inventory Management */}
        <AdminCard className="!p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" /> Assigned Equipment & Inventory
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Equipment and rental items reserved for this event on {booking.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBA"}.
              </p>
            </div>
            
            <Btn size="sm" variant="primary" onClick={() => setShowEquipmentModal(true)}>
              <PackagePlus size={14} /> {booking.inventory_items && booking.inventory_items.length > 0 ? "Manage / Edit Equipment" : "Assign Equipment"}
            </Btn>
          </div>

          {booking.inventory_items && booking.inventory_items.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
              {booking.inventory_items.map((item, idx) => {
                const invName = item.name || item.inventory_id?.item_name || "Equipment Item";
                const qty = item.quantity || 0;
                
                // Check if equipment return verification exists
                const returnRecord = (booking.equipment_returns || []).find(r => 
                  String(r.inventory_id?._id || r.inventory_id) === String(item.inventory_id?._id || item.inventory_id)
                );

                return (
                  <div key={idx} className="p-3.5 rounded-md border border-slate-200 bg-slate-50/50 hover:border-slate-300 transition-all shadow-2xs flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-bold text-xs text-slate-900 leading-snug">{invName}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0 border border-amber-200/80">
                          x{qty}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Status:</span>
                      {returnRecord?.verified_at ? (
                        <span className="text-emerald-700 font-semibold flex items-center gap-1">
                          <PackageCheck size={12} /> Returned ({returnRecord.quantity_returned}/{qty})
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium">Reserved for Event</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 px-4 border border-dashed border-slate-200 rounded-md text-center space-y-3 bg-slate-50/30">
              <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">No Equipment Assigned Yet</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-0.5">
                  Assign required tables, chairs, chafing dishes, audio/visual systems, or decor items for this booking date.
                </p>
              </div>
              <Btn size="sm" variant="primary" onClick={() => setShowEquipmentModal(true)}>
                <PackagePlus size={14} /> Assign Equipment Now
              </Btn>
            </div>
          )}
        </AdminCard>

        {/* Revision Audit History Section */}
        <AdminCard className="!p-5 space-y-4">
          <BookingRevisionHistory booking={booking} sourceQuotation={sourceQuotation} />
        </AdminCard>

        {/* Modal: Equipment Assignment */}
        <AssignEquipmentModal
          booking={booking}
          open={showEquipmentModal}
          onClose={() => setShowEquipmentModal(false)}
          onSave={loadData}
        />

        {/* Modal: Revision Proposal Review */}
        <RevisionProposalModal
          open={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          booking={booking}
          onAccept={handleAcceptRevision}
          onReject={handleRejectRevision}
          isCustomer={false}
        />

        {/* Modal: Edit Details */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleUpdateDetails}>
              <DialogHeader>
                <DialogTitle>Edit / Propose Booking Revisions</DialogTitle>
                <DialogDescription>Modify booking terms or propose a revised deal to customer.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Target Event Date</label>
                  <Input 
                    type="date" 
                    value={editForm.event_date} 
                    onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Start Time</label>
                  <Input 
                    type="time" 
                    value={editForm.start_time} 
                    onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Guest Count</label>
                  <Input 
                    type="number" 
                    value={editForm.guest_count} 
                    onChange={(e) => setEditForm({ ...editForm, guest_count: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Total Price (₱)</label>
                  <Input 
                    type="number" 
                    value={editForm.total_price} 
                    onChange={(e) => setEditForm({ ...editForm, total_price: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Venue Type / Location</label>
                  <Input 
                    type="text" 
                    value={editForm.venue_type} 
                    onChange={(e) => setEditForm({ ...editForm, venue_type: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Revision Note / Reason for Proposal</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Added +20 guests and updated schedule"
                    value={revisionNote} 
                    onChange={(e) => setRevisionNote(e.target.value)} 
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="proposeToggle"
                    checked={proposeToCustomer}
                    onChange={(e) => setProposeToCustomer(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="proposeToggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Send as Revised Proposal (Requires Customer Confirmation)
                  </label>
                </div>
              </div>

              <DialogFooter>
                <Btn type="button" variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Btn>
                <Btn type="submit" variant="primary">{proposeToCustomer ? "Send Proposal" : "Apply Instantly"}</Btn>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Total Cost (₱)</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 55000"
                    value={quoteForm.total_price} 
                    onChange={(e) => setQuoteForm({ ...quoteForm, total_price: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Notes / Terms</label>
                  <textarea 
                    rows={4}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Include terms e.g. Requires 20% deposit to lock date..."
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

        {/* Modal: Schedule / Reschedule Ocular Visit */}
        <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleScheduleOcular}>
              <DialogHeader>
                <DialogTitle>
                  {booking.ocular_visit?.scheduled_date ? "Reschedule Ocular Visit" : "Schedule Ocular Visit"}
                </DialogTitle>
                <DialogDescription>
                  Set the inspection date and time for venue place measurements and site verification.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Ocular Visit Date</label>
                  <Input 
                    type="date" 
                    required
                    value={ocularDate} 
                    onChange={(e) => setOcularDate(e.target.value)} 
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Visit Time</label>
                  <Input 
                    type="time" 
                    required
                    value={ocularTime} 
                    onChange={(e) => setOcularTime(e.target.value)} 
                  />
                </div>
              </div>

              <DialogFooter>
                <Btn type="button" variant="secondary" onClick={() => setShowRescheduleModal(false)}>Cancel</Btn>
                <Btn type="submit" variant="primary">Save Schedule</Btn>
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
                  Log the venue measurement findings, layout verification, and inspection outcome.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Inspection Outcome</label>
                  <select
                    value={ocularOutcome}
                    onChange={(e) => setOcularOutcome(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-300 bg-white font-medium text-slate-900 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="proceed">Inspection Passed — Proceed with Event</option>
                    <option value="revise">Revision Needed — Requires Setup/Guest Adjustment</option>
                    <option value="reschedule">Reschedule Needed — Site Not Ready</option>
                    <option value="cancel">Cancel Booking — Venue Infeasible</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Inspection Notes &amp; Place Measurements</label>
                  <textarea 
                    rows={4}
                    className="w-full text-xs rounded-xl border border-slate-200 p-3 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    placeholder="Log venue area dimensions, scaffold sizing, power outlets, kitchen access, terrain conditions..."
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

        {/* Modal: Assign Event Coordinator / Manager */}
        <Dialog open={showAssignManagerModal} onOpenChange={setShowAssignManagerModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300">
                  <ShieldCheck size={20} className="text-amber-700" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-slate-900">Assign Event Coordinator</DialogTitle>
                  <DialogDescription className="text-xs text-slate-500">
                    Designate an active Event Manager to oversee scheduling, oculars, and catering staff.
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
                    ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 text-slate-900"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-600"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedManagerId === "" ? "bg-amber-200 text-amber-900 border border-amber-300" : "bg-slate-100 text-slate-500"
                  }`}>
                    —
                  </div>
                  <div>
                    <div className="text-xs font-bold">Unassigned (No Coordinator)</div>
                    <div className="text-[11px] text-slate-400">Leave this booking unassigned for now</div>
                  </div>
                </div>
                {selectedManagerId === "" && (
                  <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* List of Available Managers */}
              {managers.map((mgr) => {
                const isSelected = String(selectedManagerId) === String(mgr._id);
                const initials = (mgr.full_name || "M").split(" ").filter(Boolean).map(n => n[0]).join("").slice(0, 2).toUpperCase();

                return (
                  <div
                    key={mgr._id}
                    onClick={() => setSelectedManagerId(mgr._id)}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 text-slate-900 shadow-2xs"
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                        isSelected ? "bg-amber-200 text-amber-900 border border-amber-300" : "bg-slate-100 text-slate-700"
                      }`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span className="truncate">{mgr.full_name}</span>
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded shrink-0">
                            Active
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                          {mgr.email && <span className="truncate">{mgr.email}</span>}
                          {mgr.phone && <span>• {mgr.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shrink-0 ml-2">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}

              {managers.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
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
                {savingManager ? "Saving Coordinator..." : "Confirm & Save"}
              </Btn>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Printable Invoice / Official Receipt for window.print() */}
        <PrintableInvoice booking={booking} payments={payments} />

      </div>
    </AdminLayout>
  );
}
