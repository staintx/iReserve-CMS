import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import OcularDatePickerModal from "../../components/customer/OcularDatePickerModal";
import PaymentChoiceModal from "../../components/customer/PaymentChoiceModal";
import CustomerPolicyModal from "../../components/policy/CustomerPolicyModal";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import { 
  ChevronLeft, 
  Check, 
  Clock, 
  AlertCircle, 
  CalendarRange, 
  Users, 
  MessageSquare,
  Copy,
  Utensils,
  CreditCard,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Info,
  ChevronRight,
  Package,
  Store,
  History,
  FileText,
  Truck,
  Star,
  AlertTriangle,
  Layers,
  Sparkles,
  Phone,
  Mail,
  DollarSign,
  PackagePlus,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { getBookingOcularActionMeta } from "../../utils/ocularStatusHelper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../components/ui/tabs";
import CustomerPaymentsTable from "../../components/tables/CustomerPaymentsTable";
import RevisionProposalModal from "../../components/booking/RevisionProposalModal";
import { isFoodOnly, isSetupOnly, resolveServiceType } from "../../components/customer/portal/statusMeta";
import BookingHistoryTimeline from "../../components/booking/BookingHistoryTimeline";
import BookingVersionHistory from "../../components/booking/BookingVersionHistory";
import { ACTION_PAY } from "../../components/customer/portal/actionStyles";
import InvoiceModal from "../../components/common/invoice/InvoiceModal";
import useBusinessInfo from "../../hooks/useBusinessInfo";
import { extractPolicySections } from "../../components/policy/policyFormat";
import { cn } from "@/lib/utils";
import { selectSourceQuotation } from "../../utils/quotationDiff";
import { formatShortDate } from "../../utils/format";
import { menuAmountLabel, menuLineTotal, MENU_PRICING } from "../../utils/quotationPricing";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const formatCurrency = (val) => {
  return `₱${Number(val || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Parse inclusions like "[Event Setup & Furniture] Stage Setup" into categorized arrays
const parseInclusions = (inclusions = []) => {
  if (!Array.isArray(inclusions) || inclusions.length === 0) return [];
  const groups = {};
  inclusions.forEach((item) => {
    if (typeof item !== "string") return;
    const match = item.match(/^\[(.*?)\]\s*(.*)$/);
    if (match) {
      const category = match[1].trim();
      const val = match[2].trim();
      if (!groups[category]) groups[category] = [];
      groups[category].push(val);
    } else {
      const category = "General Inclusions";
      if (!groups[category]) groups[category] = [];
      groups[category].push(item.trim());
    }
  });
  return Object.entries(groups).map(([category, items]) => ({
    category,
    items,
  }));
};

// Computes the final total price of a dish line
const getItemLineTotal = (item, guestCount) => {
  if (item?.total_price != null && Number(item.total_price) >= 0) {
    return Number(item.total_price);
  }
  if (item?.line_total != null && Number(item.line_total) >= 0) {
    return Number(item.line_total);
  }
  const unitPrice = Number(item?.price) || 0;
  if (unitPrice === 0) return 0;
  if (item?.pricing_type === "quantity" || item?.pricing_type === MENU_PRICING?.QUANTITY) {
    const qty = Number(item?.quantity) > 0 ? Number(item.quantity) : 1;
    return Math.round(unitPrice * qty * 100) / 100;
  }
  if (item?.pricing_type === "per_guest" || item?.pricing_type === MENU_PRICING?.PER_GUEST) {
    const qty = Number(guestCount) > 0 ? Number(guestCount) : 1;
    return Math.round(unitPrice * qty * 100) / 100;
  }
  if (Number(item?.quantity) > 0 && (item?.unit || Number(item?.quantity) > 1)) {
    return Math.round(unitPrice * Number(item.quantity) * 100) / 100;
  }
  return menuLineTotal(item, guestCount);
};

export default function CustomerEventDashboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // Management State
  const [packages, setPackages] = useState([]);
  const [isSelectionsModalOpen, setIsSelectionsModalOpen] = useState(false);
  
  const [addingGuests, setAddingGuests] = useState(false);
  const [additionalGuests, setAdditionalGuests] = useState(0);
  const [isSubmittingGuests, setIsSubmittingGuests] = useState(false);
  
  const [upgrading, setUpgrading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [isSubmittingUpgrade, setIsSubmittingUpgrade] = useState(false);

  const [sourceQuotation, setSourceQuotation] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [payingPaymentId, setPayingPaymentId] = useState(null);
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [isOpeningChat, setIsOpeningChat] = useState(false);

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  useEffect(() => {
    const currentTab = searchParams.get("tab");
    if (currentTab && currentTab !== activeTab) {
      setActiveTab(currentTab);
    }
  }, [searchParams]);

  const [requestingChange, setRequestingChange] = useState(false);
  const [requestNote, setRequestNote] = useState("");
  const [changeFields, setChangeFields] = useState({ event_date: "", start_time: "", guest_count: "", venue_type: "" });
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  const submitChangeRequest = async (event) => {
    event.preventDefault();
    const nextMessage = requestNote.trim();
    if (!nextMessage && !changeFields.event_date && !changeFields.guest_count && !changeFields.start_time) {
      notify("Please describe or select the changes you want to propose.", "error");
      return;
    }

    try {
      setIsSubmittingRequest(true);
      const payload = {
        message: nextMessage || "Customer proposed booking revisions",
      };
      if (changeFields.event_date) payload.event_date = changeFields.event_date;
      if (changeFields.start_time) payload.start_time = changeFields.start_time;
      if (changeFields.guest_count) payload.guest_count = Number(changeFields.guest_count);
      if (changeFields.venue_type) payload.venue_type = changeFields.venue_type;

      await CustomerAPI.proposeRevision(booking._id, payload);

      notify("Your revision proposal was submitted to the admin for review!", "success");
      setRequestingChange(false);
      setRequestNote("");
      setChangeFields({ event_date: "", start_time: "", guest_count: "", venue_type: "" });
      fetchBooking();
    } catch (error) {
      notify(error.response?.data?.message || "We could not send your revision proposal.", "error");
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const [requestingOcular, setRequestingOcular] = useState(false);
  const [_ocularDate, _setOcularDate] = useState("");
  const [_ocularTime, _setOcularTime] = useState("");
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const businessInfo = useBusinessInfo();

  const cancellationPolicyText = useMemo(() => {
    const raw = businessInfo?.policies?.cancellation?.content;
    if (raw) {
      const sections = extractPolicySections(raw);
      if (sections.length > 0 && sections[0].body) {
        return sections[0].body;
      }
    }
    return "Reservation deposits are non-refundable. Cancellations and date rescheduling must be submitted in accordance with our catering terms.";
  }, [businessInfo]);

  // Rating & Review State
  const [bookingRating, setBookingRating] = useState(null);
  const [_loadingRating, setLoadingRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingHoverStars, setRatingHoverStars] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Cancellation Request State
  const [requestingCancellation, setRequestingCancellation] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(null);

  const handleAcceptRevision = async () => {
    try {
      await CustomerAPI.acceptRevision(booking._id);
      notify("Revised booking deal confirmed successfully! Your booking terms have been updated.", "success");
      fetchBooking();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to confirm revision proposal", "error");
    }
  };

  const handleRejectRevision = async (reason) => {
    try {
      await CustomerAPI.rejectRevision(booking._id, { reason });
      notify("Revision proposal declined.", "info");
      fetchBooking();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to decline revision proposal", "error");
    }
  };

  const handleCounterPropose = async (payload) => {
    try {
      await CustomerAPI.proposeRevision(booking._id, payload);
      notify("Your counter-proposal was submitted to catering management for review!", "success");
      fetchBooking();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit counter-proposal", "error");
      throw err;
    }
  };

  const location = useLocation();
  useEffect(() => {
    if (booking?.pending_revision && booking.pending_revision.status === "pending_customer_approval") {
      const isRevisionParam = searchParams.get("view") === "revision";
      const isRevisionState = location.state?.openRevisionModal || location.state?.action === "revision" || location.state?.booking_id;
      if (isRevisionParam || isRevisionState) {
        setShowProposalModal(true);
      }
    }
  }, [booking, searchParams, location.state]);

  const verifyingPaymentRef = useRef(new Set());

  useEffect(() => {
    fetchBooking();
    fetchPayments();
    fetchSourceQuotation();
    CustomerAPI.getPackages().then((res) => setPackages(res.data)).catch(() => setPackages([]));

    const paymentStatus = searchParams.get("payment");
    const paymentId = searchParams.get("payment_id");
    if (paymentStatus === "success") {
      const lockKey = paymentId || "success_status";
      if (!verifyingPaymentRef.current.has(lockKey)) {
        verifyingPaymentRef.current.add(lockKey);
        const toastId = `payment-verify-${lockKey}`;
        notify("Payment completed successfully! Updating booking status...", "success", { id: toastId });
        if (paymentId) {
          CustomerAPI.verifyPayment(paymentId)
            .then(() => {
              fetchBooking();
              fetchPayments();
            })
            .catch(() => {});
        }
      }
    } else if (paymentStatus === "cancelled") {
      if (!verifyingPaymentRef.current.has("cancelled")) {
        verifyingPaymentRef.current.add("cancelled");
        notify("Payment was cancelled. You can retry paying the balance anytime.", "info", { id: "payment-cancelled" });
      }
    }
  }, [id, searchParams]);

  useRealTimeRefresh(() => {
    fetchBooking();
    fetchPayments();
  });

  const canModifyBooking = useMemo(() => {
    if (!booking || !booking.event_date) return false;
    const rawSt = (booking.status || "").toLowerCase();
    if (["cancelled", "canceled", "rejected", "refunded", "completed", "event completed"].includes(rawSt)) return false;
    return new Date(booking.event_date).getTime() - Date.now() > THREE_DAYS_MS;
  }, [booking]);

  const bookingPayments = useMemo(() => {
    if (!booking) return [];
    return payments.filter((p) => String(p.booking_id?._id || p.booking_id) === String(booking._id));
  }, [booking, payments]);

  const totalPaid = useMemo(
    () => bookingPayments.filter((p) => p.status === "approved").reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [bookingPayments]
  );

  const guestCount = Number(booking?.guest_count) || 0;

  const activeQuotation = useMemo(() => {
    if (booking?.quotation_id && typeof booking.quotation_id === "object" && booking.quotation_id.package_name) {
      return booking.quotation_id;
    }
    return sourceQuotation?.quotation || null;
  }, [booking, sourceQuotation]);

  const resolvedPackage = useMemo(() => {
    if (!booking) return null;
    if (booking.package_id && typeof booking.package_id === "object" && booking.package_id.name) {
      return booking.package_id;
    }
    const pkgId = booking.package_id?._id || booking.package_id;
    if (pkgId && packages.length > 0) {
      const found = packages.find((p) => String(p._id) === String(pkgId));
      if (found) return found;
    }
    const pkgName = booking.package_name_snapshot || activeQuotation?.package_name;
    if (pkgName && packages.length > 0) {
      const found = packages.find((p) => (p.name || "").trim().toLowerCase() === pkgName.trim().toLowerCase());
      if (found) return found;
    }
    if (pkgName) {
      return {
        name: pkgName,
        description: "Curated catering and event setup package tailored for your event.",
        inclusions: [],
      };
    }
    return null;
  }, [booking, packages, activeQuotation]);

  const hasPackage = Boolean(
    resolvedPackage?.name || 
    booking?.package_name_snapshot || 
    booking?.package_id || 
    activeQuotation?.package_name
  );

  const isSpecialOffer = booking?.booking_type === "special" || resolvedPackage?.offer_type === "special";

  const activeInclusions = useMemo(() => {
    if (activeQuotation?.package_inclusions && activeQuotation.package_inclusions.length > 0) {
      return activeQuotation.package_inclusions;
    }
    return resolvedPackage?.inclusions || [];
  }, [activeQuotation, resolvedPackage]);

  const removedInclusions = useMemo(() => {
    return activeQuotation?.removed_inclusions || [];
  }, [activeQuotation]);

  const inclusionAdjustments = useMemo(() => {
    return activeQuotation?.inclusion_adjustments || [];
  }, [activeQuotation]);

  const packageInclusionGroups = useMemo(() => {
    return parseInclusions(activeInclusions);
  }, [activeInclusions]);

  const totalPackageInclusionsCount = activeInclusions.length;
  const totalDishesCount = (booking?.menu_items || []).length;

  const resolvedScaffoldSize = useMemo(() => {
    if (!resolvedPackage) return null;
    const options = Array.isArray(resolvedPackage.scaffold_size_options)
      ? resolvedPackage.scaffold_size_options
      : [];

    let option = null;
    const inq = sourceQuotation?.inquiry;
    if (inq?.selected_scaffold_option_id) {
      option = options.find((o) => String(o._id) === String(inq.selected_scaffold_option_id));
    }
    if (!option && (booking?.scaffold_width || inq?.scaffold_width) && (booking?.scaffold_length || inq?.scaffold_length)) {
      const w = booking?.scaffold_width || inq?.scaffold_width;
      const l = booking?.scaffold_length || inq?.scaffold_length;
      option = options.find((o) => Number(o.width_ft) === Number(w) && Number(o.length_ft) === Number(l));
    }
    if (!option && resolvedPackage.default_scaffold_option_id) {
      option = options.find((o) => String(o._id) === String(resolvedPackage.default_scaffold_option_id));
    }
    if (!option && options.length > 0) {
      option = options[0];
    }

    const width = booking?.scaffold_width || inq?.scaffold_width || option?.width_ft;
    const length = booking?.scaffold_length || inq?.scaffold_length || option?.length_ft;
    const area = booking?.scaffold_base_area || inq?.scaffold_base_area || option?.area_ft2;
    const label = option?.label ? String(option.label).trim() : null;

    if (width && length) {
      return {
        formatted: `${width}ft × ${length}ft`,
        width,
        length,
        label,
        area: area ? `${area} sq.ft.` : null,
        capacity: option?.guest_min && option?.guest_max ? `${option.guest_min}–${option.guest_max} guests` : null,
      };
    }
    return null;
  }, [resolvedPackage, booking, sourceQuotation]);

  const serviceItemsSubtotal = (booking?.service_items || []).reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );
  const additionalChargesSubtotal = (booking?.additional_charges || []).reduce(
    (sum, charge) => sum + (Number(charge.amount) || 0),
    0
  );
  const menuItemsAddonSubtotal = (booking?.menu_items || []).reduce(
    (sum, item) => sum + getItemLineTotal(item, guestCount),
    0
  );
  const addOnsSubtotal = serviceItemsSubtotal + additionalChargesSubtotal + menuItemsAddonSubtotal;

  const pkg = resolvedPackage || booking?.package_id;
  
  let basePackageSubtotal = 0;
  let pkgLabelText = "Base Package Subtotal";
  if (pkg) {
    if (pkg.package_type === "Event Setup Only") {
      basePackageSubtotal = Number(pkg.setup_price || 0);
      pkgLabelText = `${pkg.name || "Event Setup"} (Setup Fee)`;
    } else {
      const perHead = Number(pkg.price_per_guest || 0);
      basePackageSubtotal = perHead * guestCount;
      pkgLabelText = `${pkg.name || "Base Package"} (${formatCurrency(perHead)}/head × ${guestCount} guests)`;
    }
  }

  const grandTotal = Number(booking?.total_price || 0);
  const discountAmount = Number(booking?.discount_amount || 0);

  if (basePackageSubtotal === 0 && grandTotal > 0) {
    basePackageSubtotal = Math.max(0, grandTotal + discountAmount - addOnsSubtotal);
    pkgLabelText = `Base Package Subtotal (${guestCount} guests)`;
  }

  const packageStartingPrice = Number(activeQuotation?.package_starting_price) > 0
    ? Number(activeQuotation.package_starting_price)
    : (resolvedPackage?.package_type === "Event Setup Only"
        ? Number(resolvedPackage?.setup_price || 0)
        : (Number(resolvedPackage?.price_per_guest || 0) * guestCount));

  const packageFinalPrice = Number(activeQuotation?.package_price) > 0
    ? Number(activeQuotation.package_price)
    : (packageStartingPrice > 0 ? packageStartingPrice : basePackageSubtotal);

  const showPackageBreakdown =
    packageStartingPrice > 0 && (removedInclusions.length > 0 || inclusionAdjustments.length > 0);

  const displayPaid = grandTotal > 0 ? Math.min(totalPaid, grandTotal) : totalPaid;
  const outstandingAmount = Math.max(0, grandTotal - displayPaid);
  const isFullyPaid = outstandingAmount <= 0 && grandTotal > 0;

  const fetchPayments = async () => {
    setPaymentLoading(true);
    try {
      const pRes = await CustomerAPI.getPayments();
      const filtered = pRes.data.filter((p) => String(p.booking_id?._id || p.booking_id) === String(id));
      setPayments(filtered);
    } catch {
      setPayments([]);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePayRemainingBalance = () => {
    if (!booking?._id || outstandingAmount <= 0) return;
    setIsChoiceModalOpen(true);
  };

  const fetchBookingRating = async (bId) => {
    try {
      setLoadingRating(true);
      const res = await CustomerAPI.getRatingByBooking(bId);
      setBookingRating(res.data || null);
      if (res.data?.stars) setRatingStars(res.data.stars);
      if (res.data?.review) setRatingReview(res.data.review);
    } catch {
      setBookingRating(null);
    } finally {
      setLoadingRating(false);
    }
  };

  const submitCustomerRating = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!booking?._id) return;
    try {
      setIsSubmittingRating(true);
      const res = await CustomerAPI.submitRating({
        booking_id: booking._id,
        stars: ratingStars,
        review: ratingReview.trim(),
      });
      setBookingRating(res.data);
      notify("Thank you! Your event rating and review has been submitted.", "success");
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit review.", "error");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const submitCancellationRequest = async () => {
    if (!booking?._id) return;
    try {
      setIsSubmittingCancellation(true);
      await CustomerAPI.requestCancellation(booking._id, { reason: cancellationReason });
      notify("Cancellation request submitted to management for review.", "success");
      setRequestingCancellation(false);
      setCancellationReason("");
      fetchBooking();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to submit cancellation request.", "error");
    } finally {
      setIsSubmittingCancellation(false);
    }
  };

  const fetchBooking = () => {
    CustomerAPI.getBookings()
      .then((res) => {
        const found = (res.data || []).find(b => String(b._id) === String(id));
        setBooking(found || null);
        if (found) {
          fetchSourceQuotation(found);
          if (["completed", "Completed", "event completed"].includes(found.status)) {
            fetchBookingRating(found._id);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchSourceQuotation = async (currentBooking = booking) => {
    try {
      let qObj = null;
      if (currentBooking?.quotation_id && typeof currentBooking.quotation_id === "object") {
        qObj = currentBooking.quotation_id;
      } else if (typeof currentBooking?.quotation_id === "string") {
        try {
          const qRes = await CustomerAPI.getQuotationById(currentBooking.quotation_id);
          if (qRes?.data) qObj = qRes.data;
        } catch {
          // fallback
        }
      }

      let inquiryId = currentBooking?.inquiry_id?._id || currentBooking?.inquiry_id || qObj?.inquiry_id?._id || qObj?.inquiry_id;
      let sourceInquiry = typeof currentBooking?.inquiry_id === "object" ? currentBooking.inquiry_id : null;

      if (!inquiryId) {
        const inqRes = await CustomerAPI.getInquiries();
        sourceInquiry = (inqRes.data || []).find(
          (i) => String(i.converted_booking_id || "") === String(id)
        );
        inquiryId = sourceInquiry?._id;
      }

      if (inquiryId && !sourceInquiry) {
        try {
          const inqRes = await CustomerAPI.getInquiryById(inquiryId);
          sourceInquiry = inqRes.data || null;
        } catch {
          // ignore
        }
      }

      let allVersions = [];
      let picked = qObj;
      if (inquiryId) {
        try {
          const qRes = await CustomerAPI.getQuotationsForInquiry(inquiryId);
          allVersions = qRes.data || [];
          if (!picked) {
            picked = selectSourceQuotation(allVersions);
          }
        } catch {
          // ignore
        }
      }

      if (picked) {
        setSourceQuotation({ quotation: picked, inquiry: sourceInquiry, versions: allVersions });
      }
    } catch {
      // Normal for standalone bookings
    }
  };

  const copyReferenceCode = () => {
    const ref = booking?.reference || booking?._id?.substring(0, 8).toUpperCase();
    if (ref) {
      navigator.clipboard.writeText(ref);
      notify("Reference code copied to clipboard!", "success");
    }
  };

  const handleOpenChat = async () => {
    if (!booking?._id) return;
    try {
      setIsOpeningChat(true);
      const conversation = await createConversation({ booking_id: booking._id });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        notify(error.response?.data?.message || "This booking is not ready for chat yet.", "error");
        return;
      }
      notify(error.response?.data?.message || "Could not open conversation.", "error");
    } finally {
      setIsOpeningChat(false);
    }
  };

  const submitAddGuests = async (event) => {
    event.preventDefault();
    if (additionalGuests <= 0) {
      notify("Please enter a valid number of guests to add.", "error");
      return;
    }

    try {
      setIsSubmittingGuests(true);
      const response = await CustomerAPI.addGuests(booking._id, { additional_guests: additionalGuests });
      notify("Guests added successfully. Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        setAddingGuests(false);
        setAdditionalGuests(0);
        fetchBooking();
      }
    } catch (error) {
      notify(error.response?.data?.message || "We could not add guests. Please try again.", "error");
    } finally {
      setIsSubmittingGuests(false);
    }
  };

  const submitUpgrade = async (event) => {
    event.preventDefault();
    if (!selectedPackageId) {
      notify("Please select a package to upgrade to.", "error");
      return;
    }

    try {
      setIsSubmittingUpgrade(true);
      const response = await CustomerAPI.upgradeBooking(booking._id, { new_package_id: selectedPackageId });
      notify("Package upgraded! Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      }
    } catch (error) {
      notify(error.response?.data?.message || "Could not upgrade package.", "error");
    } finally {
      setIsSubmittingUpgrade(false);
    }
  };

  const submitOcularRequest = async (selectedDate, selectedTime) => {
    if (!selectedDate) {
      notify("Please select a date for the ocular visit.", "error");
      return;
    }
    
    try {
      setIsSubmittingOcular(true);
      await CustomerAPI.requestOcular(booking._id, {
        scheduled_date: selectedDate,
        scheduled_time: selectedTime
      });
      notify("Ocular visit requested successfully.", "success");
      setRequestingOcular(false);
      fetchBooking();
    } catch (error) {
      notify(error.response?.data?.message || "Failed to request ocular visit.", "error");
    } finally {
      setIsSubmittingOcular(false);
    }
  };

  const acceptQuote = async () => {
    try {
      setIsAcceptingQuote(true);
      const response = await CustomerAPI.acceptQuote(booking._id, { payment_method: booking.payment_method || "gcash" });
      notify("Quote accepted successfully! Redirecting to payment...", "success");
      
      if (response.data.checkout_url) {
        window.location.assign(response.data.checkout_url);
      } else {
        fetchBooking();
      }
    } catch (error) {
      notify(error.response?.data?.message || "Failed to accept quote.", "error");
    } finally {
      setIsAcceptingQuote(false);
    }
  };

  if (loading) {
    return (
      <CustomerDashboardLayout title="Reservation Details">
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 animate-pulse gap-3">
          <Utensils className="w-8 h-8 text-[#1E3563] animate-bounce" />
          <p className="font-medium text-sm">Loading reservation details...</p>
        </div>
      </CustomerDashboardLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerDashboardLayout title="Reservation Details">
        <div className="p-12 text-center max-w-md mx-auto bg-white rounded-xl border border-slate-200 shadow-2xs">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg mb-1 text-slate-900">Booking Not Found</h3>
          <p className="text-slate-500 text-xs mb-5">
            We couldn't locate the reservation details. It may have been deleted or moved.
          </p>
          <Button onClick={() => navigate("/customer/bookings")} className="w-full bg-[#4C81E0] hover:bg-[#3B6EC9] text-white">
            Return to My Bookings
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const serviceType = booking.service_type || "Food and Event Setup";
  const isFoodOnlyService = isFoodOnly(serviceType);
  const isSetupOnlyService = isSetupOnly(serviceType);
  const rawStatus = (booking.status || "").toLowerCase();
  const isCancelled = ["cancelled", "canceled", "rejected", "refunded"].includes(rawStatus);
  const isCompleted = ["completed", "event completed"].includes(rawStatus);

  const eventDateObj = booking.event_date ? new Date(booking.event_date) : null;
  const isEventFuture = eventDateObj ? (eventDateObj.getTime() - Date.now() > 24 * 60 * 60 * 1000) : false;

  const ocularActionMeta = getBookingOcularActionMeta(booking);
  const needsOcular = Boolean(ocularActionMeta && ocularActionMeta.state === "action_required" && !isCancelled);
  const pendingOcular = Boolean(ocularActionMeta && ocularActionMeta.state === "requested" && !isCancelled);

  // Booking lifecycle steps for compact horizontal stepper
  const steps = isFoodOnlyService ? [
    { 
      label: "Order Request Submitted", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      desc: "Initial food order received"
    },
    { 
      label: "Deposit / Payment Confirmed", 
      completed: !["pending deposit", "cancelled"].includes(booking.status) && booking.payment_status !== "pending", 
      date: booking.payment_status === "paid" || booking.payment_status === "partially paid" || booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid" ? "Completed" : "Pending",
      desc: "Order confirmed and locked with kitchen"
    },
    { 
      label: isEventFuture ? "Preparation Scheduled" : "Food Preparation", 
      completed: ["preparing", "ongoing", "ready for event", "out for delivery", "completed"].includes(rawStatus), 
      date: ["preparing", "ongoing", "ready for event", "out for delivery", "completed"].includes(rawStatus) 
        ? (rawStatus === "preparing" || rawStatus === "ongoing" ? "In Progress" : "Completed") 
        : (isEventFuture ? "Scheduled for Event Date" : "Scheduled"),
      desc: isEventFuture ? "Kitchen staff scheduled for event date" : "Kitchen staff preparing your dishes"
    },
    { 
      label: "Out for Delivery & Drop-off", 
      completed: ["out for delivery", "completed"].includes(rawStatus), 
      date: ["out for delivery", "completed"].includes(rawStatus) ? "Completed" : "Event Day",
      desc: "Dispatched to destination address"
    },
    { 
      label: "Delivered & Completed", 
      completed: ["completed", "Completed"].includes(booking.status), 
      date: ["completed", "Completed"].includes(booking.status) ? "Completed" : "Upcoming",
      desc: "Food successfully delivered & received"
    },
  ] : booking.payment_method === "cod" ? [
    { 
      label: "Order Placed", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      desc: "Order registered in system"
    },
    { 
      label: isEventFuture ? "Preparation Scheduled" : "Preparing Order", 
      completed: ["preparing", "ongoing", "completed"].includes(booking.status), 
      date: ["preparing", "ongoing", "completed"].includes(booking.status) ? "In Progress" : (isEventFuture ? "Scheduled for Event Date" : "Pending"),
      desc: isEventFuture ? "Kitchen staff scheduled for event date" : "Kitchen staff preparing your menu"
    },
    { 
      label: "Out for Delivery & COD", 
      completed: booking.status === "completed", 
      date: booking.status === "completed" ? "Completed" : "Upon Delivery",
      desc: "Delivered to venue with Cash on Delivery"
    },
  ] : [
    { 
      label: "Reservation Submitted", 
      completed: true, 
      date: new Date(booking.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      desc: "Initial inquiry and booking received"
    },
    { 
      label: "Deposit Paid", 
      completed: !["pending deposit", "cancelled"].includes(booking.status) && booking.payment_status !== "pending", 
      date: booking.payment_status === "paid" || booking.payment_status === "partially paid" || booking.payment_status === "deposit_paid" || booking.payment_status === "fully_paid" ? "Completed" : "Pending",
      desc: "Initial deposit to secure your event date"
    },
    { 
      label: isSetupOnlyService ? "Venue Setup Inspection" : "Venue Ocular Visit", 
      completed: booking.ocular_visit?.status === "completed", 
      date: booking.ocular_visit?.scheduled_date ? new Date(booking.ocular_visit.scheduled_date).toLocaleDateString() : "Optional / Pending",
      desc: "Inspection of venue layout & logistics"
    },
    { 
      label: "Event Delivered", 
      completed: ["completed", "Completed"].includes(booking.status), 
      date: ["completed", "Completed"].includes(booking.status) ? "Completed" : "Upcoming",
      desc: "Event successfully served"
    },
    { 
      label: "Final Balance Settlement", 
      completed: booking.payment_status === "fully_paid" || isFullyPaid, 
      date: isFullyPaid ? "Completed" : "Due on event date",
      desc: "Remaining balance settled online or on-site"
    },
  ];

  const assignedStaff = booking.staff_assignments || [];
  const eventManager = booking.event_manager_id;

  // Next Action & Guidance Evaluator
  const getActionGuideMeta = () => {
    if (isCancelled) {
      return {
        tone: "rose",
        badge: "Reservation Cancelled",
        badgeClass: "bg-rose-50/80 text-rose-800 border-rose-200/80 font-semibold",
        title: "This reservation has been cancelled",
        description: booking.cancellation_reason || booking.cancellation_request?.reason || "This booking was cancelled and is no longer active. All scheduled actions, ocular visits, and pending payments are closed.",
        assignedParty: "Caezelle Catering Records",
        timeline: null,
        action: null,
      };
    }

    if (booking.pending_revision && booking.pending_revision.status === "pending_customer_approval") {
      return {
        tone: "amber",
        badge: "Action Required",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
        title: "Revised Booking Proposal Awaiting Your Confirmation",
        description: booking.pending_revision.message || "Please review the updated booking terms, inclusions, and pricing adjustments.",
        assignedParty: "Awaiting Your Decision",
        timeline: null,
        action: (
          <Button
            onClick={() => setShowProposalModal(true)}
            className="bg-[#4C81E0] hover:bg-[#3B6EC9] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <Sparkles className="w-4 h-4" />
            <span>Review Proposal</span>
          </Button>
        ),
      };
    }

    if (["deposit pending", "pending deposit"].includes(rawStatus) || (booking.payment_status === "pending" && !isFullyPaid)) {
      return {
        tone: "amber",
        badge: "Action Required: Deposit",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
        title: "Pay Reservation Deposit to Secure Your Event Date",
        description: `Your reservation request is registered. Complete the required deposit to lock in our kitchen staff and calendar on ${booking.event_date ? formatShortDate(booking.event_date) : "your event date"}.`,
        assignedParty: "Customer Payment Checkout",
        timeline: null,
        action: (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handlePayRemainingBalance}
              disabled={payingPaymentId !== null}
              className="bg-[#4C81E0] hover:bg-[#3B6EC9] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay Deposit Now</span>
            </Button>
            {needsOcular && (
              <Button
                variant="outline"
                onClick={() => setRequestingOcular(true)}
                className="border-amber-300 bg-white hover:bg-amber-50 text-amber-900 font-semibold text-xs h-9 px-3.5 rounded-lg shadow-2xs gap-1.5 cursor-pointer"
              >
                <CalendarRange className="w-4 h-4 text-amber-700" />
                <span>Schedule Ocular</span>
              </Button>
            )}
          </div>
        ),
      };
    }

    if (needsOcular) {
      return {
        tone: "amber",
        badge: "Action Required: Ocular",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-300 font-bold",
        title: "Schedule Your Venue Ocular Inspection",
        description: "Choose a convenient date and time for our coordinator to inspect your venue layout, electrical access, and table arrangements.",
        assignedParty: "Customer Scheduling",
        timeline: null,
        action: (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setRequestingOcular(true)}
              className="bg-[#4C81E0] hover:bg-[#3B6EC9] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
            >
              <CalendarRange className="w-4 h-4" />
              <span>Schedule Ocular</span>
            </Button>
            {!booking.ocular_visit?.is_required && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm("Are you sure you want to proceed without an ocular visit?")) {
                    CustomerAPI.skipOcular(booking._id)
                      .then(() => {
                        notify("Ocular visit skipped successfully.", "success");
                        fetchBooking();
                      })
                      .catch((err) => notify(err.response?.data?.message || "Failed to skip ocular visit.", "error"));
                  }
                }}
                className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs h-9 px-3 rounded-lg cursor-pointer"
              >
                Skip
              </Button>
            )}
          </div>
        ),
      };
    }

    if (pendingOcular) {
      return {
        tone: "blue",
        badge: "Ocular Requested",
        badgeClass: "bg-blue-50 text-[#4C81E0] border-blue-200 font-semibold",
        title: "Ocular Visit Requested — Awaiting Confirmation",
        description: `You requested a venue visit on ${booking.ocular_visit?.scheduled_date ? formatShortDate(booking.ocular_visit.scheduled_date) : "the selected date"}. Our coordinator is confirming logistics.`,
        assignedParty: "Caezelle Catering Coordinator",
        timeline: null,
        action: (
          <Button
            variant="outline"
            onClick={() => setRequestingOcular(true)}
            className="border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs gap-1.5"
          >
            <CalendarRange className="w-4 h-4 text-[#4C81E0]" />
            <span>Reschedule Request</span>
          </Button>
        ),
      };
    }

    if (ocularActionMeta?.state === "scheduled") {
      return {
        tone: "blue",
        badge: "Ocular Confirmed",
        badgeClass: "bg-blue-50 text-[#4C81E0] border-blue-200 font-semibold",
        title: `Site Ocular Visit Confirmed for ${booking.ocular_visit?.scheduled_date ? formatShortDate(booking.ocular_visit.scheduled_date) : "agreed date"}`,
        description: `Our venue team will meet you at the site${booking.ocular_visit?.scheduled_time ? ` at ${booking.ocular_visit.scheduled_time}` : ""}. We will verify table layout, kitchen staging, and power access.`,
        assignedParty: eventManager?.full_name ? `${eventManager.full_name} (Event Lead)` : "Assigned Venue Lead",
        timeline: null,
        action: null,
      };
    }

    const isCancelReqPending =
      booking.cancellation_request?.status === "pending" ||
      (booking.change_request?.status === "pending" &&
        booking.change_request?.message?.toLowerCase().includes("cancel"));

    if (isCancelReqPending) {
      const reasonText =
        booking.cancellation_request?.reason ||
        booking.cancellation_reason ||
        booking.change_request?.message ||
        "Cancellation requested";
      return {
        tone: "rose",
        badge: "Cancellation Under Review",
        badgeClass: "bg-rose-50 text-rose-900 border-rose-200 font-semibold",
        title: "Booking Cancellation Request Under Review",
        description: `We received your cancellation request: "${reasonText}". Our management team is reviewing your booking and calculating eligible refunds per terms.`,
        assignedParty: "Caezelle Catering Management",
        timeline: null,
        action: null,
      };
    }

    if (booking.change_request && booking.change_request.status === "pending") {
      const changeMsg = (booking.change_request.message || "").trim();
      const cleanMsg = changeMsg && changeMsg !== "..." ? changeMsg : "Schedule, guest count, or venue adjustment requested";
      return {
        tone: "indigo",
        badge: "Change Under Review",
        badgeClass: "bg-blue-50 text-[#4C81E0] border-blue-200 font-semibold",
        title: "Your Proposed Booking Changes are Under Review",
        description: `We received your revision request: "${cleanMsg}". Our catering coordinator is checking calendar availability and pricing adjustments.`,
        assignedParty: "Caezelle Catering Admin",
        timeline: null,
        action: null,
      };
    }

    if (outstandingAmount > 0 && !isCancelled) {
      return {
        tone: "amber",
        badge: "Balance Due",
        badgeClass: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
        title: `Booking Confirmed! Remaining Balance: ${formatCurrency(outstandingAmount)}`,
        description: isFoodOnlyService
          ? `Your event date is securely reserved. Settle the final balance prior to food delivery on ${booking.event_date ? formatShortDate(booking.event_date) : "the event date"}.`
          : `Your event date is securely reserved. Settle the final balance before event execution on ${booking.event_date ? formatShortDate(booking.event_date) : "the event date"}.`,
        assignedParty: "Customer Payment Checkout",
        timeline: "Due before event date",
        action: (
          <Button
            onClick={handlePayRemainingBalance}
            disabled={payingPaymentId !== null}
            className="bg-[#4C81E0] hover:bg-[#3B6EC9] text-white font-bold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-[0.98]"
          >
            <CreditCard className="w-4 h-4" />
            <span>{payingPaymentId ? "Opening Checkout…" : `Pay Balance (${formatCurrency(outstandingAmount)})`}</span>
          </Button>
        ),
      };
    }

    if (isFullyPaid && ["confirmed", "converted to booking", "preparing", "ready for event"].includes(rawStatus)) {
      return {
        tone: "emerald",
        badge: "Confirmed & Reserved",
        badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold",
        title: "You're All Set! Everything is Paid & Confirmed",
        description: isFoodOnlyService
          ? `Your order is fully paid and locked with our kitchen. Dishes are scheduled for cooking and dispatch to your address on ${booking.event_date ? formatShortDate(booking.event_date) : "the event date"}.`
          : `Your event is fully settled and locked on our schedule. Our team is staging equipment and menu ingredients for ${booking.event_date ? formatShortDate(booking.event_date) : "your event"}.`,
        assignedParty: eventManager?.full_name ? `${eventManager.full_name} (${isFoodOnlyService ? "Dispatch Lead" : "Event Manager"})` : "Caezelle Catering Team",
        timeline: null,
        action: null,
      };
    }

    if (["completed", "event completed"].includes(rawStatus)) {
      if (outstandingAmount > 0) {
        return {
          tone: "action",
          badge: "Balance Due Today",
          badgeClass: "bg-amber-50 text-amber-900 border-amber-300 font-semibold",
          title: `Event Concluded · Remaining Balance: ${formatCurrency(outstandingAmount)}`,
          description: "Your event has concluded. Please settle your remaining balance online or with your Event Manager.",
          assignedParty: "Client Payment",
          timeline: "Due Today",
          action: (
            <Button
              size="sm"
              onClick={handlePayRemainingBalance}
              className="bg-[#4C81E0] hover:bg-[#3B6EC9] text-white font-bold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs gap-1.5"
            >
              <CreditCard className="w-4 h-4" />
              <span>Settle Balance ({formatCurrency(outstandingAmount)})</span>
            </Button>
          ),
        };
      }
      return {
        tone: "neutral",
        badge: "Event Completed",
        badgeClass: "bg-slate-100 text-slate-800 border-slate-200 font-semibold",
        title: "Event Successfully Concluded",
        description: "Thank you for celebrating your special occasion with Caezelle's Catering! Please take a moment to rate and review your experience below.",
        assignedParty: "Caezelle's Catering Team",
        timeline: null,
        action: null,
      };
    }

    return null;
  };

  const guideMeta = getActionGuideMeta();

  // Status badge config
  let statusBadge = {
    label: booking.status,
    variant: "bg-slate-100 text-slate-700 border-slate-200 font-semibold"
  };
  if (["confirmed", "converted to booking"].includes(rawStatus)) {
    statusBadge = { label: "Confirmed & Reserved", variant: "bg-emerald-50/80 text-emerald-800 border-emerald-200/80 font-semibold" };
  } else if (["deposit pending", "pending deposit"].includes(rawStatus)) {
    statusBadge = { label: "Deposit Needed", variant: "bg-amber-50/80 text-amber-800 border-amber-200/80 font-semibold" };
  } else if (rawStatus === "ocular scheduled") {
    statusBadge = { label: "Ocular Scheduled", variant: "bg-blue-50/80 text-[#4C81E0] border-blue-200/80 font-semibold" };
  } else if (["completed", "event completed"].includes(rawStatus)) {
    statusBadge = { label: "Event Completed", variant: "bg-slate-100 text-slate-800 border-slate-200/80 font-semibold" };
  } else if (["cancelled", "canceled", "rejected"].includes(rawStatus)) {
    statusBadge = { label: "Cancelled", variant: "bg-rose-50/80 text-rose-800 border-rose-200/80 font-semibold" };
  } else if (rawStatus === "refunded") {
    statusBadge = { label: "Refunded", variant: "bg-rose-50/80 text-rose-800 border-rose-200/80 font-semibold" };
  }

  const refCode = booking.reference || booking._id.substring(0, 8).toUpperCase();

  // Primary Action in Header (Strictly Single State-Driven Action)
  let headerPrimaryAction = null;
  if (isCancelled) {
    headerPrimaryAction = null;
  } else if (booking.pending_revision && booking.pending_revision.status === "pending_customer_approval") {
    headerPrimaryAction = (
      <Button
        onClick={() => setShowProposalModal(true)}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-95 transition-all"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Review Proposal</span>
      </Button>
    );
  } else if (booking.status === "quote_sent") {
    headerPrimaryAction = (
      <Button 
        onClick={acceptQuote} 
        disabled={isAcceptingQuote}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-95 transition-all"
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{isAcceptingQuote ? "Processing..." : "Accept Quote & Pay Deposit"}</span>
      </Button>
    );
  } else if (["deposit pending", "pending deposit"].includes(rawStatus) || (booking.payment_status === "pending" && !isFullyPaid)) {
    headerPrimaryAction = (
      <Button
        onClick={handlePayRemainingBalance}
        disabled={payingPaymentId !== null}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-95 transition-all"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Pay Deposit Now</span>
      </Button>
    );
  } else if (needsOcular && canModifyBooking) {
    headerPrimaryAction = (
      <Button
        onClick={() => setRequestingOcular(true)}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-95 transition-all"
      >
        <CalendarRange className="w-3.5 h-3.5" />
        <span>Schedule Ocular</span>
      </Button>
    );
  } else if (outstandingAmount > 0) {
    headerPrimaryAction = (
      <Button
        onClick={handlePayRemainingBalance}
        disabled={payingPaymentId !== null}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg shadow-2xs gap-1.5 cursor-pointer active:scale-95 transition-all"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>
          {payingPaymentId 
            ? "Opening Checkout…" 
            : isCompleted 
            ? `Settle Balance (${formatCurrency(outstandingAmount)})` 
            : `Pay Balance (${formatCurrency(outstandingAmount)})`}
        </span>
      </Button>
    );
  }

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 font-sans antialiased text-slate-900">
          {/* Navigation Top Bar */}
          <div>
            <button
              type="button"
              onClick={() => navigate("/customer/bookings")}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#4C81E0] focus-visible:text-[#4C81E0] focus-visible:outline-none transition-colors cursor-pointer w-fit p-0 m-0 bg-transparent border-0"
            >
              <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-[#4C81E0] group-hover:-translate-x-0.5 transition-all" />
              <span>Back to My Bookings</span>
            </button>
          </div>

          {/* Cancellation or Payment Alert Banners */}
          {isCancelled && (
            <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-3.5 flex items-start gap-2.5 shadow-2xs text-xs">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-rose-950">Reservation Cancelled</h4>
                <p className="text-rose-800 mt-0.5 leading-relaxed">
                  {booking.cancellation_reason || booking.cancellation_request?.reason 
                    ? `This booking was cancelled: "${booking.cancellation_reason || booking.cancellation_request?.reason}". All active actions, payments, and visits are closed.`
                    : "This booking was cancelled and is no longer active. All scheduled actions, ocular visits, and pending payments have been closed."}
                </p>
              </div>
            </div>
          )}
          {searchParams.get("payment") === "cancelled" && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <h4 className="font-semibold text-amber-950">Payment Cancelled</h4>
                <p className="text-amber-800 mt-0.5">
                  Your checkout session was cancelled. No charges were made, and you can retry paying the balance anytime.
                </p>
              </div>
            </div>
          )}

          {booking.cancellation_request?.status === "rejected" && !["cancelled", "completed"].includes(rawStatus) && (
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3.5 flex items-start justify-between gap-3 shadow-2xs text-xs">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-950">Cancellation Request Declined</h4>
                  <p className="text-amber-800 mt-0.5">
                    Your cancellation request was reviewed and declined: {booking.cancellation_request.admin_notes || "Please contact our team for details."}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                className="shrink-0 border-amber-300 text-amber-950 hover:bg-amber-100 font-semibold text-xs h-8"
              >
                <MessageSquare className="w-3.5 h-3.5 mr-1 text-amber-700" />
                Message Team
              </Button>
            </div>
          )}

          {/* HEADER: CARDLESS ON WHITE CANVAS WITH SUBTLE BOTTOM DIVIDER */}
          <div className="pb-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  {booking.event_type || "Catering Event"}
                </h1>
                <span className={cn("px-2.5 py-0.5 rounded text-xs border inline-flex items-center gap-1.5 select-none", statusBadge.variant)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {statusBadge.label}
                </span>
                {booking.is_revised && (
                  <span className="border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 rounded px-2 py-0.5">
                    Revised · v{booking.revision_count || 1}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-600 font-medium">
                <span className="flex items-center gap-1.5 font-bold text-slate-900">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date TBD"}
                  {booking.start_time && <span className="font-normal text-slate-500">· {booking.start_time}</span>}
                </span>

                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{booking.guest_count || 0} guests</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 text-slate-400" />
                  <span>{resolveServiceType(booking)}</span>
                </span>

                <button
                  type="button"
                  onClick={copyReferenceCode}
                  title="Copy reference code"
                  className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono font-medium text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors cursor-pointer"
                >
                  <span>#{refCode}</span>
                  <Copy className="h-3 w-3 text-slate-400" />
                </button>
              </div>
            </div>

            {/* HEADER ACTIONS: SINGLE PRIMARY + COORDINATOR + VIEW INVOICE */}
            <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
              {headerPrimaryAction}

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                disabled={isOpeningChat}
                className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] font-semibold text-xs h-9 px-3.5 rounded-lg cursor-pointer transition-all gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>{isOpeningChat ? "Opening…" : "Message Coordinator"}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInvoiceModal(true)}
                className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] font-semibold text-xs h-9 px-3.5 rounded-lg cursor-pointer transition-all gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>View Invoice</span>
              </Button>
            </div>
          </div>

          {/* PRIMARY FOUR-TAB NAVIGATION (INTEGRATED ONTO WHITE SURFACE) */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
            <TabsList className="bg-slate-100 border border-slate-200/80 p-0.5 rounded-lg w-full sm:w-auto flex sm:inline-flex h-9 gap-0.5 overflow-x-auto justify-start">
              <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#4C81E0] data-[state=active]:shadow-2xs transition-all">
                <Utensils className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Reservation Overview
              </TabsTrigger>
              <TabsTrigger value="financials" className="shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#4C81E0] data-[state=active]:shadow-2xs transition-all">
                <CreditCard className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Payments &amp; Billings
              </TabsTrigger>
              <TabsTrigger value="timeline" className="shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#4C81E0] data-[state=active]:shadow-2xs transition-all">
                <Clock className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Status &amp; Timeline
              </TabsTrigger>
              <TabsTrigger value="revisions" className="shrink-0 whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-[#4C81E0] data-[state=active]:shadow-2xs transition-all">
                <Layers className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
                Revisions &amp; History
              </TabsTrigger>
            </TabsList>

          {/* TAB 1: RESERVATION OVERVIEW (FOCUSED OPERATIONAL DASHBOARD) */}
          <TabsContent value="overview" className="space-y-6">
            {/* COMPACT BOOKING STATUS STEPPER */}
            <div className="rounded-xl border border-blue-100/70 bg-blue-50/30 p-4 sm:p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                  <Clock className="w-3.5 h-3.5 text-[#4C81E0]" />
                  <span>Booking Progress</span>
                </div>
                {booking.event_date && (
                  <span className="text-xs text-slate-500 font-medium">
                    Event Date: {formatShortDate(booking.event_date)}
                  </span>
                )}
              </div>

              {/* Compact horizontal stepper */}
              <div className="relative pt-2 pb-1 px-2 sm:px-4">
                {/* Connecting track line behind step circles */}
                <div className="absolute top-[21px] left-6 right-6 sm:left-10 sm:right-10 h-0.5 bg-slate-200 z-0" />
                <div className={cn(
                  "grid gap-2 relative z-10",
                  steps.length === 5 ? "grid-cols-5" : steps.length === 3 ? "grid-cols-3" : "grid-cols-4"
                )}>
                  {steps.map((step, idx) => {
                    const isDone = step.completed;
                    const activeIndex = isCancelled ? -1 : steps.findIndex((s) => !s.completed);
                    const isCurrent = activeIndex === -1 ? (!isCancelled && idx === steps.length - 1) : idx === activeIndex;

                    return (
                      <div key={idx} className="flex flex-col items-center text-center">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10",
                            isDone
                              ? "bg-[#4C81E0] text-white shadow-2xs"
                              : isCurrent
                              ? "bg-[#4C81E0] text-white ring-4 ring-blue-100 shadow-2xs"
                              : isCancelled
                              ? "bg-slate-50 text-slate-300 border border-slate-200"
                              : "bg-white text-slate-400 border-2 border-slate-300"
                          )}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : idx + 1}
                        </div>

                        <span
                          className={cn(
                            "text-xs mt-2 font-medium leading-tight",
                            isCurrent
                              ? "font-bold text-[#4C81E0]"
                              : isDone
                              ? "text-slate-800 font-semibold"
                              : "text-slate-400"
                          )}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Calm stage explanation */}
              {guideMeta && (
                <div className="pt-2.5 border-t border-blue-100/60 flex items-start gap-2.5 text-xs text-slate-600">
                  {guideMeta.tone === "rose" ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-[#4C81E0] shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="font-semibold text-slate-900">{guideMeta.title}: </span>
                    <span>{guideMeta.description}</span>
                  </div>
                </div>
              )}
            </div>

            {/* TWO-COLUMN OPERATIONAL DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              {/* LEFT COLUMN: EVENT DETAILS & SELECTIONS (col-span-2) - Cardless on white canvas */}
              <div className="lg:col-span-2 space-y-8">
                {/* SECTION 1: EVENT SPECIFICATIONS */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#4C81E0]">
                        Event Specifications
                      </span>
                      <h2 className="text-base font-bold text-slate-900">Event &amp; Venue Details</h2>
                    </div>
                    {canModifyBooking && (
                      <button
                        type="button"
                        onClick={() => setRequestingChange(true)}
                        className="text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer"
                      >
                        Request Schedule Change
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Package Name</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {resolvedPackage?.name || booking.package_id?.name || "Custom Catering Build"}
                      </div>
                      {resolvedPackage?.description && (
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                          {resolvedPackage.description}
                        </p>
                      )}
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Event Type &amp; Theme</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {booking.event_type} {booking.event_theme ? `• ${booking.event_theme}` : ""}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Date &amp; Schedule</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date TBD"}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Start Time: {booking.start_time || "Not specified"}</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Expected Attendance</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-2">
                        <span>{booking.guest_count || 0} guests</span>
                        {canModifyBooking && (
                          <button 
                            type="button"
                            onClick={() => setAddingGuests(true)}
                            className="text-xs text-[#4C81E0] hover:underline font-semibold cursor-pointer"
                          >
                            + Add guests
                          </button>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Venue &amp; Service Setup</span>
                      <div className="font-bold text-slate-900 text-sm mt-0.5">
                        {booking.venue_type || "Standard Venue"}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Service: {resolveServiceType(booking)}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Destination Address</span>
                      {booking.delivery_method === "pickup" ? (
                        <div className="font-bold text-slate-900 text-sm mt-0.5">
                          Customer Store Pickup: {booking.pickup_location || "Store Premises"}
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <div className="font-bold text-slate-900 text-xs">
                            {[booking.barangay, booking.municipality].filter(Boolean).join(", ")}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {[booking.street, booking.province].filter(Boolean).join(", ")} {booking.zip_code ? `(${booking.zip_code})` : ""}
                          </div>
                          {booking.landmark && (
                            <div className="text-slate-500 text-[11px] mt-0.5">
                              Landmark: <span className="font-medium text-slate-700">{booking.landmark}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Theme & Palette swatches if provided */}
                  {Array.isArray(booking.event_palette) && booking.event_palette.length > 0 && (
                    <div className="pt-4 border-t border-slate-100 space-y-1.5 text-xs">
                      <span className="text-slate-500 font-medium block">Styling Palette</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {booking.event_palette.map((color, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
                          >
                            <span>{color}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* SECTION 2: PACKAGE & SELECTIONS (CARDLESS ON WHITE CANVAS) */}
                <div className="pt-8 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#4C81E0]">
                        Menu &amp; Selections
                      </span>
                      <h2 className="text-base font-bold text-slate-900">Package &amp; Selections</h2>
                    </div>
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                      {isSpecialOffer ? "Special Offer Combo" : (resolvedPackage?.package_type || "Catering Package")}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="font-bold text-base text-slate-900">
                        {resolvedPackage?.name || booking?.package_name_snapshot || activeQuotation?.package_name || "Custom Catering Selections"}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                        {resolvedPackage?.description || "Curated catering selections and event setup tailored for your booking."}
                      </p>
                    </div>

                    {/* Summary Counts Strip */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {totalDishesCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                          <Utensils className="w-3.5 h-3.5 text-[#4C81E0]" />
                          <span>{totalDishesCount} dishes included</span>
                        </span>
                      )}

                      {totalPackageInclusionsCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{totalPackageInclusionsCount} setup inclusions</span>
                        </span>
                      )}

                      {booking.service_items?.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                          <PackagePlus className="w-3.5 h-3.5 text-[#4C81E0]" />
                          <span>{booking.service_items.length} add-on items</span>
                        </span>
                      )}

                      {resolvedScaffoldSize && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                          <Store className="w-3.5 h-3.5 text-slate-600" />
                          <span>{resolvedScaffoldSize.formatted}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dietary / Special Instructions Alert */}
                  {(booking.special_requests || booking.dietary_restrictions || booking.allergies) && (
                    <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        {booking.allergies && (
                          <div><strong>Declared Allergies:</strong> {booking.allergies}</div>
                        )}
                        {booking.dietary_restrictions && (
                          <div><strong>Dietary Restrictions:</strong> {booking.dietary_restrictions}</div>
                        )}
                        {booking.special_requests && (
                          <div><strong>Special Notes:</strong> {booking.special_requests}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progressive Disclosure Trigger Button */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs text-slate-500">
                      Review complete dishes, equipment inclusions, and setup dimensions.
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsSelectionsModalOpen(true)}
                      className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] font-semibold text-xs h-8 px-3.5 rounded-lg gap-1.5 cursor-pointer transition-all"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      <span>View Selections &amp; Details</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: PAYMENT SUMMARY & CATERING TEAM (col-span-1) */}
              <div className="space-y-6">
                {/* 1. PAYMENT & BALANCE SUMMARY CARD */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-[#4C81E0]" /> Payment &amp; Balance
                    </h3>
                    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded", isCancelled ? "bg-rose-50 text-rose-800" : isFullyPaid ? "bg-emerald-50 text-emerald-800" : "bg-blue-50 text-[#4C81E0]")}>
                      {isCancelled ? "Cancelled" : isFullyPaid ? "Paid in full" : "Balance Pending"}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-slate-500">Total cost</span>
                      <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(grandTotal)}</span>
                    </div>

                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-slate-500">Amount paid</span>
                      <span className="font-semibold tabular-nums text-emerald-700">
                        {displayPaid > 0 ? `− ${formatCurrency(displayPaid)}` : formatCurrency(0)}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between gap-3">
                      <span className="font-bold text-slate-900">
                        {isFullyPaid ? "Paid in full" : isCancelled ? "Balance status" : "Remaining balance"}
                      </span>
                      <span className={`text-xl font-bold tabular-nums ${isFullyPaid ? "text-emerald-700" : isCancelled ? "text-slate-500" : "text-[#4C81E0]"}`}>
                        {isCancelled ? "Closed" : formatCurrency(isFullyPaid ? grandTotal : outstandingAmount)}
                      </span>
                    </div>

                    {outstandingAmount > 0 && !isCancelled && (
                      <Button
                        onClick={handlePayRemainingBalance}
                        disabled={payingPaymentId !== null}
                        className="w-full bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 rounded-lg cursor-pointer shadow-2xs gap-1.5 transition-all mt-1 active:scale-95"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        {payingPaymentId ? "Opening Checkout…" : `Pay Balance (${formatCurrency(outstandingAmount)})`}
                      </Button>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setActiveTab("financials")}
                        className="text-[#4C81E0] hover:underline font-semibold cursor-pointer"
                      >
                        View billing breakdown →
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. CATERING TEAM & SUPPORT (CONSOLIDATED) */}
                <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#4C81E0]" />
                      {isFoodOnlyService ? "Kitchen & Dispatch Team" : "Assigned Catering Team"}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    {eventManager || assignedStaff.length > 0 ? (
                      <div className="space-y-2">
                        {eventManager && (
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-0.5">
                            <div className="font-semibold text-slate-900">{eventManager.full_name || "Operations Lead"}</div>
                            <div className="text-[11px] text-slate-500">{isFoodOnlyService ? "Dispatch Lead" : "Event Manager"}</div>
                            {eventManager.phone && (
                              <div className="text-[11px] text-slate-600 flex items-center gap-1 pt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{eventManager.phone}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {assignedStaff.slice(0, 2).map((staff, idx) => (
                          <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                            <div className="font-medium text-slate-800">{staff.name || staff.full_name}</div>
                            <div className="text-[11px] text-slate-500">{staff.role || "Catering Staff"}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs leading-relaxed">
                        {isFoodOnlyService
                          ? "Kitchen staff will prepare and dispatch your food on the event date."
                          : "Your Event Manager and team lead are assigned to oversee your event."}
                      </p>
                    )}

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleOpenChat}
                        disabled={isOpeningChat}
                        className="text-xs font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{isOpeningChat ? "Opening…" : "Message your coordinator"}</span>
                      </button>
                    </div>

                    {/* Customer contact on file */}
                    <div className="pt-3 border-t border-slate-100 space-y-1 text-xs">
                      <span className="text-slate-500 font-medium block">Customer Contact on File</span>
                      <div className="font-semibold text-slate-900">{booking.contact_first_name} {booking.contact_last_name}</div>
                      {booking.contact_phone && (
                        <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{booking.contact_phone}</span>
                        </div>
                      )}
                      {booking.contact_email && (
                        <div className="text-slate-600 flex items-center gap-1 text-[11px] truncate">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate">{booking.contact_email}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DISCREET CANCELLATION REQUEST BUTTON */}
                {!['inquiry', 'quote_sent', 'customer_accepted', 'completed', 'cancelled', 'refunded'].includes(booking.status) && (
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => setRequestingCancellation(true)}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer transition-colors p-1"
                    >
                      Request Cancellation
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Rating & Review Section for Completed Events */}
            {["completed", "Completed", "event completed"].includes(rawStatus) && (
              <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/60 to-orange-50/40 rounded-xl shadow-2xs">
                <CardHeader className="py-3.5 px-4 sm:px-5 border-b border-amber-200/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold text-amber-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      {bookingRating ? "Your Event Rating & Review" : "Rate & Review Your Event Experience"}
                    </CardTitle>
                    {bookingRating && (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] font-semibold">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> Submitted
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs text-amber-900/80">
                    {bookingRating 
                      ? "Thank you for sharing your feedback with our catering team!" 
                      : "We hope your event was a success! Please rate the food, styling, and staff service."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <form onSubmit={submitCustomerRating} className="space-y-3.5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">Overall Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const filled = (ratingHoverStars || ratingStars) >= star;
                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingStars(star)}
                              onMouseEnter={() => setRatingHoverStars(star)}
                              onMouseLeave={() => setRatingHoverStars(0)}
                              className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer focus:outline-none"
                              aria-label={`${star} star`}
                            >
                              <Star
                                className={`w-5 h-5 sm:w-6 sm:h-6 ${filled ? "fill-amber-400 text-amber-500" : "text-slate-300"}`}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-xs font-bold text-amber-900 ml-1">
                        {ratingStars} of 5 Stars
                      </span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700 block" htmlFor="customer-rating-feedback">
                        Your Review &amp; Comments
                      </label>
                      <textarea
                        id="customer-rating-feedback"
                        rows={3}
                        value={ratingReview}
                        onChange={(e) => setRatingReview(e.target.value)}
                        placeholder="Share your thoughts on the food quality, taste, event setup, coordination, and team service..."
                        className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button
                        type="submit"
                        disabled={isSubmittingRating}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 px-4 rounded-md shadow-2xs gap-1.5 cursor-pointer"
                      >
                        {isSubmittingRating ? "Submitting..." : bookingRating ? "Update Review" : "Submit Rating & Review"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* TAB 2: PAYMENTS & BILLINGS (DEEP FINANCIAL RECORD) */}
          <TabsContent value="financials" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Itemized Price Breakdown (1 col) */}
              <Card className="border-slate-200/80 shadow-xs rounded-xl lg:col-span-1 bg-white">
                <CardHeader className="border-b border-slate-100 py-3.5 px-4 sm:px-5">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#4C81E0]" />
                    Itemized Billing Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">{pkgLabelText}</span>
                    <span className="shrink-0 font-sans font-semibold tabular-nums text-slate-900">{formatCurrency(basePackageSubtotal)}</span>
                  </div>

                  {booking.service_items && booking.service_items.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-600">Add-on services ({booking.service_items.length})</span>
                      <span className="shrink-0 font-sans font-semibold tabular-nums text-slate-900">
                        {formatCurrency(serviceItemsSubtotal)}
                      </span>
                    </div>
                  )}

                  {booking.additional_charges && booking.additional_charges.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-600">Additional fees</span>
                      <span className="shrink-0 font-sans font-semibold tabular-nums text-slate-900">
                        {formatCurrency(additionalChargesSubtotal)}
                      </span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-slate-600">Discount</span>
                      <span className="shrink-0 font-sans font-semibold tabular-nums text-emerald-700">− {formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">Total cost</span>
                    <span className="shrink-0 font-sans text-base font-bold tabular-nums text-slate-900">{formatCurrency(grandTotal)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">Amount paid</span>
                    <span className="shrink-0 font-sans font-semibold tabular-nums text-emerald-700">− {formatCurrency(displayPaid)}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">
                      {isCancelled ? "Balance status" : outstandingAmount > 0 ? "Remaining balance" : "Paid in full"}
                    </span>
                    <span className={`shrink-0 font-sans text-lg font-bold tabular-nums ${isCancelled ? "text-slate-500" : outstandingAmount > 0 ? "text-[#4C81E0]" : "text-emerald-700"}`}>
                      {isCancelled ? "Closed" : formatCurrency(outstandingAmount)}
                    </span>
                  </div>

                  {outstandingAmount > 0 && !isCancelled && (
                    <Button
                      onClick={handlePayRemainingBalance}
                      disabled={payingPaymentId !== null}
                      className="mt-2 w-full h-9 text-xs font-semibold rounded-lg shadow-2xs bg-[#4C81E0] hover:bg-[#3b6ec6] text-white cursor-pointer gap-1.5 transition-all active:scale-95"
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      {payingPaymentId ? "Opening checkout…" : `Pay Remaining Balance (${formatCurrency(outstandingAmount)})`}
                    </Button>
                  )}

                  {isCancelled && (
                    <div className="mt-2 p-2.5 rounded-lg bg-rose-50/80 border border-rose-200/80 text-[11px] text-rose-800 text-center font-medium">
                      Booking Cancelled · Billing Closed
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInvoiceModal(true)}
                      className="w-full text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] h-9 rounded-lg transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      View Official Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transactions Table (2 cols) */}
              <Card className="border-slate-200/80 shadow-xs rounded-xl lg:col-span-2 bg-white">
                <CardHeader className="border-b border-slate-100 py-3.5 px-4 sm:px-5">
                  <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#4C81E0]" />
                    Payment Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {paymentLoading ? (
                    <div className="py-8 text-center text-slate-400 animate-pulse text-xs">Loading payments...</div>
                  ) : (
                    <CustomerPaymentsTable payments={bookingPayments} formatCurrency={formatCurrency} showEventDetails={false} />
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: STATUS & TIMELINE (OPERATIONAL TRACKING & ACTIVITY) */}
          <TabsContent value="timeline" className="space-y-6">
            {/* 1. OPERATIONAL TRACKING & LOGISTICS (2-col grid: Execution Timeline + Ocular/Delivery) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Event Execution Timeline (lg:col-span-2) */}
              <Card className="border-slate-200/80 shadow-xs rounded-xl lg:col-span-2 bg-white">
                <CardHeader className="border-b border-slate-100 py-3.5 px-4 sm:px-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-[#4C81E0]" />
                        Event Execution Timeline
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500 mt-0.5">
                        Operational workflow stages from booking confirmation to delivery.
                      </CardDescription>
                    </div>
                    {isCancelled && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200/80">
                        Workflow Cancelled
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {steps.map((step, idx) => {
                      const isStepDone = step.completed;
                      const activeStepIndex = isCancelled ? -1 : steps.findIndex((s) => !s.completed);
                      const isStepCurrent = activeStepIndex === -1 ? (!isCancelled && idx === steps.length - 1) : idx === activeStepIndex;

                      return (
                        <div key={idx} className="relative flex items-start gap-3 group">
                          <div 
                            className={cn(
                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 absolute -left-6 top-0 z-10 transition-colors",
                              isStepDone 
                                ? "bg-emerald-600 text-white shadow-2xs" 
                                : isCancelled
                                ? "bg-slate-100 text-slate-300 border border-slate-200"
                                : isStepCurrent
                                ? "bg-[#4C81E0] text-white ring-2 ring-blue-100 shadow-2xs"
                                : "bg-slate-100 text-slate-400 border border-slate-200"
                            )}
                          >
                            {isStepDone ? <Check className="w-3 h-3 stroke-[2.5]" /> : idx + 1}
                          </div>

                          <div className="space-y-0.5 text-xs min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={cn("font-semibold", isStepDone ? "text-slate-900" : isStepCurrent ? "text-[#4C81E0]" : "text-slate-500")}>
                                {step.label}
                              </h4>
                              <span 
                                className={cn(
                                  "text-[10px] py-0.5 px-2 rounded-full font-medium inline-flex items-center",
                                  isStepDone 
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200/70"
                                    : isCancelled
                                    ? "bg-slate-50 text-slate-400 border border-slate-200/70"
                                    : isStepCurrent
                                    ? "bg-blue-50 text-[#4C81E0] border border-blue-200/70"
                                    : "bg-slate-50 text-slate-500 border border-slate-200/70"
                                )}
                              >
                                {isCancelled && !isStepDone ? "Cancelled" : step.date}
                              </span>
                            </div>
                            {step.desc && (
                              <p className="text-[11px] text-slate-500 leading-relaxed">{step.desc}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Ocular Inspection / Delivery Widget (lg:col-span-1) */}
              <div>
                {isFoodOnlyService ? (
                  <Card className="border-slate-200/80 shadow-xs rounded-xl bg-white">
                    <CardHeader className="border-b border-slate-100 py-3.5 px-4">
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#4C81E0]" />
                        Food Delivery &amp; Drop-off
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3.5 text-xs">
                      <div className="bg-blue-50/50 border border-blue-100/70 p-2.5 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-[#4C81E0] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold block">Food-Only Order</span>
                          <p className="text-blue-700 mt-0.5">An on-site ocular inspection is not required for this delivery booking.</p>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg space-y-1.5">
                        <span className="font-semibold text-slate-900 block">Delivery Schedule</span>
                        <p className="text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date TBA"}
                        </p>
                        <p className="text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {booking.start_time ? `Drop-off by ${booking.start_time}` : "Time TBA"}
                        </p>
                      </div>

                      <div className="space-y-1 text-slate-600">
                        <p className="font-semibold text-slate-800">Drop-off Destination:</p>
                        <p className="text-slate-500">
                          {[booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || "Address TBA"}
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-500 pt-2 border-t border-slate-100 leading-relaxed">
                        Food will be delivered packed and warm to your location on the scheduled date.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-slate-200/80 shadow-xs rounded-xl bg-white">
                    <CardHeader className="border-b border-slate-100 py-3.5 px-4">
                      <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-[#4C81E0]" />
                        {isSetupOnlyService ? "Venue Setup Inspection" : "Venue Ocular Inspection"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      {booking.ocular_visit && booking.ocular_visit.status === "scheduled" && (
                        <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-950 block">Site Visit Scheduled</span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                              Confirmed
                            </span>
                          </div>
                          <p className="font-semibold text-emerald-900 flex items-center gap-1.5 pt-0.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                            {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                          {booking.ocular_visit.scheduled_time && (
                            <p className="text-emerald-800 flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-emerald-700" />
                              {booking.ocular_visit.scheduled_time}
                            </p>
                          )}
                          {booking.ocular_visit.notes && (
                            <p className="text-[11px] text-emerald-800/90 pt-1 border-t border-emerald-200/60 mt-1">
                              Note: {booking.ocular_visit.notes}
                            </p>
                          )}
                        </div>
                      )}

                      {pendingOcular && (
                        <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-lg space-y-1.5">
                          <span className="font-semibold text-[#4C81E0] block">Ocular Request Sent</span>
                          <p className="text-blue-900 text-[11px]">Your requested visit date is awaiting confirmation from our catering coordinator.</p>
                          <p className="font-semibold text-[#4C81E0] flex items-center gap-1.5 pt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()}
                          </p>
                          {canModifyBooking && !isCancelled && (
                            <div className="pt-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setRequestingOcular(true)}
                                className="w-full text-xs font-semibold border-blue-200 bg-white hover:bg-blue-50 text-[#4C81E0] h-8 rounded-lg cursor-pointer transition-all"
                              >
                                Reschedule Request
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {booking.ocular_visit && booking.ocular_visit.status === "completed" && (
                        <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-lg space-y-1.5">
                          <span className="font-semibold text-emerald-950 block flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Inspection Completed
                          </span>
                          <p className="text-emerald-900 text-xs">
                            On-site venue inspection has been completed by our team.
                          </p>
                          {booking.ocular_visit.outcome && (
                            <p className="text-[11px] text-emerald-800">
                              Outcome: {booking.ocular_visit.outcome}
                            </p>
                          )}
                        </div>
                      )}

                      {needsOcular && canModifyBooking && !isCancelled && (
                        <div className="p-3.5 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 text-center space-y-2">
                          <p className="font-semibold text-amber-950 text-xs">Schedule Venue Ocular Visit</p>
                          <p className="text-[11px] text-amber-800">
                            Inspect venue layout &amp; setup requirements before your event.
                          </p>
                          <Button 
                            size="sm" 
                            onClick={() => setRequestingOcular(true)}
                            className="w-full text-xs font-semibold bg-[#4C81E0] hover:bg-[#3B6EC9] text-white h-8 rounded-lg cursor-pointer shadow-2xs transition-all"
                          >
                            Schedule Ocular Visit
                          </Button>
                        </div>
                      )}

                      {/* Explicit Empty State when no inspection is scheduled, requested, completed, or required */}
                      {!(booking.ocular_visit && booking.ocular_visit.status === "scheduled") &&
                        !pendingOcular &&
                        !(booking.ocular_visit && booking.ocular_visit.status === "completed") &&
                        !(needsOcular && canModifyBooking && !isCancelled) && (
                        <div className="p-4 rounded-lg bg-slate-50/60 border border-dashed border-slate-200 text-center space-y-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto">
                            <CalendarRange className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-xs">No ocular inspection scheduled</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                              An on-site inspection has not been scheduled for this booking.
                            </p>
                          </div>

                          {canModifyBooking && !isCancelled && booking.ocular_visit?.is_required !== false ? (
                            <div className="pt-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setRequestingOcular(true)}
                                className="w-full text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] h-8 rounded-lg cursor-pointer transition-all"
                              >
                                Request Ocular Visit
                              </Button>
                            </div>
                          ) : (
                            <p className="text-[10px] text-slate-400 pt-0.5">
                              {isCancelled
                                ? "Ocular scheduling is closed for cancelled bookings."
                                : booking.ocular_visit?.is_required === false
                                ? "On-site ocular visit was waived or not required."
                                : "Scheduling window for ocular inspection is closed."}
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* 2. ACTIVITY HISTORY (Chronological record below operational timeline) */}
            <Card className="border-slate-200/80 shadow-xs rounded-xl bg-white">
              <CardHeader className="border-b border-slate-100 py-3.5 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-[#4C81E0]" />
                  Activity History
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Chronological record of booking milestones, change requests, site visits, and payment events.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <BookingHistoryTimeline booking={booking} payments={bookingPayments} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: REVISIONS & HISTORY (VERSION TRACKING) */}
          <TabsContent value="revisions" className="space-y-6">
            <Card className="border-slate-200/80 shadow-xs rounded-xl bg-white">
              <CardHeader className="border-b border-slate-100 py-3.5 px-4 sm:px-5">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#4C81E0]" />
                  Revisions &amp; History
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Record of change proposals and versions between booking updates.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <BookingVersionHistory booking={booking} sourceQuotation={sourceQuotation} />
              </CardContent>
            </Card>

            {sourceQuotation && (
              <Card className="border-slate-200/80 shadow-xs rounded-xl bg-white">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">Source quotation</p>
                    <p className="text-slate-500 mt-0.5">
                      <span className="tabular-nums">
                        {sourceQuotation.quotation.quotation_number || "Quotation"} · Version{" "}
                        {Number(sourceQuotation.quotation.version_number) || 1}.0
                      </span>
                      {sourceQuotation.quotation.status === "Accepted" && sourceQuotation.quotation.updatedAt && (
                        <> · Accepted {formatShortDate(sourceQuotation.quotation.updatedAt)}</>
                      )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs h-8 px-3 border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] rounded-lg transition-all"
                    onClick={() => navigate("/customer/inquiries")}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1 text-slate-400" /> View original quote
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>

      {/* PROGRESSIVE DISCLOSURE: SELECTIONS & DETAILS DIALOG */}
      <Dialog open={isSelectionsModalOpen} onOpenChange={setIsSelectionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6 sm:p-7 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#4C81E0]" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Selections &amp; Package Specifications
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {resolvedPackage?.name || booking.package_name_snapshot || "Custom Catering Selections"} • {booking.guest_count || 0} guests • {resolveServiceType(booking)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3 text-xs">
            {/* 1. PACKAGE QUOTATION BREAKDOWN (IF CUSTOM MODIFICATIONS OCCURRED) */}
            {showPackageBreakdown && (
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <span className="font-bold text-xs text-slate-900 block uppercase tracking-wider">
                  Package Price Breakdown
                </span>
                <div className="space-y-1.5 text-xs">
                  {packageStartingPrice > 0 && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Original Package Starting Price</span>
                      <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(packageStartingPrice)}</span>
                    </div>
                  )}
                  {removedInclusions.map((entry, idx) => (
                    <div key={`rem-${idx}`} className="flex items-center justify-between text-rose-600">
                      <span>Removed: {entry.name || entry}</span>
                      <span className="font-semibold tabular-nums text-emerald-700">− {formatCurrency(entry.deduction || 0)}</span>
                    </div>
                  ))}
                  {inclusionAdjustments.map((entry, idx) => {
                    const amt = Number(entry.amount) || 0;
                    return (
                      <div key={`adj-${idx}`} className="flex items-center justify-between text-slate-600">
                        <span>{entry.name} ({entry.quantity} instead of {entry.base_quantity})</span>
                        <span className={cn("font-semibold tabular-nums", amt < 0 ? "text-emerald-700" : "text-slate-900")}>
                          {amt < 0 ? "− " : "+ "}{formatCurrency(Math.abs(amt))}
                        </span>
                      </div>
                    );
                  })}
                  {packageFinalPrice > 0 && (
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 font-bold text-slate-900">
                      <span>Final Adjusted Package Price</span>
                      <span className="tabular-nums text-slate-900">{formatCurrency(packageFinalPrice)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. SELECTED DISHES */}
            {booking.menu_items && booking.menu_items.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Utensils className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Selected Menu Dishes ({booking.menu_items.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {booking.menu_items.map((item, idx) => {
                    const lineTotal = getItemLineTotal(item, guestCount);
                    return (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-xs truncate">{item.name}</div>
                          {item.category && (
                            <span className="text-[10px] text-slate-500">{item.category}</span>
                          )}
                          {item.note && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{item.note}</p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          {lineTotal > 0 ? (
                            <span className="font-bold text-slate-900 text-xs">+{formatCurrency(lineTotal)}</span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Included</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. ACTIVE PACKAGE INCLUSIONS & EQUIPMENT */}
            {packageInclusionGroups.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Package Inclusions &amp; Setup ({totalPackageInclusionsCount})
                  </h4>
                </div>

                <div className="space-y-3">
                  {packageInclusionGroups.map(({ category, items }) => (
                    <div key={category} className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 block">
                        {category}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800"
                          >
                            <div className="flex items-start gap-2 min-w-0">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-snug">{item}</span>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              Included
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. CONFIGURED SCAFFOLD SIZE SPECIFICATIONS */}
            {resolvedScaffoldSize && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Store className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Configured Scaffold Size
                  </h4>
                </div>
                <div className="flex items-center gap-3 flex-wrap pt-1 text-xs">
                  <div className="font-bold text-slate-900 text-sm">
                    {resolvedScaffoldSize.formatted}
                    {resolvedScaffoldSize.label && (
                      <span className="text-xs text-slate-500 font-normal ml-1">({resolvedScaffoldSize.label})</span>
                    )}
                  </div>
                  {resolvedScaffoldSize.area && (
                    <span className="text-slate-500">• Total Area: {resolvedScaffoldSize.area}</span>
                  )}
                  {resolvedScaffoldSize.capacity && (
                    <span className="text-slate-500">• Optimal for {resolvedScaffoldSize.capacity}</span>
                  )}
                </div>
              </div>
            )}

            {/* 5. ADD-ONS & SERVICE ITEMS */}
            {booking.service_items && booking.service_items.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <PackagePlus className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Add-on Services &amp; Rental Items ({booking.service_items.length})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {booking.service_items.map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200/80">
                      <div>
                        <span className="font-semibold text-slate-900">{item.name}</span>
                        {item.quantity > 1 && <span className="text-slate-500 text-[11px] ml-1.5">x{item.quantity}</span>}
                      </div>
                      <span className="font-bold text-slate-900 tabular-nums">{formatCurrency(item.price * (item.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* REVISION PROPOSAL REVIEW MODAL */}
      <RevisionProposalModal
        open={showProposalModal}
        onClose={() => setShowProposalModal(false)}
        booking={booking}
        onAccept={handleAcceptRevision}
        onReject={handleRejectRevision}
        onCounterPropose={handleCounterPropose}
        isCustomer={true}
      />

      {/* OCULAR DATE PICKER MODAL */}
      <OcularDatePickerModal
        open={requestingOcular}
        onClose={() => setRequestingOcular(false)}
        booking={booking}
        onSelect={submitOcularRequest}
        isSubmitting={isSubmittingOcular}
      />

      {/* PAYMENT CHOICE MODAL */}
      <PaymentChoiceModal
        open={isChoiceModalOpen}
        onClose={() => setIsChoiceModalOpen(false)}
        booking={booking}
        remainingBalance={outstandingAmount}
        onPaymentSelected={(_method) => {
          setIsChoiceModalOpen(false);
          setPayingPaymentId(booking._id);
          CustomerAPI.createPaymentCheckout({
            booking_id: booking._id,
            amount: outstandingAmount,
            payment_type: "balance",
          })
            .then((res) => {
              if (res.data?.checkout_url) {
                window.location.assign(res.data.checkout_url);
              } else {
                notify("Could not generate payment URL.", "error");
              }
            })
            .catch((err) => notify(err.response?.data?.message || "Failed to start checkout.", "error"))
            .finally(() => setPayingPaymentId(null));
        }}
      />

      {/* POLICY MODAL */}
      {showPolicyModal && (
        <CustomerPolicyModal
          open={Boolean(showPolicyModal)}
          onClose={() => setShowPolicyModal(null)}
          policyType={showPolicyModal}
        />
      )}

      {/* OFFICIAL INVOICE MODAL */}
      <InvoiceModal
        open={showInvoiceModal}
        onClose={() => setShowInvoiceModal(false)}
        booking={booking}
        businessInfo={businessInfo}
        payments={bookingPayments}
      />

      {/* ADD GUESTS DIALOG */}
      <Dialog open={addingGuests} onOpenChange={setAddingGuests}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitAddGuests}>
            <DialogHeader>
              <DialogTitle>Add Guests</DialogTitle>
              <DialogDescription className="pt-2">
                You currently have <strong className="text-slate-900">{booking?.guest_count}</strong> guests.
                Adding more guests costs <strong className="text-slate-900">₱500 per head</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700" htmlFor="additional-guests">
                  Additional Guests to Add
                </label>
                <Input
                  id="additional-guests"
                  type="number"
                  min="1"
                  value={additionalGuests}
                  onChange={(e) => setAdditionalGuests(Number(e.target.value))}
                />
              </div>
              
              {additionalGuests > 0 && (
                <div className="p-3 bg-blue-50 text-[#1E3563] rounded-lg border border-blue-200">
                  <strong>Amount Due: </strong> {formatCurrency(additionalGuests * 500)}
                </div>
              )}

              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-rose-600 text-xs mt-1">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Guest additions are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddingGuests(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isSubmittingGuests || additionalGuests <= 0 || !canModifyBooking}
                className="bg-[#1E3563] text-white"
              >
                {isSubmittingGuests ? "Processing..." : "Confirm & Pay"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* UPGRADE PACKAGE DIALOG */}
      <Dialog open={upgrading} onOpenChange={setUpgrading}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitUpgrade}>
            <DialogHeader>
              <DialogTitle>Upgrade Package</DialogTitle>
              <DialogDescription className="pt-2 text-xs">
                Select a new catering package to upgrade your reservation.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700">Select New Package</label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a package..." />
                  </SelectTrigger>
                  <SelectContent>
                    {packages
                      .filter((p) => String(p._id) !== String(booking?.package_id?._id || booking?.package_id))
                      .map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name} {p.price_per_guest ? `(${formatCurrency(p.price_per_guest)}/head)` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setUpgrading(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isSubmittingUpgrade || !selectedPackageId}
                className="bg-[#1E3563] text-white"
              >
                {isSubmittingUpgrade ? "Processing..." : "Continue to Upgrade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CHANGE REQUEST DIALOG */}
      <Dialog open={requestingChange} onOpenChange={setRequestingChange}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submitChangeRequest}>
            <DialogHeader>
              <DialogTitle>Request Booking Changes</DialogTitle>
              <DialogDescription className="pt-1 text-xs text-slate-500">
                Propose schedule, headcount, or venue changes for your coordinator to review.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700">New Event Date (Optional)</label>
                <Input
                  type="date"
                  value={changeFields.event_date}
                  onChange={(e) => setChangeFields({ ...changeFields, event_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700">New Start Time (Optional)</label>
                <Input
                  type="time"
                  value={changeFields.start_time}
                  onChange={(e) => setChangeFields({ ...changeFields, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700">Updated Guest Count (Optional)</label>
                <Input
                  type="number"
                  min="1"
                  value={changeFields.guest_count}
                  onChange={(e) => setChangeFields({ ...changeFields, guest_count: e.target.value })}
                  placeholder={String(booking?.guest_count || "")}
                />
              </div>
              <div className="space-y-1">
                <label className="font-medium text-slate-700">Change Notes &amp; Explanation</label>
                <textarea
                  rows={3}
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder="Describe your requested adjustments in detail..."
                  className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setRequestingChange(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                size="sm"
                disabled={isSubmittingRequest}
                className="bg-[#1E3563] text-white"
              >
                {isSubmittingRequest ? "Submitting..." : "Submit Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* CANCELLATION REQUEST DIALOG */}
      <Dialog open={requestingCancellation} onOpenChange={setRequestingCancellation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" /> Request Booking Cancellation
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs text-slate-500">
              Cancellations are subject to our reservation terms and deposit policy.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
              <strong>Policy Summary:</strong> {cancellationPolicyText}
            </div>

            <div className="space-y-1">
              <label className="font-medium text-slate-700">Reason for Cancellation</label>
              <textarea
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please state why you need to cancel this reservation..."
                className="flex w-full rounded-md border border-input bg-white px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" size="sm" onClick={() => setRequestingCancellation(false)}>
              Keep Booking
            </Button>
            <Button
              size="sm"
              onClick={submitCancellationRequest}
              disabled={isSubmittingCancellation || !cancellationReason.trim()}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmittingCancellation ? "Submitting..." : "Confirm Cancellation Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
