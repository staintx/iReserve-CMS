import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import OcularDatePickerModal from "../../components/customer/OcularDatePickerModal";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import { 
  ChevronLeft, 
  Check, 
  Clock, 
  AlertCircle, 
  CalendarRange, 
  Users, 
  ArrowUpCircle, 
  MessageSquare,
  Copy,
  Utensils,
  CreditCard,
  MapPin,
  UserCheck,
  Sparkles,
  Phone,
  Mail,
  DollarSign,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CalendarCheck,
  Info,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  Store,
  History,
  FileText,
  Truck,
  Star,
  AlertTriangle
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
import { isFoodOnly, isSetupOnly } from "../../components/customer/portal/statusMeta";
import BookingHistoryTimeline from "../../components/booking/BookingHistoryTimeline";
import BookingVersionHistory from "../../components/booking/BookingVersionHistory";
import AmountSummary from "../../components/customer/portal/AmountSummary";
import { ACTION_PAY, ACTION_MESSAGE } from "../../components/customer/portal/actionStyles";
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

// Group menu items by category
const categorizeMenuItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const groups = {};
  items.forEach((dish) => {
    const cat = dish?.category || "Main Course";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(dish);
  });
  return Object.entries(groups).map(([category, dishes]) => ({
    category,
    dishes,
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
  // Fallback: if quantity is specified along with a unit or quantity > 1
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
  const [isPackageExpanded, setIsPackageExpanded] = useState(false);
  
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
  const [ocularDate, _setOcularDate] = useState("");
  const [ocularTime, _setOcularTime] = useState("");
  const [isSubmittingOcular, setIsSubmittingOcular] = useState(false);

  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);

  // Rating & Review State
  const [bookingRating, setBookingRating] = useState(null);
  const [_loadingRating, setLoadingRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingHoverStars, setRatingHoverStars] = useState(0);
  const [ratingReview, setRatingReview] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Cancellation Request State
  const [requestingCancellation, setRequestingCancellation] = useState(false);
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState(false);

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

  const _pendingPayments = useMemo(
    () => bookingPayments.filter((p) => p.status === "pending"),
    [bookingPayments]
  );

  // Independent Price Breakdown Calculations for Customer View
  // Independent Price Breakdown Calculations for Customer View
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

  const categorizedMenu = useMemo(() => {
    return categorizeMenuItems(booking?.menu_items || []);
  }, [booking?.menu_items]);

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

  const handlePayRemainingBalance = async () => {
    if (!booking?._id || outstandingAmount <= 0) return;
    setPayingPaymentId("balance");

    try {
      notify("Generating secure PayMongo checkout session...", "info");
      const res = await CustomerAPI.createPaymentCheckout({
        booking_id: booking._id,
        amount: outstandingAmount,
        payment_type: "balance"
      });

      if (res.data?.checkout_url) {
        window.location.assign(res.data.checkout_url);
      } else {
        notify("Could not generate checkout session.", "error");
        setPayingPaymentId(null);
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start checkout.", "error");
      setPayingPaymentId(null);
    }
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
      await CustomerAPI.requestCancellation(booking._id);
      notify("Cancellation request submitted to management for review.", "success");
      setRequestingCancellation(false);
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

  /**
   * Which quotation this booking came from.
   *
   * Checks direct booking.inquiry_id if populated, falling back to
   * Inquiry.converted_booking_id reverse lookup for older records.
   */
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
          // fallback to inquiry below
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
      // A missing link is normal for bookings made outside the quote flow.
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
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground animate-pulse gap-3">
          <Utensils className="w-10 h-10 text-primary/40 animate-bounce" />
          <p className="font-medium text-lg">Loading full reservation details...</p>
        </div>
      </CustomerDashboardLayout>
    );
  }

  if (!booking) {
    return (
      <CustomerDashboardLayout title="Reservation Details">
        <div className="p-12 text-center max-w-md mx-auto bg-card rounded-2xl border border-border shadow-xs">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-serif font-bold text-xl mb-2 text-foreground">Booking Not Found</h3>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn't locate the reservation details. It may have been deleted or moved.
          </p>
          <Button variant="default" onClick={() => navigate("/customer/bookings")} className="w-full">
            Return to My Bookings
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const serviceType = booking.service_type || "Food and Event Setup";
  const isFoodOnlyService = isFoodOnly(serviceType);
  const isSetupOnlyService = isSetupOnly(serviceType);

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
      label: "Food Preparation",
      completed: ["preparing", "ongoing", "ready for event", "out for delivery", "completed"].includes(String(booking.status).toLowerCase()),
      date: ["preparing", "ongoing", "ready for event", "out for delivery", "completed"].includes(String(booking.status).toLowerCase()) ? "In Progress" : "Scheduled",
      desc: "Kitchen staff preparing your dishes"
    },
    { 
      label: "Out for Delivery & Drop-off", 
      completed: ["out for delivery", "completed"].includes(String(booking.status).toLowerCase()),
      date: ["out for delivery", "completed"].includes(String(booking.status).toLowerCase()) ? "Completed" : "Event Day",
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
      desc: "Order has been registered in system"
    },
    {
      label: "Preparing Order",
      completed: ["preparing", "ongoing", "completed"].includes(booking.status),
      date: ["preparing", "ongoing", "completed"].includes(booking.status) ? "In Progress" : "Pending",
      desc: "Kitchen staff preparing your menu"
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
      label: "Final Payment", 
      completed: booking.payment_status === "fully_paid" || isFullyPaid,
      date: isFullyPaid ? "Completed" : "Due before event date",
      desc: "Full balance payment cleared"
    },
    { 
      label: "Event Completed", 
      completed: ["completed", "Completed"].includes(booking.status),
      date: ["completed", "Completed"].includes(booking.status) ? "Completed" : "Upcoming",
      desc: "Event successfully served"
    },
  ];

  const assignedStaff = booking.staff_assignments || [];
  const eventManager = booking.event_manager_id;
  const ocularActionMeta = getBookingOcularActionMeta(booking);
  const needsOcular = Boolean(ocularActionMeta && ocularActionMeta.state === "action_required");
  const pendingOcular = Boolean(ocularActionMeta && ocularActionMeta.state === "requested");

  // Status badge config
  const rawStatus = (booking.status || "").toLowerCase();
  let statusBadge = {
    label: booking.status,
    variant: "secondary"
  };
  if (["confirmed", "converted to booking"].includes(rawStatus)) {
    statusBadge = { label: "Confirmed & Reserved", variant: "bg-emerald-600 text-white font-bold" };
  } else if (["deposit pending", "pending deposit"].includes(rawStatus)) {
    statusBadge = { label: "Deposit Needed", variant: "bg-amber-500 text-slate-950 font-bold" };
  } else if (rawStatus === "ocular scheduled") {
    statusBadge = { label: "Ocular Scheduled", variant: "bg-blue-600 text-white font-bold" };
  } else if (["completed", "event completed"].includes(rawStatus)) {
    statusBadge = { label: "Event Completed", variant: "bg-slate-800 text-white font-semibold" };
  } else if (rawStatus === "cancelled") {
    statusBadge = { label: "Cancelled", variant: "bg-rose-600 text-white font-bold" };
  }

  const refCode = booking.reference || booking._id.substring(0, 8).toUpperCase();

  return (
    <CustomerDashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-5 pb-12 font-sans">
        {/* Navigation Top Bar */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/customer/bookings")}
            className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 font-semibold transition-colors -ml-2 h-8 px-2 text-xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to My Bookings
          </Button>
        </div>

        {/* Cancelled Payment Notification Banner */}
        {searchParams.get("payment") === "cancelled" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-amber-950 text-xs">Payment Cancelled</h4>
              <p className="text-amber-800 text-xs mt-0.5">
                Your checkout session was cancelled. No charges were made, and you can complete your payment whenever you are ready.
              </p>
            </div>
          </div>
        )}

        {/* Header — what this booking is, when, and what it costs */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {booking.event_type || "Catering Event"}
                </h1>
                <Badge className={`rounded-md px-2 py-0.5 text-xs ${statusBadge.variant}`}>
                  {statusBadge.label}
                </Badge>
                {booking.is_revised && (
                  <Badge className="border-amber-300 bg-amber-100 text-xs font-semibold text-amber-900 rounded-md px-2 py-0.5">
                    Revised · v{booking.revision_count || 1}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-600">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="font-semibold text-slate-800">
                    {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date to be confirmed"}
                  </span>
                  {booking.start_time && (
                    <span className="text-slate-500">· {booking.start_time}</span>
                  )}
                </span>

                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="font-semibold text-slate-800">{booking.guest_count || 0} guests</span>
                </span>

                <span className="flex items-center gap-1.5">
                  <Utensils className="w-3.5 h-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  <span className="font-semibold text-slate-800">{booking.service_type || "Food & Setup"}</span>
                </span>

                <button
                  type="button"
                  onClick={copyReferenceCode}
                  title="Copy reference code"
                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2C4B8A]"
                >
                  <span className="font-mono">{refCode}</span>
                  <Copy className="h-3 w-3 text-slate-400" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* The whole money story — total, paid, remaining */}
            <div className="w-full shrink-0 rounded-lg border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 lg:w-72">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">Total cost</span>
                <span className="text-xs font-bold tabular-nums text-slate-900">{formatCurrency(grandTotal)}</span>
              </div>
              <div className="mt-0.5 flex items-baseline justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">Amount paid</span>
                <span className="text-xs font-bold tabular-nums text-emerald-700">
                  {displayPaid > 0 ? `− ${formatCurrency(displayPaid)}` : formatCurrency(0)}
                </span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-1.5">
                <span className="text-xs font-bold text-slate-800">
                  {isFullyPaid ? "Paid in full" : "Remaining balance"}
                </span>
                <span className={`text-lg font-bold tabular-nums ${isFullyPaid ? "text-emerald-700" : "text-amber-700"}`}>
                  {formatCurrency(isFullyPaid ? grandTotal : outstandingAmount)}
                </span>
              </div>

              {outstandingAmount > 0 && (
                <Button
                  onClick={handlePayRemainingBalance}
                  disabled={payingPaymentId !== null}
                  className="mt-2 w-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 rounded-lg cursor-pointer shadow-xs gap-1.5 transition-all active:scale-[0.98]"
                >
                  <CreditCard className="h-4 w-4" />
                  {payingPaymentId ? "Opening Checkout…" : `Pay Balance (${formatCurrency(outstandingAmount)})`}
                </Button>
              )}
            </div>
          </div>

          {/* WORKFLOW-ORGANIZED QUICK ACTION TOOLBAR */}
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                disabled={isOpeningChat}
                className="gap-1.5 rounded-lg border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold h-8 px-3 cursor-pointer shadow-2xs"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#2C4B8A]" />
                {isOpeningChat ? "Opening chat…" : "Message Staff"}
              </Button>

              {!['inquiry', 'quote_sent', 'customer_accepted', 'completed', 'cancelled', 'refunded'].includes(booking.status) && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setRequestingCancellation(true)}
                  className="text-xs rounded-lg border-rose-200 bg-rose-50/50 hover:bg-rose-100 text-rose-800 font-semibold gap-1.5 h-8 px-3 cursor-pointer"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Request Cancellation
                </Button>
              )}
            </div>

            {booking.status === "quote_sent" && (
              <Button 
                onClick={acceptQuote} 
                disabled={isAcceptingQuote}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 h-8 rounded-lg shadow-xs gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isAcceptingQuote ? "Processing..." : "Accept Quote & Pay Deposit"}
              </Button>
            )}
          </div>
        </div>

        {/* CLEAN HORIZONTAL LIFECYCLE TIMELINE (DESIGN REFERENCE MATCH) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2C4B8A]" /> Booking Progress Timeline
            </h2>
            <span className="text-xs font-mono text-slate-400">Ref: #{refCode}</span>
          </div>

          <div className="relative pt-3 pb-2 px-2 sm:px-6">
            {/* Connecting Background Line */}
            <div className="absolute top-7 left-8 right-8 h-0.5 bg-slate-200 -z-0" />

            {/* Steps Grid */}
            <div
              className={cn(
                "grid gap-2 relative z-10",
                steps.length === 5 ? "grid-cols-5" : steps.length === 3 ? "grid-cols-3" : "grid-cols-4"
              )}
            >
              {steps.map((step, idx) => {
                const isDone = step.completed;
                const activeIndex = steps.findIndex((s) => !s.completed);
                const isCurrent = activeIndex === -1 ? idx === steps.length - 1 : idx === activeIndex;

                return (
                  <div key={idx} className="flex flex-col items-center text-center group">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-2xs",
                        isDone
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-[#2C4B8A] text-white ring-4 ring-[#2C4B8A]/15 scale-105"
                          : "bg-white text-slate-400 border-2 border-slate-200"
                      )}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[2.5]" /> : idx + 1}
                    </div>

                    <div className="mt-2.5 space-y-0.5 max-w-[140px]">
                      <h3
                        className={cn(
                          "text-xs sm:text-sm font-sans leading-tight",
                          isCurrent
                            ? "font-extrabold text-[#1E3563]"
                            : isDone
                            ? "font-bold text-slate-900"
                            : "font-medium text-slate-400"
                        )}
                      >
                        {step.label}
                      </h3>
                      <p
                        className={cn(
                          "text-[11px] leading-snug hidden sm:block",
                          isCurrent ? "text-slate-600 font-medium" : "text-slate-400"
                        )}
                      >
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* DEDICATED SEPARATE VENUE & SITE OCULAR INSPECTION CARD */}
        {ocularActionMeta && (
          <Card
            className={cn(
              "rounded-xl p-4 sm:p-5 shadow-2xs space-y-3 transition-all",
              ocularActionMeta.state === "action_required"
                ? "border-amber-200/90 bg-gradient-to-r from-amber-50/80 to-orange-50/50"
                : ocularActionMeta.state === "scheduled"
                ? "border-blue-200/90 bg-gradient-to-r from-blue-50/70 to-indigo-50/40"
                : ocularActionMeta.state === "requested"
                ? "border-amber-200/80 bg-gradient-to-r from-amber-50/60 to-orange-50/30"
                : "border-emerald-200/80 bg-gradient-to-r from-emerald-50/50 to-teal-50/30"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-2xs",
                    ocularActionMeta.state === "action_required"
                      ? "bg-amber-100 border-amber-200 text-amber-700"
                      : ocularActionMeta.state === "scheduled"
                      ? "bg-blue-100 border-blue-200 text-blue-700"
                      : ocularActionMeta.state === "requested"
                      ? "bg-amber-100 border-amber-200 text-amber-700"
                      : "bg-emerald-100 border-emerald-200 text-emerald-700"
                  )}
                >
                  {ocularActionMeta.state === "completed" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : ocularActionMeta.state === "scheduled" ? (
                    <CalendarCheck className="w-5 h-5" />
                  ) : (
                    <CalendarRange className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        ocularActionMeta.state === "action_required"
                          ? "bg-orange-500 animate-pulse"
                          : ocularActionMeta.state === "scheduled"
                          ? "bg-blue-600"
                          : ocularActionMeta.state === "requested"
                          ? "bg-amber-500"
                          : "bg-emerald-600"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider",
                        ocularActionMeta.state === "action_required"
                          ? "text-amber-900"
                          : ocularActionMeta.state === "scheduled"
                          ? "text-blue-900"
                          : ocularActionMeta.state === "requested"
                          ? "text-amber-900"
                          : "text-emerald-900"
                      )}
                    >
                      {ocularActionMeta.headline} • {ocularActionMeta.subheadline}
                    </span>
                  </div>
                  <h4
                    className={cn(
                      "font-bold text-sm sm:text-base font-sans",
                      ocularActionMeta.state === "action_required"
                        ? "text-amber-950"
                        : ocularActionMeta.state === "scheduled"
                        ? "text-blue-950"
                        : ocularActionMeta.state === "requested"
                        ? "text-amber-950"
                        : "text-emerald-950"
                    )}
                  >
                    {ocularActionMeta.state === "action_required"
                      ? "Ocular Visit Required"
                      : ocularActionMeta.state === "scheduled"
                      ? "Ocular Visit Scheduled"
                      : ocularActionMeta.state === "requested"
                      ? "Ocular Visit Requested"
                      : "Ocular Visit Completed"}
                  </h4>
                  <p
                    className={cn(
                      "text-xs mt-0.5 leading-relaxed font-medium",
                      ocularActionMeta.state === "action_required"
                        ? "text-amber-800"
                        : ocularActionMeta.state === "scheduled"
                        ? "text-blue-800"
                        : ocularActionMeta.state === "requested"
                        ? "text-amber-800"
                        : "text-emerald-800"
                    )}
                  >
                    {ocularActionMeta.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {ocularActionMeta.state === "action_required" && (
                  <>
                    <Button
                      onClick={() => setRequestingOcular(true)}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8.5 px-4 rounded-lg cursor-pointer shadow-xs gap-1.5 active:scale-[0.98]"
                    >
                      <CalendarRange className="w-3.5 h-3.5" />
                      <span>Schedule Ocular Visit</span>
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
                        className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs h-8.5 px-3 rounded-lg cursor-pointer"
                      >
                        Skip Ocular
                      </Button>
                    )}
                  </>
                )}

                {(ocularActionMeta.state === "requested" || ocularActionMeta.state === "scheduled") && (
                  <Button
                    variant={ocularActionMeta.state === "scheduled" ? "outline" : "default"}
                    onClick={() => setRequestingOcular(true)}
                    className={cn(
                      "text-xs font-bold h-8.5 px-4 rounded-lg cursor-pointer shadow-xs gap-1.5 active:scale-[0.98]",
                      ocularActionMeta.state === "scheduled"
                        ? "border-blue-300 bg-white hover:bg-blue-50 text-blue-900"
                        : "bg-amber-600 hover:bg-amber-700 text-white"
                    )}
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Reschedule Ocular</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Pending Revision Proposal Banner */}
        {booking.pending_revision && ["pending_customer_approval", "pending_admin_approval"].includes(booking.pending_revision.status) && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-950 text-sm">
                  {booking.pending_revision.status === "pending_customer_approval" ? "Revised Booking Proposal Awaiting Your Confirmation!" : "Your Proposed Revision is Pending Admin Review"}
                </h4>
                <p className="text-amber-800 text-xs mt-0.5 leading-relaxed font-medium">
                  {booking.pending_revision.message || "Please review the updated booking terms and pricing adjustment."}
                </p>
              </div>
            </div>
            {booking.pending_revision.status === "pending_customer_approval" && (
              <Button 
                onClick={() => setShowProposalModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-4 py-1.5 h-8 rounded-md shrink-0 shadow-2xs cursor-pointer"
              >
                Review &amp; Respond to Proposal →
              </Button>
            )}
          </div>
        )}

        {/* Change Request Alert Notification Banner */}
        {booking.change_request && booking.change_request.status === 'pending' && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3.5 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-indigo-950 text-xs">Change Request Under Admin Review</h4>
              <p className="text-indigo-800 text-xs mt-0.5">"{booking.change_request.message}"</p>
              <p className="text-indigo-700 text-[11px] mt-0.5 font-mono">
                Submitted on {booking.change_request.requested_at ? new Date(booking.change_request.requested_at).toLocaleDateString() : "Recently"}
              </p>
            </div>
          </div>
        )}

        {/* Rating & Review Section for Completed Events */}
        {["completed", "Completed", "event completed"].includes(rawStatus) && (
          <Card className="border-amber-200/80 bg-gradient-to-r from-amber-50/60 to-orange-50/40 rounded-lg shadow-2xs">
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
                  ? "Thank you for sharing your feedback with our catering and styling team!" 
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
                    Your Review & Comments
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

        {/* Main Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="bg-slate-100/90 border border-slate-200 p-0.5 rounded-lg w-full sm:w-auto flex sm:inline-flex h-9 gap-0.5 overflow-x-auto justify-start">
            <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-2xs transition-all">
              <Utensils className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
              Reservation Overview
            </TabsTrigger>
            <TabsTrigger value="financials" className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-2xs transition-all">
              <CreditCard className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
              Payments & Billing
            </TabsTrigger>
            <TabsTrigger value="timeline" className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-2xs transition-all">
              <Clock className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
              Status & Timeline
            </TabsTrigger>
            <TabsTrigger value="revisions" className="shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-2xs transition-all">
              <Layers className="w-3.5 h-3.5 mr-1.5 hidden sm:inline" />
              Revisions & History
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              
              {/* Event & Venue Details Card (2 cols) */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-border shadow-2xs rounded-lg">
                  <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CalendarRange className="w-4 h-4 text-primary" />
                      Event & Location Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-xs sm:text-sm">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Package Name</p>
                        <p className="font-semibold text-foreground">{booking.package_id?.name || "Custom Catering Build"}</p>
                        {booking.package_id?.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{booking.package_id.description}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Event Type / Theme</p>
                        <p className="font-semibold text-foreground">
                          {booking.event_type} {booking.event_theme ? `(${booking.event_theme})` : ""}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Date & Time</p>
                        <p className="font-semibold text-foreground">
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "TBD"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Start Time: {booking.start_time || "Not specified"}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Expected Guests</p>
                        <p className="font-semibold text-foreground">{booking.guest_count || 0} pax</p>
                        {canModifyBooking && (
                          <button 
                            onClick={() => setAddingGuests(true)}
                            className="text-xs text-primary hover:underline font-medium inline-block mt-0.5"
                          >
                            + Add more guests
                          </button>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Venue / Setup Type</p>
                        <p className="font-semibold text-foreground">{booking.venue_type || "Standard Venue"}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">Service: {booking.service_type || "Food & Setup"}</p>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-0.5">Location Address</p>
                        {booking.delivery_method === "pickup" ? (
                          <p className="font-semibold text-foreground">Customer Pickup: {booking.pickup_location || "Store Premises"}</p>
                        ) : (
                          <div>
                            <p className="font-semibold text-foreground">{booking.barangay}, {booking.municipality}</p>
                            <p className="text-xs text-muted-foreground">{booking.street ? `${booking.street}, ` : ""}{booking.province} {booking.zip_code ? `(ZIP: ${booking.zip_code})` : ""}</p>
                            {booking.landmark && (
                              <p className="text-xs text-muted-foreground font-mono mt-0.5">Landmark: {booking.landmark}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Menu Items & Inclusions */}
                <Card className="border-border shadow-2xs rounded-lg">
                  <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-primary" />
                      Menu & Selected Inclusions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5 space-y-4">
                    {/* Selected Package & Inclusions Banner & Collapsible Accordion */}
                    {hasPackage && (
                      <div className="rounded-xl border border-border bg-slate-50/70 p-4 transition-all space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="flex items-start gap-3.5 min-w-0">
                            {resolvedPackage?.image_url ? (
                              <img
                                src={resolvedPackage.image_url}
                                alt={resolvedPackage.name}
                                className="w-14 h-14 rounded-xl object-cover border border-border shrink-0 shadow-2xs"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                                <Package className="w-6 h-6 opacity-80" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block leading-none">
                                  Selected Package
                                </span>
                                <span className="text-[10px] font-bold text-[#1E3563] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                  {isSpecialOffer ? "Special Offer Combo" : (resolvedPackage?.package_type || "Catering Package")}
                                </span>
                              </div>
                              <h3 className="font-extrabold text-sm sm:text-base text-foreground font-sans tracking-tight">
                                {resolvedPackage?.name || booking?.package_name_snapshot || activeQuotation?.package_name}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2 max-w-xl">
                                {resolvedPackage?.description || "Curated catering and event setup package tailored for your event."}
                              </p>

                              {/* Badges Summary */}
                              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                                {totalDishesCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-border px-2 py-0.5 rounded-md text-foreground shadow-2xs">
                                    <Utensils className="w-3 h-3 text-[#2C4B8A]" />
                                    <span>{totalDishesCount} dishes</span>
                                  </span>
                                )}

                                {totalPackageInclusionsCount > 0 && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-border px-2 py-0.5 rounded-md text-foreground shadow-2xs">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>{totalPackageInclusionsCount} setup inclusions</span>
                                  </span>
                                )}

                                {resolvedScaffoldSize && (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-border px-2 py-0.5 rounded-md text-foreground shadow-2xs">
                                    <Store className="w-3 h-3 text-[#2C4B8A]" />
                                    <span>{resolvedScaffoldSize.formatted}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Toggle Details Accordion Button */}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsPackageExpanded((prev) => !prev)}
                            className="border-slate-300 hover:border-[#2C4B8A] text-[#1E3563] bg-white hover:bg-blue-50 font-bold text-xs h-8 px-3 rounded-lg gap-1.5 cursor-pointer shadow-2xs shrink-0 self-start sm:self-center transition-all"
                          >
                            <span>{isPackageExpanded ? "Hide Package Details" : "View Package Details"}</span>
                            {isPackageExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>

                        {/* EXPANDED ACCORDION CONTENT */}
                        {isPackageExpanded && (
                          <div className="pt-4 border-t border-border space-y-4 animate-in fade-in-50 duration-200">
                            {/* Full description if present */}
                            {resolvedPackage?.fullDescription && resolvedPackage.fullDescription !== resolvedPackage.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed bg-white p-3.5 rounded-xl border border-border">
                                {resolvedPackage.fullDescription}
                              </p>
                            )}

                            {/* 1. PACKAGE BREAKDOWN & QUOTATION ADJUSTMENTS (Default package vs final quote) */}
                            {showPackageBreakdown && (
                              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border space-y-2.5">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <span className="font-bold text-xs text-foreground uppercase tracking-wider font-sans">
                                    Package Quotation Breakdown
                                  </span>
                                  <span className="text-xs font-semibold text-muted-foreground">
                                    Base &amp; Adjustments
                                  </span>
                                </div>
                                <dl className="space-y-1.5 text-xs">
                                  {packageStartingPrice > 0 && (
                                    <div className="flex items-center justify-between gap-4">
                                      <dt className="text-muted-foreground">Original Package Starting Price</dt>
                                      <dd className="font-sans font-semibold tabular-nums text-foreground">
                                        {formatCurrency(packageStartingPrice)}
                                      </dd>
                                    </div>
                                  )}
                                  {removedInclusions.map((entry, idx) => (
                                    <div key={`rem-${idx}`} className="flex items-center justify-between gap-4 text-xs">
                                      <dt className="text-rose-600 flex items-center gap-1.5">
                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rose-500" />
                                        <span>Removed: {entry.name || entry}</span>
                                      </dt>
                                      <dd className="font-sans font-semibold tabular-nums text-emerald-700">
                                        − {formatCurrency(entry.deduction || 0)}
                                      </dd>
                                    </div>
                                  ))}
                                  {inclusionAdjustments.map((entry, idx) => {
                                    const amt = Number(entry.amount) || 0;
                                    return (
                                      <div key={`adj-${idx}`} className="flex items-center justify-between gap-4 text-xs">
                                        <dt className="text-muted-foreground flex items-center gap-1.5">
                                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
                                          <span>{entry.name} ({entry.quantity} instead of {entry.base_quantity})</span>
                                        </dt>
                                        <dd className={cn("font-sans font-semibold tabular-nums", amt < 0 ? "text-emerald-700" : "text-foreground")}>
                                          {amt < 0 ? "− " : "+ "}{formatCurrency(Math.abs(amt))}
                                        </dd>
                                      </div>
                                    );
                                  })}
                                  {packageFinalPrice > 0 && (
                                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-slate-100 font-bold">
                                      <dt className="text-foreground">Final Adjusted Package Price</dt>
                                      <dd className="font-sans text-sm tabular-nums text-[#1E3563]">
                                        {formatCurrency(packageFinalPrice)}
                                      </dd>
                                    </div>
                                  )}
                                </dl>
                              </div>
                            )}

                            {/* 2. SETUP & INVENTORY INCLUSIONS */}
                            {packageInclusionGroups.length > 0 && (
                              <div className="space-y-3 bg-white p-3.5 sm:p-4 rounded-xl border border-border">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                  <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-[#2C4B8A]" />
                                    <h4 className="font-bold text-xs text-foreground uppercase tracking-wider font-sans">
                                      Active Package Inclusions &amp; Setup ({totalPackageInclusionsCount} items)
                                    </h4>
                                  </div>
                                </div>

                                <div className="space-y-3">
                                  {packageInclusionGroups.map(({ category, items }) => (
                                    <div key={category} className="space-y-1.5">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                        {category}
                                      </span>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {items.map((item, idx) => (
                                          <div
                                            key={idx}
                                            className="flex items-start justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-800"
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

                            {/* 3. ITEMS REMOVED FROM DEFAULT PACKAGE */}
                            {removedInclusions.length > 0 && !showPackageBreakdown && (
                              <div className="space-y-2.5 bg-rose-50/50 p-3.5 sm:p-4 rounded-xl border border-rose-200/80">
                                <div className="flex items-center gap-2 pb-1.5 border-b border-rose-200/60">
                                  <AlertCircle className="w-4 h-4 text-rose-600" />
                                  <h4 className="font-bold text-xs text-rose-900 uppercase tracking-wider font-sans">
                                    Items Removed from Default Package ({removedInclusions.length})
                                  </h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {removedInclusions.map((entry, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white border border-rose-200 text-xs shadow-2xs"
                                    >
                                      <span className="text-rose-900 font-medium line-through">
                                        {entry.name || entry}
                                      </span>
                                      <span className="font-sans font-bold text-xs tabular-nums text-emerald-700 shrink-0">
                                        − {formatCurrency(entry.deduction || 0)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* 4. SCAFFOLD SIZE SPECIFICATIONS (IF CONFIGURED) */}
                            {resolvedScaffoldSize && (
                              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-border space-y-2 text-xs">
                                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                                  <Store className="w-4 h-4 text-[#2C4B8A]" />
                                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider font-sans">
                                    Configured Package Scaffold Size
                                  </h4>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap pt-1">
                                  <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                                    <span>{resolvedScaffoldSize.formatted}</span>
                                    {resolvedScaffoldSize.label && (
                                      <span className="text-xs text-muted-foreground font-normal">({resolvedScaffoldSize.label})</span>
                                    )}
                                  </div>
                                  {resolvedScaffoldSize.area && (
                                    <span className="text-muted-foreground font-normal">• Total Area: {resolvedScaffoldSize.area}</span>
                                  )}
                                  {resolvedScaffoldSize.capacity && (
                                    <span className="text-muted-foreground font-normal">• Optimal for {resolvedScaffoldSize.capacity}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Selected Dishes — 2 column dense grid */}
                    {booking.menu_items && booking.menu_items.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-2.5">
                          <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Selected Dishes ({booking.menu_items.length})
                          </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {booking.menu_items.map((item, idx) => {
                            const lineTotal = getItemLineTotal(item, guestCount);
                            const byQuantity = item?.pricing_type === MENU_PRICING.QUANTITY || (item?.quantity > 1 && item?.unit);
                            const qty = Number(item?.quantity) || 1;
                            const unitLabel = item?.unit || "unit";
                            const amountLabel = menuAmountLabel(item) || (byQuantity ? `${qty} ${unitLabel}` : "");

                            return (
                              <div key={idx} className="flex items-start justify-between gap-2 p-2.5 rounded-md border border-border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-foreground leading-snug">
                                    {item.name}
                                    {amountLabel && (
                                      <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                                        {amountLabel}
                                      </span>
                                    )}
                                  </p>
                                  {item.category && (
                                    <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide block mt-0.5">
                                      {item.category}
                                    </span>
                                  )}
                                  {item.note && <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.note}</p>}
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="font-sans text-xs tabular-nums font-semibold">
                                    {lineTotal > 0 ? (
                                      <span className="text-foreground font-bold">+{formatCurrency(lineTotal)}</span>
                                    ) : (
                                      <span className="text-muted-foreground font-normal text-[11px]">Included</span>
                                    )}
                                  </span>
                                  {lineTotal > 0 && byQuantity && qty > 1 && item.price > 0 && (
                                    <span className="block text-[10px] text-muted-foreground font-normal tabular-nums leading-tight mt-0.5">
                                      ({formatCurrency(item.price)}/{unitLabel})
                                    </span>
                                  )}
                                  {lineTotal > 0 && item.pricing_type === MENU_PRICING.PER_GUEST && guestCount > 1 && item.price > 0 && (
                                    <span className="block text-[10px] text-muted-foreground font-normal tabular-nums leading-tight mt-0.5">
                                      ({formatCurrency(item.price)}/guest)
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-muted/30 p-3 rounded-md text-xs text-muted-foreground flex items-center gap-2">
                        <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span>Package includes standard buffet menu set based on selected tier.</span>
                      </div>
                    )}

                    {/* Additional Service Items */}
                    {booking.service_items && booking.service_items.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <h4 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5">
                          Add-on Services & Rental Items ({booking.service_items.length})
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {booking.service_items.map((item, idx) => (
                            <div key={idx} className="p-2.5 flex items-center justify-between text-xs rounded-md border border-border bg-card">
                              <div className="min-w-0">
                                <span className="font-medium text-foreground">{item.name}</span>
                                {item.quantity > 1 && <span className="text-[11px] text-muted-foreground ml-1.5">x{item.quantity}</span>}
                              </div>
                              <span className="font-semibold text-foreground tabular-nums">{formatCurrency(item.price * (item.quantity || 1))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Special Requests / Dietary Restrictions */}
                    {(booking.special_requests || booking.dietary_restrictions || booking.allergies) && (
                      <div className="bg-amber-50/70 border border-amber-200 rounded-md p-3 space-y-1 text-xs">
                        <h4 className="font-semibold text-amber-900 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" /> Special Instructions & Dietary Notes
                        </h4>
                        {booking.dietary_restrictions && (
                          <p className="text-amber-900"><strong>Dietary Restrictions:</strong> {booking.dietary_restrictions}</p>
                        )}
                        {booking.allergies && (
                          <p className="text-amber-900"><strong>Allergies:</strong> {booking.allergies}</p>
                        )}
                        {booking.special_requests && (
                          <p className="text-amber-900"><strong>Requests:</strong> {booking.special_requests}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar Info (1 col) */}
              <div className="space-y-4">
                
                {/* Contact Person Card */}
                <Card className="border-border shadow-2xs rounded-lg">
                  <CardHeader className="border-b border-border py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" />
                      Contact Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Contact Name</p>
                      <p className="font-medium text-foreground">{booking.contact_first_name} {booking.contact_last_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Email Address</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5 mt-0.5 text-xs">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {booking.contact_email}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Mobile Phone</p>
                      <p className="font-medium text-foreground flex items-center gap-1.5 mt-0.5 text-xs">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        {booking.contact_phone}
                      </p>
                      {booking.contact_alt_phone && (
                        <p className="text-xs text-muted-foreground mt-0.5">Alt: {booking.contact_alt_phone}</p>
                      )}
                    </div>
                    {booking.contact_method && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Preferred Contact Method</p>
                        <p className="font-medium text-foreground capitalize mt-0.5">{booking.contact_method}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assigned Catering Staff Card */}
                <Card className="border-border shadow-2xs rounded-lg">
                  <CardHeader className="border-b border-border py-3 px-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-primary" />
                      {isFoodOnlyService ? "Kitchen & Dispatch Team" : "Assigned Catering Team"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {eventManager || assignedStaff.length > 0 ? (
                      <div className="space-y-2.5">
                        {eventManager && (
                          <div className="flex items-center gap-2.5 bg-muted/40 p-2.5 rounded-md border border-border">
                            <div className="w-8 h-8 bg-primary/15 text-primary rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                              {eventManager.full_name?.charAt(0) || "M"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground text-xs truncate">{eventManager.full_name || "Manager"}</p>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                                {isFoodOnlyService ? "Dispatch Lead" : "Event Manager"}
                              </Badge>
                              {eventManager.phone && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {eventManager.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                        {assignedStaff.map((staff, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 bg-card p-2.5 rounded-md border border-border">
                            <div className="w-8 h-8 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-bold text-xs shrink-0">
                              {staff.name?.charAt(0) || staff.full_name?.charAt(0) || "S"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground text-xs truncate">{staff.name || staff.full_name || "Staff"}</p>
                              <p className="text-[11px] text-muted-foreground">{staff.role || "Staff Member"}</p>
                              {staff.phone && (
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" /> {staff.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-5 px-3 bg-muted/20 rounded-md border border-dashed border-border">
                        <Users className="w-6 h-6 text-muted-foreground/40 mx-auto mb-1.5" />
                        <p className="text-xs text-muted-foreground">
                          {isFoodOnlyService
                            ? "Kitchen and delivery team will prepare and dispatch your food on the event day."
                            : "Staff and Event Manager will be assigned closer to your event date."}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

              </div>
            </div>
          </TabsContent>

          {/* TAB 2: FINANCIALS & PAYMENTS */}
          <TabsContent value="financials" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              
              {/* Itemized Price Breakdown & Actions (1 col) */}
              <Card className="border-border shadow-2xs rounded-lg lg:col-span-1">
                <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Itemized Billing Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-muted-foreground">{pkgLabelText}</span>
                    <span className="shrink-0 font-sans font-medium tabular-nums text-foreground">{formatCurrency(basePackageSubtotal)}</span>
                  </div>

                  {booking.service_items && booking.service_items.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Add-on services ({booking.service_items.length})</span>
                      <span className="shrink-0 font-sans font-medium tabular-nums text-foreground">
                        {formatCurrency(serviceItemsSubtotal)}
                      </span>
                    </div>
                  )}

                  {booking.additional_charges && booking.additional_charges.length > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Additional fees</span>
                      <span className="shrink-0 font-sans font-medium tabular-nums text-foreground">
                        {formatCurrency(additionalChargesSubtotal)}
                      </span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="shrink-0 font-sans font-medium tabular-nums text-emerald-700">− {formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-border flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">Total cost</span>
                    <span className="shrink-0 font-sans text-base font-bold tabular-nums text-foreground">{formatCurrency(grandTotal)}</span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Amount paid</span>
                    <span className="shrink-0 font-sans font-medium tabular-nums text-emerald-700">− {formatCurrency(displayPaid)}</span>
                  </div>

                  <div className="pt-2 border-t border-border flex items-center justify-between gap-3">
                    <span className="font-bold text-foreground">
                      {outstandingAmount > 0 ? "Remaining balance" : "Paid in full"}
                    </span>
                    <span className={`shrink-0 font-sans text-lg font-bold tabular-nums ${outstandingAmount > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                      {formatCurrency(outstandingAmount)}
                    </span>
                  </div>

                  {outstandingAmount > 0 && (
                    <Button
                      onClick={handlePayRemainingBalance}
                      disabled={payingPaymentId !== null}
                      className={cn("mt-2 w-full h-8 text-xs font-semibold rounded-md", ACTION_PAY)}
                    >
                      <CreditCard className="h-3.5 w-3.5" />
                      {payingPaymentId ? "Opening checkout…" : "Pay Remaining Balance"}
                    </Button>
                  )}

                  <p className="pt-2.5 border-t border-border text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">About the final total:</span>{" "}
                    Includes base package, selected add-ons, and applicable adjustments.
                  </p>
                </CardContent>
              </Card>

              {/* Transactions Table (2 cols) */}
              <Card className="border-border shadow-2xs rounded-lg lg:col-span-2">
                <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Payment Transaction History
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {paymentLoading ? (
                    <div className="py-8 text-center text-muted-foreground animate-pulse text-xs">Loading payments...</div>
                  ) : (
                    <CustomerPaymentsTable payments={bookingPayments} formatCurrency={formatCurrency} />
                  )}
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* TAB 3: STATUS & TIMELINE — booking & payment lifecycle */}
          <TabsContent value="timeline" className="space-y-4">
            <Card className="border-border shadow-2xs rounded-lg">
              <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  Activity
                </CardTitle>
                <CardDescription className="text-xs">
                  Booking and payment events, newest first.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <BookingHistoryTimeline booking={booking} payments={bookingPayments} />
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

              {/* Event Progress Step Tracker (2 cols) */}
              <Card className="border-border shadow-2xs rounded-lg lg:col-span-2">
                <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Event Execution Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {steps.map((step, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 group">
                        <div 
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 absolute -left-6 top-0 z-10 transition-colors ${
                            step.completed 
                              ? 'bg-emerald-600 text-white shadow-2xs' 
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {step.completed ? <Check className="w-3 h-3" /> : idx + 1}
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className={`font-semibold text-xs ${step.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {step.label}
                            </h4>
                            <Badge variant="outline" className={`text-[10px] py-0 px-1.5 font-normal ${step.completed ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-muted text-muted-foreground'}`}>
                              {step.date}
                            </Badge>
                          </div>
                          {step.desc && (
                            <p className="text-[11px] text-muted-foreground">{step.desc}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ocular Inspection Widget (for setup/full) OR Delivery Details Widget (for food only) */}
              <div className="space-y-4">
                {isFoodOnlyService ? (
                  <Card className="border-border shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-border py-3 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Food Delivery &amp; Drop-off
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-900">Delivery Schedule</span>
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] py-0 px-1.5 font-medium">
                            Food Drop-Off
                          </Badge>
                        </div>
                        <p className="text-slate-700 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {booking.event_date ? new Date(booking.event_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : "Date TBA"}
                        </p>
                        <p className="text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          {booking.start_time ? `Drop-off by ${booking.start_time}` : "Time TBA"}
                        </p>
                      </div>

                      <div className="space-y-1 text-slate-600">
                        <p className="font-medium text-slate-800">Drop-off Destination:</p>
                        <p className="text-[11px] text-muted-foreground">
                          {[booking.street, booking.barangay, booking.municipality, booking.province].filter(Boolean).join(", ") || "Address TBA"}
                        </p>
                        {booking.landmark && (
                          <p className="text-[11px] text-muted-foreground font-mono">Landmark: {booking.landmark}</p>
                        )}
                      </div>

                      <p className="text-[11px] text-muted-foreground pt-2 border-t border-border leading-relaxed">
                        Food will be delivered packed and warm to your location. No on-site ocular visit is needed.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border shadow-2xs rounded-lg">
                    <CardHeader className="border-b border-border py-3 px-4">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <CalendarRange className="w-4 h-4 text-primary" />
                        {isSetupOnlyService ? "Venue Setup Inspection" : "Venue Ocular Inspection"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {booking.ocular_visit && booking.ocular_visit.status === "scheduled" && (
                        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-md space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-emerald-900 text-xs">Scheduled Visit</span>
                            <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5">Scheduled</Badge>
                          </div>
                          <p className="text-xs font-semibold text-emerald-950 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                            {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()}
                          </p>
                          {booking.ocular_visit.scheduled_time && (
                            <p className="text-[11px] text-emerald-800 flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-emerald-700" />
                              {booking.ocular_visit.scheduled_time}
                            </p>
                          )}
                        </div>
                      )}

                      {pendingOcular && (
                        <div className="bg-blue-50 border border-blue-200 p-3 rounded-md space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-blue-900 text-xs">Request Sent</span>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] py-0 px-1.5">Awaiting Confirmation</Badge>
                          </div>
                          <p className="text-[11px] text-blue-800">Your requested ocular visit date is under review by admin.</p>
                          <p className="text-xs font-semibold text-blue-900">
                            Date: {new Date(booking.ocular_visit.scheduled_date).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      {booking.ocular_visit && booking.ocular_visit.status === "completed" && (
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-900 text-xs">Inspection Done</span>
                            <Badge className="bg-slate-800 text-white text-[10px] py-0 px-1.5">Completed</Badge>
                          </div>
                          <p className="text-[11px] text-slate-700">The venue layout and logistics have been verified.</p>
                        </div>
                      )}

                      {needsOcular && (
                        <div className="p-3.5 rounded-md border border-dashed border-border text-center space-y-2.5">
                          <CalendarRange className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                          <div className="space-y-0.5">
                            <p className="font-semibold text-foreground text-xs">Schedule Venue Ocular Visit</p>
                            <p className="text-[11px] text-muted-foreground leading-snug">
                              Inspect venue layout & setup requirements before your event.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setRequestingOcular(true)}
                              className="w-full text-xs font-medium border-primary/30 text-primary hover:bg-primary/5 h-8"
                            >
                              Request Ocular Visit
                            </Button>
                            {!booking.ocular_visit?.is_required && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
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
                                className="w-full text-[11px] text-slate-500 hover:text-slate-700 h-6"
                              >
                                Skip Ocular Visit
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

            </div>
          </TabsContent>

          {/* TAB 4: REVISIONS & HISTORY — what changed between versions */}
          <TabsContent value="revisions" className="space-y-4">
            <Card className="border-border shadow-2xs rounded-lg">
              <CardHeader className="border-b border-border py-3 px-4 sm:px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Revisions & History
                </CardTitle>
                <CardDescription className="text-xs">
                  What changed between versions of this booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5">
                <BookingVersionHistory booking={booking} sourceQuotation={sourceQuotation} />
              </CardContent>
            </Card>

            {sourceQuotation && (
              <Card className="border-border shadow-2xs rounded-lg">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-sans text-xs font-semibold text-foreground">Source quotation</p>
                    <p className="mt-0.5 font-sans text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {sourceQuotation.quotation.quotation_number || "Quotation"} · Version{" "}
                        {Number(sourceQuotation.quotation.version_number) || 1}.0
                      </span>
                      {sourceQuotation.quotation.status === "Accepted" &&
                        sourceQuotation.quotation.updatedAt && (
                          <> · Accepted {formatShortDate(sourceQuotation.quotation.updatedAt)}</>
                        )}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs h-8 px-3"
                    onClick={() => navigate("/customer/inquiries")}
                  >
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> View quotation
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

        </Tabs>

        {/* Modal: Revision Proposal Review */}
        <RevisionProposalModal
          open={showProposalModal}
          onClose={() => setShowProposalModal(false)}
          booking={booking}
          onAccept={handleAcceptRevision}
          onReject={handleRejectRevision}
          onCounterPropose={handleCounterPropose}
          isCustomer={true}
        />
      </div>

      {/* Add Guests Dialog */}
      <Dialog open={addingGuests} onOpenChange={setAddingGuests}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitAddGuests}>
            <DialogHeader>
              <DialogTitle>Add Guests</DialogTitle>
              <DialogDescription className="pt-2">
                You currently have <strong className="text-foreground">{booking?.guest_count}</strong> guests.
                Adding more guests costs <strong className="text-foreground">₱500 per head</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none" htmlFor="additional-guests">
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
                <div className="p-3 bg-accent/10 text-accent-foreground rounded-lg border border-accent/20 text-sm">
                  <strong className="font-semibold">Amount Due: </strong> {formatCurrency(additionalGuests * 500)}
                </div>
              )}

              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Guest additions are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddingGuests(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingGuests || additionalGuests <= 0 || !canModifyBooking}>
                {isSubmittingGuests ? "Processing..." : "Pay Difference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upgrade Package Dialog */}
      <Dialog open={upgrading} onOpenChange={setUpgrading}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={submitUpgrade}>
            <DialogHeader>
              <DialogTitle>Upgrade Package</DialogTitle>
              <DialogDescription className="pt-2">
                Current Package: <strong className="text-foreground">{booking?.package_id?.name || "Custom"}</strong>. 
                Select a new package to upgrade to.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Select New Package
                </label>
                <Select value={selectedPackageId} onValueChange={setSelectedPackageId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Choose a Package --" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map(pkg => (
                      <SelectItem key={pkg._id} value={pkg._id}>
                        {pkg.name} ({formatCurrency(pkg.price)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Upgrades are locked within 3 days of the event.
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUpgrading(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingUpgrade || !selectedPackageId || !canModifyBooking}>
                {isSubmittingUpgrade ? "Processing..." : "Pay Difference"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request / Propose Booking Changes Dialog */}
      <Dialog open={requestingChange} onOpenChange={setRequestingChange}>
        <DialogContent className="sm:max-w-[520px]">
          <form onSubmit={submitChangeRequest}>
            <DialogHeader>
              <DialogTitle>Propose Booking Changes</DialogTitle>
              <DialogDescription className="pt-1 text-xs">
                Select your desired changes or describe modifications for admin review.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Event Date (Optional)</label>
                  <Input 
                    type="date" 
                    value={changeFields.event_date} 
                    onChange={(e) => setChangeFields({ ...changeFields, event_date: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Start Time (Optional)</label>
                  <Input 
                    type="time" 
                    value={changeFields.start_time} 
                    onChange={(e) => setChangeFields({ ...changeFields, start_time: e.target.value })} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">New Guest Count (Optional)</label>
                  <Input 
                    type="number" 
                    placeholder={`Current: ${booking?.guest_count || 0}`}
                    value={changeFields.guest_count} 
                    onChange={(e) => setChangeFields({ ...changeFields, guest_count: e.target.value })} 
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Venue Location (Optional)</label>
                  <Input 
                    type="text" 
                    placeholder="e.g. Garden Hall"
                    value={changeFields.venue_type} 
                    onChange={(e) => setChangeFields({ ...changeFields, venue_type: e.target.value })} 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 block" htmlFor="booking-change-request">
                  Change Note / Reason
                </label>
                <textarea
                  id="booking-change-request"
                  className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  rows={4}
                  value={requestNote}
                  onChange={(event) => setRequestNote(event.target.value)}
                  placeholder="Describe your change request (e.g. Adding 20 guests and changing start time to 3 PM)..."
                />
              </div>

              {!canModifyBooking && (
                <div className="flex items-center gap-2 text-destructive text-xs font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Booking changes are locked within 3 days of the event.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRequestingChange(false)} className="text-xs h-8 px-3 rounded-md">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingRequest || !canModifyBooking} className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold h-8 px-3 rounded-md">
                {isSubmittingRequest ? "Sending Proposal..." : "Submit Revision Proposal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Request Ocular Date & Time Picker Modal */}
      {requestingOcular && (
        <OcularDatePickerModal
          open={requestingOcular}
          onClose={() => setRequestingOcular(false)}
          onSubmit={(date, time) => submitOcularRequest(date, time)}
          initialDate={ocularDate}
          initialTime={ocularTime}
          submitting={isSubmittingOcular}
          eventDate={booking?.event_date}
          eventTitle={booking?.event_type || "Event Venue Inspection"}
        />
      )}

      {/* Request Cancellation Dialog */}
      <Dialog open={requestingCancellation} onOpenChange={setRequestingCancellation}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-1">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <DialogTitle>Request Booking Cancellation?</DialogTitle>
            <DialogDescription className="pt-1.5 text-xs leading-relaxed text-slate-600">
              This will send a formal cancellation request to our catering management team. Any refundable amount will be calculated and processed in accordance with our event booking terms.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 space-y-1 my-2">
            <div className="font-semibold text-slate-900">Reference: {refCode}</div>
            <div>Event: {booking?.event_type || "Catering"} on {booking?.event_date ? new Date(booking.event_date).toLocaleDateString() : "TBD"}</div>
            <div>Amount Paid: {formatCurrency(displayPaid)}</div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRequestingCancellation(false)}
              disabled={isSubmittingCancellation}
              className="text-xs h-8 px-3"
            >
              Keep Booking
            </Button>
            <Button
              type="button"
              onClick={submitCancellationRequest}
              disabled={isSubmittingCancellation}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-8 px-4 rounded-md gap-1.5 cursor-pointer"
            >
              {isSubmittingCancellation ? "Submitting..." : "Confirm Cancellation Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </CustomerDashboardLayout>
  );
}
