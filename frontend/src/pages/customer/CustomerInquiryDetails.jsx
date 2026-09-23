import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import { CustomerAPI } from "../../api/customer";
import { createConversation } from "../../api/messages";
import useToast from "../../hooks/useToast";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import CustomerQuotationModal from "../../components/customer/CustomerQuotationModal";
import CustomerInquiryEditModal from "../../components/customer/CustomerInquiryEditModal";
import { getEventThumbnail } from "../../utils/eventThumbnails";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  inquiryStatusMeta,
  recordTitle,
  resolveServiceType,
} from "../../components/customer/portal/statusMeta";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatEventDateWithDay,
  formatTime,
  formatShortDate,
} from "../../utils/format";
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  MapPin,
  Truck,
  Utensils,
  Package,
  Layers,
  FileCheck2,
  CreditCard,
  Pencil,
  MessageSquare,
  FileText,
  Check,
  AlertCircle,
  Info,
  ShieldAlert,
  Phone,
  Mail,
  User,
  PartyPopper,
  Store,
  PackagePlus,
  ChevronRight,
  Eye,
  Copy,
} from "lucide-react";

// Curated mapping for theme color palettes
const PALETTE_COLORS = {
  sage: "#9CAF88",
  cream: "#FFFDD0",
  white: "#FFFFFF",
  navy: "#001F3F",
  gold: "#D4AF37",
  ivory: "#FFFFF0",
  blush: "#DE5D83",
  pink: "#FFC0CB",
  rose: "#FF007F",
  dusty: "#8A9EA7",
  blue: "#4A90E2",
  emerald: "#50C878",
  burgundy: "#800020",
  terracotta: "#E2725B",
  champagne: "#F7E7CE",
  black: "#1A1A1A",
  silver: "#C0C0C0",
  lavender: "#E6E6FA",
  peach: "#FFE5B4",
  plum: "#8E4585",
  yellow: "#FFD700",
  green: "#2E7D32",
  red: "#D32F2F",
  purple: "#7B1FA2",
};

const getPaletteColorHex = (name = "") => {
  const lower = name.toLowerCase().trim();
  for (const [key, hex] of Object.entries(PALETTE_COLORS)) {
    if (lower.includes(key)) return hex;
  }
  return "#CBD5E1";
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

// Group regular menu items by category
const categorizeMenuItems = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const groups = {};
  items.forEach((dish) => {
    const cat = dish?.category || "Special Dishes";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(dish);
  });
  return Object.entries(groups).map(([category, dishes]) => ({
    category,
    dishes,
  }));
};

// Group special offer snapshot items by menu_category
const categorizeOfferFood = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) return [];
  const groups = {};
  items.forEach((item) => {
    const cat = item?.menu_category || "Selected Courses";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  return Object.entries(groups).map(([category, dishes]) => ({
    category,
    dishes,
  }));
};

export default function CustomerInquiryDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [inquiry, setInquiry] = useState(null);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Progressive Disclosure Modal for complete selections & specs
  const [isSelectionsModalOpen, setIsSelectionsModalOpen] = useState(false);

  // Image preview modal for inspiration photos
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  // Quotation Modal State
  const [activeQuotation, setActiveQuotation] = useState(null);
  const [quotationVersions, setQuotationVersions] = useState([]);
  const [isQuotationModalOpen, setIsQuotationModalOpen] = useState(false);
  const [isLoadingQuotation, setIsLoadingQuotation] = useState(false);

  // Cancel Dialog State
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchInquiryDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [inqRes, menuRes, pkgRes] = await Promise.all([
        CustomerAPI.getInquiryById(id),
        CustomerAPI.getMenu().catch(() => ({ data: [] })),
        CustomerAPI.getPackages().catch(() => ({ data: [] })),
      ]);
      setInquiry(inqRes.data || null);
      setMenuCatalog(menuRes.data || []);
      setPackages(pkgRes.data || []);
    } catch (err) {
      notify("Failed to load inquiry details.", "error");
      navigate("/customer/inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiryDetails();
  }, [id]);

  useRealTimeRefresh(fetchInquiryDetails);

  const meta = useMemo(() => inquiryStatusMeta(inquiry), [inquiry]);

  // Resolve full package relation
  const resolvedPackage = useMemo(() => {
    if (!inquiry) return null;
    if (inquiry.package_id && typeof inquiry.package_id === "object" && inquiry.package_id.name) {
      return inquiry.package_id;
    }
    const pkgId = inquiry.package_id?._id || inquiry.package_id;
    if (pkgId && packages.length > 0) {
      const found = packages.find((p) => String(p._id) === String(pkgId));
      if (found) return found;
    }
    if (inquiry.package_name_snapshot) {
      return {
        name: inquiry.package_name_snapshot,
        description: "Standard catering & event setup package.",
        inclusions: [],
      };
    }
    return null;
  }, [inquiry, packages]);

  const hasPackage = Boolean(resolvedPackage?.name || inquiry?.package_name_snapshot || inquiry?.package_id);
  const isSpecialOffer = inquiry?.booking_type === "special" || resolvedPackage?.offer_type === "special";

  // Resolve menu items
  const resolvedMenuItems = useMemo(() => {
    if (!inquiry || !Array.isArray(inquiry.selected_menu)) return [];
    return inquiry.selected_menu.map((item) => {
      if (item && typeof item === "object" && item.name) return item;
      const found = menuCatalog.find((m) => String(m._id) === String(item));
      return found || { name: String(item), category: "Menu Item" };
    });
  }, [inquiry, menuCatalog]);

  // Resolve special offer food snapshot
  const offerFoodItems = useMemo(() => {
    if (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0) {
      return inquiry.offer_food_snapshot;
    }
    if (Array.isArray(resolvedPackage?.offer_food_items) && resolvedPackage.offer_food_items.length > 0) {
      return resolvedPackage.offer_food_items;
    }
    return [];
  }, [inquiry, resolvedPackage]);

  // Package inclusions categorized
  const packageInclusionGroups = useMemo(() => {
    return parseInclusions(resolvedPackage?.inclusions || []);
  }, [resolvedPackage]);

  // Counts for summary metrics
  const totalPackageInclusionsCount = useMemo(() => {
    return (resolvedPackage?.inclusions || []).length;
  }, [resolvedPackage]);

  const totalDishesCount = useMemo(() => {
    if (isSpecialOffer) return offerFoodItems.length;
    return resolvedMenuItems.length;
  }, [isSpecialOffer, offerFoodItems, resolvedMenuItems]);

  // Grouped dishes
  const categorizedMenu = useMemo(() => {
    return categorizeMenuItems(resolvedMenuItems);
  }, [resolvedMenuItems]);

  const categorizedSpecialOffer = useMemo(() => {
    return categorizeOfferFood(offerFoodItems);
  }, [offerFoodItems]);

  // Exact scaffold size configured for the selected package (null if not configured)
  const resolvedScaffoldSize = useMemo(() => {
    if (!resolvedPackage) return null;
    const options = Array.isArray(resolvedPackage.scaffold_size_options)
      ? resolvedPackage.scaffold_size_options
      : [];

    let option = null;
    if (inquiry?.selected_scaffold_option_id) {
      option = options.find(
        (o) => String(o._id) === String(inquiry.selected_scaffold_option_id)
      );
    }
    if (!option && inquiry?.scaffold_width && inquiry?.scaffold_length) {
      option = options.find(
        (o) =>
          Number(o.width_ft) === Number(inquiry.scaffold_width) &&
          Number(o.length_ft) === Number(inquiry.scaffold_length)
      );
    }
    if (!option && resolvedPackage.default_scaffold_option_id) {
      option = options.find(
        (o) => String(o._id) === String(resolvedPackage.default_scaffold_option_id)
      );
    }
    if (!option && options.length > 0) {
      option = options[0];
    }

    const width = inquiry?.scaffold_width || option?.width_ft;
    const length = inquiry?.scaffold_length || option?.length_ft;
    const area = inquiry?.scaffold_base_area || option?.area_ft2;
    const label = option?.label ? String(option.label).trim() : null;

    if (width && length) {
      const formatted = `${width}ft × ${length}ft`;
      const isRedundantLabel =
        label &&
        (label.toLowerCase() === `${width}x${length}` ||
          label.toLowerCase() === `${width}x${length} setup` ||
          label.toLowerCase() === `${width} × ${length}` ||
          label.toLowerCase() === `${width}ft x ${length}ft` ||
          label.toLowerCase() === `${width}ft × ${length}ft`);

      return {
        formatted,
        width,
        length,
        label: isRedundantLabel ? null : label,
        area: area ? `${area} sq.ft.` : null,
        capacity:
          option?.guest_min && option?.guest_max
            ? `${option.guest_min}–${option.guest_max} guests`
            : null,
      };
    }

    if (label) {
      return {
        formatted: label,
        width: null,
        length: null,
        label: null,
        area: area ? `${area} sq.ft.` : null,
        capacity:
          option?.guest_min && option?.guest_max
            ? `${option.guest_min}–${option.guest_max} guests`
            : null,
      };
    }

    if (area) {
      return {
        formatted: `${area} sq.ft.`,
        width: null,
        length: null,
        label: null,
        area: null,
        capacity:
          option?.guest_min && option?.guest_max
            ? `${option.guest_min}–${option.guest_max} guests`
            : null,
      };
    }

    return null;
  }, [inquiry, resolvedPackage]);

  // Actions
  const openQuotationView = async () => {
    if (!inquiry?._id) {
      notify("Inquiry details are not available.", "error");
      return;
    }
    try {
      setIsLoadingQuotation(true);
      const res = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = res.data || [];
      if (quotes.length > 0) {
        setActiveQuotation(quotes[0]);
        setQuotationVersions(quotes);
        setIsQuotationModalOpen(true);
      } else {
        notify("No quotation has been issued for this inquiry yet.", "info");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to load quotation.", "error");
    } finally {
      setIsLoadingQuotation(false);
    }
  };

  const handleOpenChat = async () => {
    if (!inquiry?._id) return;
    try {
      const conversation = await createConversation({ inquiry_id: inquiry._id });
      navigate(`/customer/messages/${conversation._id}`);
    } catch (err) {
      notify("Could not initiate chat at this moment.", "error");
    }
  };

  const startInquiryCheckout = async () => {
    if (!inquiry) return;
    try {
      const isConverted = inquiry.status === "Converted to Booking" || Boolean(inquiry.converted_booking_id);
      const isDepositPaid =
        inquiry.payment_status === "deposit_paid" ||
        inquiry.payment_status === "fully_paid" ||
        inquiry.is_deposit_paid === true;

      if (isConverted || isDepositPaid) {
        notify("The deposit payment for this inquiry has already been completed.", "info");
        if (inquiry.converted_booking_id) {
          navigate(`/customer/bookings/${inquiry.converted_booking_id}`);
        }
        return;
      }

      if (inquiry.status === "Revision Requested" || inquiry.quotation_status === "Revision Requested") {
        notify("This quotation is currently being revised. You cannot pay deposit until the updated quotation is submitted.", "warning");
        return;
      }

      notify("Generating checkout session for deposit payment...", "info");
      const qRes = await CustomerAPI.getQuotationsForInquiry(inquiry._id);
      const quotes = qRes.data || [];
      const latestQuote = quotes[0];
      const depositVal =
        Number(latestQuote?.deposit_amount) > 0
          ? Number(latestQuote.deposit_amount)
          : Number(inquiry.total_price || 0);

      if (depositVal <= 0) {
        notify("Deposit amount has not been set yet.", "error");
        return;
      }

      const checkoutRes = await CustomerAPI.createPaymentCheckout({
        inquiry_id: inquiry._id,
        amount: depositVal,
        payment_type: "deposit",
      });

      if (checkoutRes.data?.checkout_url) {
        notify("Redirecting to PayMongo checkout...", "success");
        window.location.assign(checkoutRes.data.checkout_url);
      } else {
        notify("Could not generate payment checkout URL.", "error");
      }
    } catch (err) {
      notify(err.response?.data?.message || "Failed to start deposit payment checkout.", "error");
    }
  };

  const handleCancelInquiry = async () => {
    if (!inquiry) return;
    try {
      setIsSubmittingCancel(true);
      await CustomerAPI.cancelInquiry(inquiry._id);
      notify("Inquiry has been cancelled.", "info");
      setIsCancelDialogOpen(false);
      fetchInquiryDetails();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to cancel inquiry.", "error");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (loading) {
    return (
      <CustomerDashboardLayout>
        <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
          Loading inquiry specifications...
        </div>
      </CustomerDashboardLayout>
    );
  }

  if (!inquiry) {
    return (
      <CustomerDashboardLayout>
        <div className="p-12 text-center max-w-md mx-auto">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-slate-900">Inquiry Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">The request you are trying to view does not exist or was removed.</p>
          <Button onClick={() => navigate("/customer/inquiries")} className="mt-4 bg-[#4C81E0] hover:bg-[#3b6ec6] text-white cursor-pointer shadow-2xs">
            Return to My Inquiries
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const titleStr = recordTitle(inquiry);
  const thumbnail = getEventThumbnail(inquiry) || resolvedPackage?.image_url;
  const refCode = inquiry?.reference || (typeof inquiry?._id === "string" ? `INQ-${inquiry._id.substring(0, 6).toUpperCase()}` : "INQ");

  const copyReferenceCode = () => {
    if (!refCode) return;
    navigator.clipboard?.writeText(refCode);
    notify("Reference code copied to clipboard", "success");
  };
  const isQuotationSent = inquiry.status === "Quotation Sent";
  const isConverted = inquiry.status === "Converted to Booking" || Boolean(inquiry.converted_booking_id);
  const isDepositPaid =
    inquiry.payment_status === "deposit_paid" ||
    inquiry.payment_status === "fully_paid" ||
    inquiry.is_deposit_paid === true;
  const isQuoteAcceptedAwaitingPayment =
    ["Quote Accepted", "Awaiting Final Confirmation"].includes(inquiry.status) &&
    !isDepositPaid &&
    !isConverted;
  const isUnderRevision = inquiry.status === "Revision Requested" || inquiry.quotation_status === "Revision Requested";
  const isClosedOrCancelled = ["Cancelled", "Quote Rejected", "Expired"].includes(inquiry.status);

  // Direct editing is allowed strictly according to backend CUSTOMER_EDITABLE_STATUSES
  const canEditInquiry = ["Pending Review", "Under Review"].includes(inquiry.status);

  // Add-on counts
  const serviceItemsCount = Array.isArray(inquiry.service_items) ? inquiry.service_items.length : 0;
  const additionalServicesCount = Array.isArray(inquiry.additional_services) ? inquiry.additional_services.length : 0;
  const totalAddonsCount = serviceItemsCount + additionalServicesCount;

  // Check special requests / dietary notes
  const hasDietaryOrAllergies = Boolean(
    inquiry.allergies?.trim() ||
    inquiry.dietary_restrictions?.trim() ||
    inquiry.dietary_requirements?.trim()
  );
  const hasSpecialRequests = Boolean(inquiry.special_requests?.trim());

  // Stepper definition (4 horizontal steps)
  const steps = [
    { id: "submitted", title: "Request Submitted" },
    { id: "review", title: "Pending Review" },
    { id: "quote", title: "Quotation Ready" },
    { id: "confirmed", title: "Deposit & Confirmed" },
  ];

  const getStepState = (stepId) => {
    if (isConverted || isDepositPaid) return "completed";
    if (isQuoteAcceptedAwaitingPayment) {
      if (stepId === "confirmed") return "active";
      return "completed";
    }
    if (isQuotationSent) {
      if (stepId === "quote") return "active";
      if (stepId === "confirmed") return "pending";
      return "completed";
    }
    if (["Pending Review", "Under Review", "Revision Requested"].includes(inquiry.status)) {
      if (stepId === "submitted") return "completed";
      if (stepId === "review") return "active";
      return "pending";
    }
    if (isClosedOrCancelled) {
      if (stepId === "submitted") return "completed";
      return "pending";
    }
    return stepId === "submitted" ? "active" : "pending";
  };

  // Stage explanation without invented turnaround times
  const getStageSummary = () => {
    if (isConverted || isDepositPaid) {
      return {
        title: "Event Officially Confirmed",
        description: "Your reservation deposit is confirmed and your event date is locked on our catering calendar. You can track site visits, food tasting, and final balances under My Bookings.",
        validity: null,
      };
    }
    if (isQuoteAcceptedAwaitingPayment) {
      return {
        title: "Quotation Accepted — Deposit Required",
        description: "You have accepted the quotation. Complete the required reservation deposit to officially lock your event date on our calendar.",
        validity: null,
      };
    }
    if (isQuotationSent) {
      return {
        title: "Official Quotation Ready for Review",
        description: "Our catering team has finalized your itemized proposal. Review the menu selections, event setup, and service inclusions to accept or request adjustments.",
        validity: inquiry.quotation_expiration_date ? `Quote valid until ${formatShortDate(inquiry.quotation_expiration_date)}` : null,
      };
    }
    if (isUnderRevision) {
      return {
        title: "Quotation Revision in Progress",
        description: "Our catering coordinator is updating your quotation with your requested changes and will submit an updated proposal.",
        validity: null,
      };
    }
    if (isClosedOrCancelled) {
      return {
        title: "Inquiry Closed",
        description: "This inquiry is no longer active. Feel free to submit a new inquiry or explore our catering packages anytime.",
        validity: null,
      };
    }
    // Default: Pending Review / Under Review
    return {
      title: inquiry.status === "Under Review" ? "Inquiry Under Review" : "Inquiry Received — Pending Review",
      description: "Our catering coordinators are reviewing your specifications, venue logistics, and kitchen schedule to prepare your custom quotation.",
      validity: null,
    };
  };

  const stageSummary = getStageSummary();

  // Primary contextual action (single, prioritized)
  let primaryAction = null;
  if (isQuotationSent) {
    primaryAction = (
      <Button
        onClick={openQuotationView}
        disabled={isLoadingQuotation}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer gap-1.5 shadow-2xs transition-all active:scale-95"
      >
        <FileCheck2 className="w-3.5 h-3.5" />
        <span>Review Official Quotation</span>
      </Button>
    );
  } else if (isQuoteAcceptedAwaitingPayment) {
    primaryAction = (
      <Button
        onClick={startInquiryCheckout}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs transition-all active:scale-95 gap-1.5"
      >
        <CreditCard className="w-3.5 h-3.5" />
        <span>Pay Deposit Now</span>
      </Button>
    );
  } else if (isConverted && inquiry.converted_booking_id) {
    const bId = String(inquiry.converted_booking_id?._id || inquiry.converted_booking_id);
    primaryAction = (
      <Button
        onClick={() => navigate(`/customer/bookings/${bId}`)}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs transition-all active:scale-95 gap-1"
      >
        <span>Go to Confirmed Booking</span>
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    );
  } else if (canEditInquiry) {
    primaryAction = (
      <Button
        variant="outline"
        onClick={() => setIsEditModalOpen(true)}
        className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer transition-all gap-1.5"
      >
        <Pencil className="w-3.5 h-3.5 text-slate-400" />
        <span>Edit Request</span>
      </Button>
    );
  } else if (isUnderRevision) {
    primaryAction = (
      <Button
        variant="outline"
        onClick={openQuotationView}
        disabled={isLoadingQuotation}
        className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer transition-all gap-1.5"
      >
        <FileText className="w-3.5 h-3.5 text-slate-400" />
        <span>View Quotation</span>
      </Button>
    );
  } else if (isClosedOrCancelled) {
    primaryAction = (
      <Button
        onClick={() => navigate("/packages")}
        className="bg-[#4C81E0] hover:bg-[#3b6ec6] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs transition-all active:scale-95"
      >
        <span>Browse Packages</span>
      </Button>
    );
  }

  // Secondary Action: Message Coordinator
  const secondaryAction = !isClosedOrCancelled ? (
    <Button
      variant="outline"
      onClick={handleOpenChat}
      className="border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-[#4C81E0] font-semibold text-xs h-9 px-3.5 rounded-lg cursor-pointer transition-all gap-1.5"
    >
      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
      <span>Message Coordinator</span>
    </Button>
  ) : null;

  return (
    <CustomerDashboardLayout fullBleed>
      <div className="flex-1 overflow-y-auto bg-white px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 font-sans antialiased text-slate-900">
          {/* BACK NAVIGATION */}
          <div>
            <button
              type="button"
              onClick={() => navigate("/customer/inquiries")}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#4C81E0] focus-visible:text-[#4C81E0] focus-visible:outline-none transition-colors cursor-pointer w-fit p-0 m-0 bg-transparent border-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
              <span>Back to My Inquiries</span>
            </button>
          </div>

          {/* HEADER: IDENTITY, STATUS & ACTIONS (CARDLESS ON WHITE CANVAS) */}
          <div className="pb-6 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="flex items-start gap-4 min-w-0">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={titleStr}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                  <Utensils className="w-7 h-7 opacity-80" />
                </div>
              )}

              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight truncate">
                    {titleStr}
                  </h1>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded text-xs font-semibold border inline-flex items-center gap-1.5 shrink-0 select-none",
                      meta.tone === "success"
                        ? "bg-emerald-50/80 text-emerald-800 border-emerald-200/80"
                        : meta.tone === "warning"
                        ? "bg-amber-50/80 text-amber-800 border-amber-200/80"
                        : meta.tone === "danger"
                        ? "bg-rose-50/80 text-rose-800 border-rose-200/80"
                        : meta.tone === "info"
                        ? "bg-blue-50/80 text-[#4C81E0] border-blue-200/80"
                        : "bg-slate-100 text-slate-600 border-slate-200/80"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {meta.label}
                  </span>
                </div>

                {/* Priority Row: Date, Guests, Package, Service Type, Reference */}
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-xs text-slate-600 font-medium">
                  <span className="flex items-center gap-1.5 font-bold text-slate-900">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {inquiry.event_date ? formatEventDateWithDay(inquiry.event_date) : "Date TBD"}
                    {inquiry.start_time && (
                      <span className="font-normal text-slate-500">· {formatTime(inquiry.start_time)}</span>
                    )}
                  </span>

                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{inquiry.guest_count ? `${inquiry.guest_count} guests` : "Guests TBD"}</span>
                  </span>

                  {(resolvedPackage?.name || inquiry.package_name_snapshot) && (
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate max-w-[220px] font-semibold text-slate-800">
                        {resolvedPackage?.name || inquiry.package_name_snapshot}
                      </span>
                    </span>
                  )}

                  {resolveServiceType(inquiry) && (
                    <span className="flex items-center gap-1.5 text-slate-500">
                      <Utensils className="w-3.5 h-3.5 text-slate-400" />
                      <span>{resolveServiceType(inquiry)}</span>
                    </span>
                  )}

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
            </div>

            {/* SINGLE CONTEXTUAL ACTION BAR */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 self-start lg:self-center">
              {primaryAction}
              {secondaryAction}
            </div>
          </div>

          {/* COMPACT STATUS STEPPER & STAGE SUMMARY */}
          <div className="rounded-xl border border-blue-100/70 bg-blue-50/30 p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-[#4C81E0]" />
                <span>Inquiry Progress</span>
              </div>
              {stageSummary.validity && (
                <span className="text-xs text-slate-500 font-medium">{stageSummary.validity}</span>
              )}
            </div>

            {/* Stepper horizontal line and steps */}
            <div className="relative pt-2 pb-1 px-2 sm:px-4">
              {/* Connecting track line */}
              <div className="absolute top-[21px] left-6 right-6 sm:left-10 sm:right-10 h-0.5 bg-slate-200 z-0" />
              <div className="grid grid-cols-4 gap-2 relative z-10">
                {steps.map((step, idx) => {
                  const state = getStepState(step.id);
                  const isDone = state === "completed";
                  const isCurrent = state === "active";

                  return (
                    <div key={step.id} className="flex flex-col items-center text-center">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all relative z-10",
                          isDone
                            ? "bg-[#4C81E0] text-white shadow-2xs"
                            : isCurrent
                            ? "bg-[#4C81E0] text-white ring-4 ring-blue-100 shadow-2xs"
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
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage explanation */}
            <div className="pt-2.5 border-t border-blue-100/60 flex items-start gap-2.5 text-xs text-slate-600">
              <Info className="w-4 h-4 text-[#4C81E0] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-900">{stageSummary.title}: </span>
                <span>{stageSummary.description}</span>
              </div>
            </div>
          </div>

          {/* TWO-COLUMN DASHBOARD LAYOUT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT MAIN AREA (col-span-2) - Cardless sections on pure white canvas */}
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
                  {resolveServiceType(inquiry) && (
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                      {resolveServiceType(inquiry)}
                    </span>
                  )}
                </div>

                {/* Event core specifications: Clean 2-column label/value grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block">Event Type &amp; Celebration</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {inquiry.event_type || "Event Celebration"}
                    </div>
                    {inquiry.celebrant_name && (
                      <div className="text-xs text-slate-600 flex items-center gap-1 pt-1">
                        <PartyPopper className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Celebrant: <strong className="text-slate-800">{inquiry.celebrant_name}</strong></span>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Expected Attendance</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inquiry.guest_count ? `${inquiry.guest_count} guests` : "Guests TBD"}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Event Date</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {formatEventDateWithDay(inquiry.event_date)}
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 font-medium block">Schedule &amp; Duration</span>
                    <div className="font-bold text-slate-900 text-sm mt-0.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inquiry.start_time ? formatTime(inquiry.start_time) : "Time TBD"}</span>
                      {inquiry.duration_hours && (
                        <span className="text-slate-500 font-normal">
                          ({inquiry.duration_hours} {inquiry.duration_hours === 1 ? "hour" : "hours"})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Venue Location & Logistics */}
                <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#4C81E0]" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Venue Location &amp; Staging</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                    <div>
                      <span className="text-slate-500 font-medium block">Destination Address</span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {[
                          inquiry.street,
                          inquiry.barangay,
                          inquiry.municipality,
                          inquiry.province,
                          inquiry.zip_code,
                        ]
                          .filter(Boolean)
                          .join(", ") ||
                          inquiry.venue_address ||
                          "Address to be coordinated with our team"}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-medium block">Venue Classification</span>
                      <div className="font-semibold text-slate-900 mt-0.5">
                        {inquiry.venue_type || "Standard Venue"}
                        {inquiry.landmark && (
                          <span className="text-slate-500 font-normal"> · Landmark: {inquiry.landmark}</span>
                        )}
                      </div>
                    </div>

                    {inquiry.delivery_method && (
                      <div className="sm:col-span-2">
                        <span className="text-slate-500 font-medium block">Delivery &amp; Setup Method</span>
                        <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="capitalize">{inquiry.delivery_method === "setup" ? "On-site Setup & Catering" : inquiry.delivery_method}</span>
                          {inquiry.delivery_instructions && (
                            <span className="text-slate-500 font-normal"> — Note: {inquiry.delivery_instructions}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Theme & Palette */}
                {(inquiry.event_theme || (Array.isArray(inquiry.event_palette) && inquiry.event_palette.length > 0)) && (
                  <div className="pt-4 border-t border-slate-100 space-y-2 text-xs">
                    <span className="text-slate-500 font-medium block">Styling Motif &amp; Color Palette</span>
                    <div className="flex items-center gap-3 flex-wrap">
                      {inquiry.event_theme && (
                        <span className="font-bold text-slate-900 text-sm">
                          {inquiry.event_theme}
                        </span>
                      )}
                      {Array.isArray(inquiry.event_palette) && inquiry.event_palette.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {inquiry.event_palette.map((color, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium"
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-slate-300"
                                style={{ backgroundColor: getPaletteColorHex(color) }}
                              />
                              <span>{color}</span>
                              {i < inquiry.event_palette.length - 1 && <span className="text-slate-300">·</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: PACKAGE & SELECTIONS (Cardless, separated by spacing and subtle divider) */}
              <div className="pt-6 border-t border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#4C81E0]">
                      Menu &amp; Selections
                    </span>
                    <h2 className="text-base font-bold text-slate-900">Package &amp; Selections</h2>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200/80">
                    {isSpecialOffer ? "Special Offer Combo" : hasPackage ? "Catering Package" : "Custom Food Selection"}
                  </span>
                </div>

                {/* Package Identity & Counts */}
                <div className="space-y-3">
                  <div>
                    <div className="font-bold text-base text-slate-900">
                      {resolvedPackage?.name || inquiry.package_name_snapshot || "Custom Menu Selections"}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {resolvedPackage?.description || "Curated catering selections tailored for your event."}
                    </p>
                  </div>

                  {/* Low-opacity tinted summary banner for counts */}
                  <div className="rounded-xl border border-blue-100/80 bg-blue-50/30 p-3 sm:p-3.5 flex items-center gap-x-3.5 gap-y-1.5 flex-wrap text-xs text-slate-600">
                    {totalDishesCount > 0 && (
                      <span className="inline-flex items-center gap-1.5">
                        <Utensils className="w-3.5 h-3.5 text-[#4C81E0]" />
                        <span><strong className="text-slate-900 font-semibold">{totalDishesCount}</strong> dishes selected</span>
                      </span>
                    )}

                    {totalPackageInclusionsCount > 0 && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-[#4C81E0]" />
                          <span><strong className="text-slate-900 font-semibold">{totalPackageInclusionsCount}</strong> setup inclusions</span>
                        </span>
                      </>
                    )}

                    {totalAddonsCount > 0 && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-1.5">
                          <PackagePlus className="w-3.5 h-3.5 text-[#4C81E0]" />
                          <span><strong className="text-slate-900 font-semibold">{totalAddonsCount}</strong> add-on items</span>
                        </span>
                      </>
                    )}

                    {resolvedScaffoldSize && (
                      <>
                        <span className="text-slate-300 hidden sm:inline">•</span>
                        <span className="inline-flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5 text-[#4C81E0]" />
                          <span><strong className="text-slate-900 font-semibold">{resolvedScaffoldSize.formatted}</strong> scaffold</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Declared dietary or allergy alert if present */}
                {hasDietaryOrAllergies && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      {inquiry.allergies && (
                        <div><strong>Declared Allergies:</strong> {inquiry.allergies}</div>
                      )}
                      {(inquiry.dietary_restrictions || inquiry.dietary_requirements) && (
                        <div><strong>Dietary Preferences:</strong> {inquiry.dietary_restrictions || inquiry.dietary_requirements}</div>
                      )}
                    </div>
                  </div>
                )}

                {hasSpecialRequests && (
                  <div className="text-xs text-slate-600 pt-1">
                    <span className="font-semibold text-slate-800">Special Requests: </span>
                    <span className="text-slate-600">{inquiry.special_requests}</span>
                  </div>
                )}

                {/* Progressive disclosure action */}
                <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-slate-500">
                    Review complete dish choices, equipment inclusions, and setup details.
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSelectionsModalOpen(true)}
                    className="border-slate-200 hover:border-[#4C81E0] text-slate-800 hover:text-[#4C81E0] bg-white hover:bg-slate-50 font-semibold text-xs h-8.5 px-3.5 rounded-lg gap-1.5 cursor-pointer transition-all"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#4C81E0]" />
                    <span>View Selections &amp; Details</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR COLUMN (col-span-1) - Preserved Functional Cards */}
            <div className="space-y-5">
              {/* FUNCTIONAL CARD 1: QUOTATION & PRICING */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-sans flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-[#4C81E0]" /> Quotation &amp; Pricing
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                    {inquiry.quotation_status || (isQuotationSent ? "Quote Ready" : "Pending Pricing")}
                  </span>
                </div>

                {/* Pricing Content */}
                {isQuotationSent || inquiry.total_price > 0 ? (
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-xs text-slate-500 block">Total Quoted Cost</span>
                      <span className="text-2xl font-bold text-slate-900 font-sans tracking-tight">
                        {formatCurrency(inquiry.total_price)}
                      </span>
                    </div>

                    {inquiry.deposit_amount > 0 && (
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between text-xs">
                        <span className="text-slate-500">Required Deposit</span>
                        <span className="font-semibold text-emerald-700 font-sans tabular-nums">
                          {formatCurrency(inquiry.deposit_amount)}
                        </span>
                      </div>
                    )}

                    {inquiry.quotation_expiration_date && (
                      <div className="text-[11px] text-slate-500 pt-0.5">
                        Quote valid until: {formatShortDate(inquiry.quotation_expiration_date)}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={openQuotationView}
                        disabled={isLoadingQuotation}
                        className="text-xs font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>View itemized quotation proposal</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Subordinate state when pricing is pending */
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-slate-700">Pricing in Progress</div>
                    <p className="text-slate-500 leading-relaxed">
                      Our catering team is reviewing your menu choices, venue setup, and guest count to finalize an itemized proposal.
                    </p>

                    {inquiry.estimated_total > 0 && (
                      <div className="pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex items-baseline justify-between">
                          <span className="text-slate-500">Preliminary estimate</span>
                          <span className="font-semibold text-slate-800 font-sans tabular-nums">
                            ~{formatCurrency(inquiry.estimated_total)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Non-binding estimate. Official pricing confirmed upon quote delivery.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* FUNCTIONAL CARD 2: CATERING TEAM & SUPPORT */}
              <div className="rounded-xl border border-slate-200/90 bg-white p-5 space-y-3.5">
                <div className="border-b border-slate-100 pb-2.5">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide font-sans flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#4C81E0]" /> Catering Team &amp; Support
                  </h3>
                </div>

                {/* Team & Messaging */}
                <div className="space-y-2 text-xs">
                  <div className="font-semibold text-slate-900">
                    Caezelle Event Coordination Desk
                  </div>
                  <p className="text-slate-500 leading-relaxed">
                    Have questions about venue setup, tasting sessions, or menu adjustments? Message your coordinator anytime.
                  </p>

                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={handleOpenChat}
                      className="text-xs font-semibold text-[#4C81E0] hover:underline inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message your coordinator</span>
                    </button>
                  </div>
                </div>

                {/* Registered customer contact on file */}
                <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <span className="text-slate-500 font-medium block">Customer Contact on File</span>
                  <div className="font-semibold text-slate-900">
                    {inquiry.contact_first_name} {inquiry.contact_last_name}
                  </div>
                  {inquiry.contact_phone && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{inquiry.contact_phone}</span>
                    </div>
                  )}
                  {inquiry.contact_email && (
                    <div className="flex items-center gap-1.5 text-slate-600 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{inquiry.contact_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* DESTRUCTIVE CANCEL ACTION (DISCREET & VISUALLY SEPARATED) */}
              {!isConverted && !isClosedOrCancelled && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer transition-colors p-1"
                  >
                    Cancel this inquiry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* PROGRESSIVE DISCLOSURE: SELECTIONS & DETAILS DIALOG */}
      <Dialog open={isSelectionsModalOpen} onOpenChange={setIsSelectionsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto p-6 sm:p-7 rounded-2xl">
          <DialogHeader className="border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#4C81E0]" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Selections &amp; Package Details
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {resolvedPackage?.name || inquiry.package_name_snapshot || "Custom Catering Selections"} • {inquiry.guest_count ? `${inquiry.guest_count} guests` : "Guests TBD"} • {resolveServiceType(inquiry)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-3 text-xs">
            {/* 1. DISHES & MENU SELECTIONS */}
            {isSpecialOffer ? (
              categorizedSpecialOffer.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Utensils className="w-4 h-4 text-[#4C81E0]" />
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                      Included Combo Dishes ({offerFoodItems.length})
                    </h4>
                  </div>

                  <div className="space-y-3">
                    {categorizedSpecialOffer.map(({ category, dishes }) => (
                      <div key={category} className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-700 block">
                          {category}
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dishes.map((d, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-800"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{d.item_name || d.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ) : (
              categorizedMenu.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                    <Utensils className="w-4 h-4 text-[#4C81E0]" />
                    <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                      Selected Menu Dishes ({resolvedMenuItems.length})
                    </h4>
                  </div>

                  <div className="space-y-4">
                    {categorizedMenu.map(({ category, dishes }) => (
                      <div key={category} className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-700 block">
                          {category} ({dishes.length})
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {dishes.map((dish, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50 border border-slate-200/80"
                            >
                              {dish.image_url ? (
                                <img
                                  src={dish.image_url}
                                  alt={dish.name}
                                  className="w-10 h-10 rounded object-cover border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-[#4C81E0] shrink-0">
                                  <Utensils className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 text-xs truncate">{dish.name}</div>
                                {dish.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                                    {dish.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {/* 2. SETUP & INCLUSIONS */}
            {packageInclusionGroups.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Layers className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Package Inclusions &amp; Equipment ({totalPackageInclusionsCount})
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
                            className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="leading-snug">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. SCAFFOLD SIZE SPECIFICATIONS */}
            {resolvedScaffoldSize && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Store className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Configured Scaffold Specifications
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

            {/* 4. ADD-ONS & EXTRA SERVICES */}
            {totalAddonsCount > 0 && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <PackagePlus className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Add-ons &amp; Extra Services ({totalAddonsCount})
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Array.isArray(inquiry.service_items) &&
                    inquiry.service_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200/80"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">{item.name}</div>
                          {item.quantity && (
                            <div className="text-slate-500 text-[11px]">Qty: {item.quantity}</div>
                          )}
                        </div>
                        {item.price > 0 ? (
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(item.price)}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px]">Quoted in proposal</div>
                        )}
                      </div>
                    ))}

                  {Array.isArray(inquiry.additional_services) &&
                    inquiry.additional_services.map((serv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 font-medium text-slate-900"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{serv}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* 5. CUSTOM STYLING & INSPIRATION PHOTOS */}
            {(inquiry.custom_setup_notes || (Array.isArray(inquiry.inspiration_images) && inquiry.inspiration_images.length > 0)) && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Info className="w-4 h-4 text-[#4C81E0]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                    Custom Styling &amp; Inspiration
                  </h4>
                </div>

                {inquiry.custom_setup_notes && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/80">
                    {inquiry.custom_setup_notes}
                  </p>
                )}

                {Array.isArray(inquiry.inspiration_images) && inquiry.inspiration_images.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-semibold text-slate-600">Uploaded Inspiration Photos</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {inquiry.inspiration_images.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedPhoto(imgUrl)}
                          className="aspect-square rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer"
                        >
                          <img
                            src={imgUrl}
                            alt={`Inspiration ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-semibold">
                            View photo
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* REUSED QUOTATION MODAL */}
      {isQuotationModalOpen && activeQuotation && (
        <CustomerQuotationModal
          open={isQuotationModalOpen}
          onClose={() => {
            setIsQuotationModalOpen(false);
            setActiveQuotation(null);
          }}
          quotation={activeQuotation}
          versions={quotationVersions}
          inquiry={inquiry}
          onUpdated={fetchInquiryDetails}
        />
      )}

      {/* REUSED EDIT INQUIRY MODAL */}
      {isEditModalOpen && (
        <CustomerInquiryEditModal
          open={isEditModalOpen}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          inquiry={inquiry}
          onSaved={fetchInquiryDetails}
        />
      )}

      {/* PHOTO PREVIEW MODAL */}
      {selectedPhoto && (
        <Dialog open={Boolean(selectedPhoto)} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-none rounded-2xl overflow-hidden">
            <img
              src={selectedPhoto}
              alt="Inspiration preview"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* CANCEL INQUIRY CONFIRMATION MODAL */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">Cancel Inquiry Request?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to cancel this event inquiry? You can submit a new request anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCancelDialogOpen(false)}
              className="text-xs font-semibold rounded-lg"
            >
              Keep Inquiry
            </Button>
            <Button
              size="sm"
              onClick={handleCancelInquiry}
              disabled={isSubmittingCancel}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg"
            >
              {isSubmittingCancel ? "Cancelling..." : "Confirm Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </CustomerDashboardLayout>
  );
}
