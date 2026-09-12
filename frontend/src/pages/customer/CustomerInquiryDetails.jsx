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
  formatEventDate,
  formatEventDateWithDay,
  formatTime,
  formatShortDate,
} from "../../utils/format";
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  FileCheck2,
  CreditCard,
  XCircle,
  Pencil,
  Clock,
  CheckCircle2,
  Check,
  MapPin,
  Users,
  Calendar,
  Utensils,
  UtensilsCrossed,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Package,
  Layers,
  Phone,
  Mail,
  User,
  Info,
  AlertCircle,
  Sparkles,
  Palette,
  Tag,
  Store,
  Truck,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  PartyPopper,
  Image as ImageIcon,
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

  // Collapsible Package Accordion State
  const [isPackageExpanded, setIsPackageExpanded] = useState(false);

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

  // Counts for summary pill
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

    // Priority 1: Option selected in inquiry
    let option = null;
    if (inquiry?.selected_scaffold_option_id) {
      option = options.find(
        (o) => String(o._id) === String(inquiry.selected_scaffold_option_id)
      );
    }

    // Priority 2: Option matching width/length on inquiry
    if (!option && inquiry?.scaffold_width && inquiry?.scaffold_length) {
      option = options.find(
        (o) =>
          Number(o.width_ft) === Number(inquiry.scaffold_width) &&
          Number(o.length_ft) === Number(inquiry.scaffold_length)
      );
    }

    // Priority 3: Package configured default scaffold option
    if (!option && resolvedPackage.default_scaffold_option_id) {
      option = options.find(
        (o) => String(o._id) === String(resolvedPackage.default_scaffold_option_id)
      );
    }

    // Priority 4: First configured scaffold option of the package
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
          Loading full inquiry specifications...
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
          <Button onClick={() => navigate("/customer/inquiries")} className="mt-4 bg-[#2C4B8A] text-white">
            Return to My Inquiries
          </Button>
        </div>
      </CustomerDashboardLayout>
    );
  }

  const titleStr = recordTitle(inquiry);
  const thumbnail = getEventThumbnail(inquiry) || resolvedPackage?.image_url;
  const refCode = inquiry.reference || `INQ-${inquiry._id.substring(0, 6).toUpperCase()}`;
  const isQuotationSent = inquiry.status === "Quotation Sent";
  const isConverted = inquiry.status === "Converted to Booking" || Boolean(inquiry.converted_booking_id);
  const isDepositPaid =
    inquiry.payment_status === "deposit_paid" ||
    inquiry.payment_status === "fully_paid" ||
    inquiry.is_deposit_paid === true;

  // 4-Step Journey Stepper
  const steps = [
    {
      id: "submitted",
      title: "Request Submitted",
      desc: "Event inquiry received",
      status: "completed",
    },
    {
      id: "review",
      title: "Pending review",
      desc: "Preparing pricing & venue check",
      status: ["Pending Review", "Under Review", "Revision Requested", "Quotation Sent", "Quote Accepted", "Converted to Booking"].includes(inquiry.status)
        ? inquiry.status === "Pending Review" || inquiry.status === "Under Review" || inquiry.status === "Revision Requested"
          ? "active"
          : "completed"
        : "pending",
    },
    {
      id: "quote",
      title: "Quotation ready",
      desc: "Proposal ready for review",
      status: isQuotationSent
        ? "active"
        : ["Quote Accepted", "Awaiting Final Confirmation", "Converted to Booking"].includes(inquiry.status) || isDepositPaid
        ? "completed"
        : "pending",
    },
    {
      id: "confirmed",
      title: "Deposit & Reservation",
      desc: "Event date locked",
      status: isConverted || isDepositPaid
        ? "completed"
        : inquiry.status === "Quote Accepted"
        ? "active"
        : "pending",
    },
  ];

  // Check if there are special requests / dietary needs to display
  const hasSpecialRequests = Boolean(
    inquiry.special_requests?.trim() ||
    inquiry.allergies?.trim() ||
    inquiry.dietary_restrictions?.trim() ||
    inquiry.dietary_requirements?.trim()
  );

  // Check if add-ons exist
  const hasAddons = (Array.isArray(inquiry.service_items) && inquiry.service_items.length > 0) ||
    (Array.isArray(inquiry.additional_services) && inquiry.additional_services.length > 0);

  // Check if custom setup / inspiration exists
  const hasCustomSetupOrInspiration = Boolean(
    inquiry.is_custom_setup ||
    inquiry.custom_setup_notes?.trim() ||
    (Array.isArray(inquiry.custom_setup_scope) && inquiry.custom_setup_scope.length > 0) ||
    (Array.isArray(inquiry.inspiration_images) && inquiry.inspiration_images.length > 0)
  );

  return (
    <CustomerDashboardLayout>
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 font-sans antialiased">
        {/* TOP BAR / BACK NAVIGATION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/customer/inquiries")}
            className="text-xs font-semibold text-[#2C4B8A] gap-1.5 p-0 hover:bg-transparent cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Inquiries
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenChat}
              className="text-xs font-semibold border-slate-200 text-slate-700 hover:border-[#2C4B8A] hover:text-[#2C4B8A] gap-1.5 h-8 px-3 rounded-lg cursor-pointer shadow-2xs transition-all"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#2C4B8A]" /> Message Coordinator
            </Button>

            {["Pending Review", "Under Review"].includes(inquiry.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                className="text-xs font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 gap-1.5 h-8 px-3 rounded-lg cursor-pointer shadow-2xs"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-500" /> Edit Request
              </Button>
            )}
          </div>
        </div>

        {/* SECTION A: INQUIRY HEADER HERO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={titleStr}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#2C4B8A]/10 to-blue-100/60 border border-[#2C4B8A]/20 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                  <Utensils className="w-8 h-8 opacity-80" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight truncate">
                    {titleStr}
                  </h1>
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-xs font-bold border tracking-tight inline-flex items-center gap-1.5 shadow-2xs",
                      meta.tone === "success"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : meta.tone === "warning"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : meta.tone === "info"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    )}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    {meta.label}
                  </span>
                </div>

                {/* Subtitle with event core details & submission date */}
                <div className="text-xs text-slate-600 font-medium mt-1.5 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-[#2C4B8A]" />
                    {formatEventDateWithDay(inquiry.event_date)}
                  </span>
                  {inquiry.start_time && (
                    <span>• {formatTime(inquiry.start_time)}</span>
                  )}
                  <span>•</span>
                  <span className="flex items-center gap-1 text-slate-700 font-semibold">
                    <Users className="w-3.5 h-3.5 text-[#2C4B8A]" />
                    {inquiry.guest_count ? `${inquiry.guest_count} guests` : "Guests TBD"}
                  </span>
                  {inquiry.service_type && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500">{inquiry.service_type}</span>
                    </>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                  <span className="font-mono font-medium">Ref. #{refCode}</span>
                  {inquiry.createdAt && (
                    <span>Submitted on {formatShortDate(inquiry.createdAt)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Button in Header */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
              {isQuotationSent && (
                <Button
                  onClick={openQuotationView}
                  disabled={isLoadingQuotation}
                  className="bg-[#1E3563] hover:bg-[#152547] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
                >
                  <FileCheck2 className="w-4 h-4" />
                  <span>Review Official Quote</span>
                </Button>
              )}

              {inquiry.total_price > 0 && !isConverted && !isDepositPaid && inquiry.status !== "Cancelled" && (
                <Button
                  onClick={startInquiryCheckout}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs transition-all active:scale-[0.98]"
                >
                  <CreditCard className="w-4 h-4 mr-1.5" /> Pay Deposit
                </Button>
              )}

              {isConverted && inquiry.converted_booking_id && (
                <Button
                  onClick={() => navigate(`/customer/bookings/${inquiry.converted_booking_id}`)}
                  className="bg-[#2C4B8A] hover:bg-[#1E3563] text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-2xs transition-all"
                >
                  Go to Confirmed Booking <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Action Required / Status Notice Banner */}
          {meta.notice && (
            <div
              className={cn(
                "p-3.5 rounded-xl border flex items-start gap-3 text-xs leading-relaxed",
                meta.notice.tone === "info"
                  ? "bg-blue-50/80 border-blue-200 text-blue-900"
                  : meta.notice.tone === "warning"
                  ? "bg-amber-50/80 border-amber-200 text-amber-900"
                  : meta.notice.tone === "success"
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              )}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-current opacity-80" />
              <div>
                <div className="font-bold font-sans">{meta.notice.title}</div>
                <div className="mt-0.5 text-[11px] opacity-90 leading-normal">{meta.notice.text}</div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION B: INQUIRY PROGRESS TIMELINE */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2C4B8A]" /> Inquiry Progress Timeline
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Ref: #{refCode}</span>
          </div>

          <div className="relative pt-3 pb-2 px-2 sm:px-6">
            {/* Connecting Background Line */}
            <div className="absolute top-7 left-8 right-8 h-0.5 bg-slate-200 -z-0" />

            {/* Steps Container */}
            <div className="grid grid-cols-4 gap-2 relative z-10">
              {steps.map((step, idx) => {
                const isDone = step.status === "completed";
                const isCurrent = step.status === "active";

                return (
                  <div key={step.id} className="flex flex-col items-center text-center group">
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
                        {step.title}
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

        {/* SECTION C & D: MAIN CONTENT TWO-COLUMN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT MAIN SPECIFICATIONS COLUMN (lg:col-span-2) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. EVENT & VENUE SPECIFICATIONS */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#2C4B8A]" /> Event &amp; Venue Specifications
                </h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-[#1E3563] border border-blue-100">
                  {resolveServiceType(inquiry)}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                {/* Event Type & Celebration */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Event Type
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {inquiry.event_type || "Event Celebration"}
                  </div>
                  {inquiry.celebrant_name && (
                    <div className="text-[11px] text-blue-700 font-medium flex items-center gap-1 pt-0.5">
                      <PartyPopper className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>Celebrant / Honoree: <strong>{inquiry.celebrant_name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Guest Count */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Guest Count
                  </span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-[#2C4B8A]" />
                    <span>{inquiry.guest_count ? `${inquiry.guest_count} guests` : "Guests TBD"}</span>
                  </div>
                </div>

                {/* Event Date & Time */}
                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Event Date
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {formatEventDateWithDay(inquiry.event_date)}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                    Schedule &amp; Duration
                  </span>
                  <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#2C4B8A]" />
                    <span>{inquiry.start_time ? formatTime(inquiry.start_time) : "Time TBD"}</span>
                    {inquiry.duration_hours && (
                      <span className="text-xs text-slate-500 font-normal">
                        ({inquiry.duration_hours} {inquiry.duration_hours === 1 ? "hour" : "hours"})
                      </span>
                    )}
                  </div>
                </div>

                {/* Event Theme & Palette */}
                {(inquiry.event_theme || (Array.isArray(inquiry.event_palette) && inquiry.event_palette.length > 0)) && (
                  <div className="space-y-1.5 sm:col-span-2 pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider">
                      Theme &amp; Styling Motif
                    </span>
                    <div className="flex items-center gap-3 flex-wrap">
                      {inquiry.event_theme && (
                        <span className="font-bold text-slate-900 text-sm">
                          {inquiry.event_theme}
                        </span>
                      )}
                      {Array.isArray(inquiry.event_palette) && inquiry.event_palette.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {inquiry.event_palette.map((color, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs"
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-2xs"
                                style={{ backgroundColor: getPaletteColorHex(color) }}
                              />
                              <span>{color}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Complete Venue & Location Breakdown */}
                <div className="space-y-1.5 sm:col-span-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 font-semibold block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#2C4B8A]" /> Venue Location &amp; Address
                  </span>

                  <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-1.5 text-xs">
                    {inquiry.venue_type && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium text-[11px]">Venue Type:</span>
                        <span className="font-bold text-slate-800">{inquiry.venue_type}</span>
                      </div>
                    )}

                    {inquiry.landmark && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-medium text-[11px]">Landmark:</span>
                        <span className="font-semibold text-slate-800">{inquiry.landmark}</span>
                      </div>
                    )}

                    <div>
                      <span className="text-slate-400 font-medium text-[11px]">Full Address: </span>
                      <span className="font-semibold text-slate-900">
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
                      </span>
                    </div>

                    {/* Delivery / Setup Logistics */}
                    {inquiry.delivery_method && (
                      <div className="pt-1.5 border-t border-slate-200/60 flex items-start gap-2 text-[11px] text-slate-600">
                        <Truck className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-slate-800 capitalize">
                            Method: {inquiry.delivery_method === "setup" ? "On-site Setup & Catering" : inquiry.delivery_method}
                          </span>
                          {inquiry.delivery_instructions && (
                            <div className="text-slate-500 mt-0.5">
                              Instructions: {inquiry.delivery_instructions}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 2. SELECTED PACKAGE & INCLUSIONS (COLLAPSIBLE / ACCORDION) */}
            {hasPackage && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#2C4B8A]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Selected Package &amp; Inclusions
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-[#1E3563] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                    {isSpecialOffer ? "Special Offer Combo" : "Catering Package"}
                  </span>
                </div>

                {/* Package Main Card */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4 sm:p-5 transition-all space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      {resolvedPackage?.image_url ? (
                        <img
                          src={resolvedPackage.image_url}
                          alt={resolvedPackage.name}
                          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-blue-100/70 border border-blue-200 flex items-center justify-center text-[#2C4B8A] shrink-0 shadow-2xs">
                          <Package className="w-7 h-7 opacity-80" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none mb-1">
                          Selected Package
                        </div>
                        <h3 className="font-extrabold text-base sm:text-lg text-slate-900 font-sans tracking-tight">
                          {resolvedPackage?.name || inquiry.package_name_snapshot}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-xl">
                          {resolvedPackage?.description || "Curated catering and event setup package tailored for your event."}
                        </p>

                        {/* EXACT CONFIGURED SCAFFOLD SIZE (SHOWN ONLY IF CONFIGURED) */}
                        {resolvedScaffoldSize && (
                          <div className="mt-3">
                            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200/90 shadow-2xs">
                              <div className="w-6 h-6 rounded-md bg-blue-50 text-[#2C4B8A] flex items-center justify-center shrink-0">
                                <Store className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                                  Scaffold Size
                                </span>
                                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                                  <span className="font-bold text-slate-900 font-sans">
                                    {resolvedScaffoldSize.formatted}
                                  </span>
                                  {resolvedScaffoldSize.label && (
                                    <span className="text-slate-500 font-normal">
                                      ({resolvedScaffoldSize.label})
                                    </span>
                                  )}
                                  {resolvedScaffoldSize.area && (
                                    <span className="text-slate-400 font-normal">
                                      • {resolvedScaffoldSize.area}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Badges Summary */}
                        <div className="flex items-center gap-2 mt-3 flex-wrap">
                          {totalDishesCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-[#1E3563] shadow-2xs">
                              <Utensils className="w-3 h-3 text-[#2C4B8A]" />
                              <span>{totalDishesCount} menu items included</span>
                            </span>
                          )}

                          {totalPackageInclusionsCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-slate-700 shadow-2xs">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{totalPackageInclusionsCount} setup &amp; inventory inclusions</span>
                            </span>
                          )}

                          {resolvedScaffoldSize && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-md text-slate-700 shadow-2xs">
                              <Layers className="w-3 h-3 text-[#2C4B8A]" />
                              <span>{resolvedScaffoldSize.formatted} scaffold size</span>
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
                    <div className="pt-4 border-t border-slate-200/90 space-y-5 animate-in fade-in-50 duration-200">
                      {/* Full description if present */}
                      {resolvedPackage?.fullDescription && resolvedPackage.fullDescription !== resolvedPackage.description && (
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200/80">
                          {resolvedPackage.fullDescription}
                        </p>
                      )}

                      {/* 1. INCLUDED MENU ITEMS (ORGANIZED BY CATEGORY) */}
                      {isSpecialOffer ? (
                        categorizedSpecialOffer.length > 0 && (
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                              <Utensils className="w-4 h-4 text-[#2C4B8A]" />
                              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                                Included Combo Menu ({offerFoodItems.length} items)
                              </h4>
                            </div>

                            <div className="space-y-3.5">
                              {categorizedSpecialOffer.map(({ category, dishes }) => (
                                <div key={category} className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    {category}
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {dishes.map((d, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-semibold text-slate-800"
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
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                              <Utensils className="w-4 h-4 text-[#2C4B8A]" />
                              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                                Selected Menu Dishes ({resolvedMenuItems.length} dishes)
                              </h4>
                            </div>

                            <div className="space-y-3.5">
                              {categorizedMenu.map(({ category, dishes }) => (
                                <div key={category} className="space-y-1.5">
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    {category} ({dishes.length})
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {dishes.map((dish, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50/90 border border-slate-200/80 shadow-2xs"
                                      >
                                        {dish.image_url ? (
                                          <img
                                            src={dish.image_url}
                                            alt={dish.name}
                                            className="w-10 h-10 rounded-md object-cover border border-slate-200 shrink-0"
                                          />
                                        ) : (
                                          <div className="w-10 h-10 rounded-md bg-blue-100/80 flex items-center justify-center text-[#2C4B8A] shrink-0">
                                            <Utensils className="w-4 h-4" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="font-bold text-slate-900 text-xs truncate">{dish.name}</div>
                                          {dish.description && (
                                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
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

                      {/* 2. SETUP & SERVICE INCLUSIONS */}
                      {packageInclusionGroups.length > 0 && (
                        <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/80">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <Layers className="w-4 h-4 text-[#2C4B8A]" />
                            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                              Package Inclusions &amp; Equipment ({totalPackageInclusionsCount} items)
                            </h4>
                          </div>

                          <div className="space-y-3.5">
                            {packageInclusionGroups.map(({ category, items }) => (
                              <div key={category} className="space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                  {category}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-800"
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

                      {/* 3. CONFIGURED SCAFFOLD & SETUP SPACE SPECIFICATIONS */}
                      {resolvedScaffoldSize && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
                          <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                            <Store className="w-4 h-4 text-[#2C4B8A]" />
                            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-sans">
                              Configured Package Scaffold Size
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 flex-wrap pt-1">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                              <span>{resolvedScaffoldSize.formatted}</span>
                              {resolvedScaffoldSize.label && (
                                <span className="text-xs text-slate-500 font-normal">({resolvedScaffoldSize.label})</span>
                              )}
                            </div>
                            {resolvedScaffoldSize.area && (
                              <span className="text-slate-500 font-normal">• Total Area: {resolvedScaffoldSize.area}</span>
                            )}
                            {resolvedScaffoldSize.capacity && (
                              <span className="text-slate-500 font-normal">• Optimal for {resolvedScaffoldSize.capacity}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 4 ORGANIZED INFORMATIONAL GUIDANCE NOTICES */}
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Info className="w-3.5 h-3.5 text-[#2C4B8A]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Package &amp; Quotation Guidance
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Notice 1: Removing default package inclusions */}
                    <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/90 text-xs space-y-1.5 shadow-2xs hover:bg-blue-50/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100/80 text-[#2C4B8A] flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs font-sans">
                          Removing Package Inclusions
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                        Want to remove an item included in the default package? This can be discussed during the quotation process. Depending on the adjustment, the package&apos;s base price may also be reduced.
                      </p>
                    </div>

                    {/* Notice 2: Additional food, items, and add-ons */}
                    <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/90 text-xs space-y-1.5 shadow-2xs hover:bg-blue-50/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100/80 text-[#2C4B8A] flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs font-sans">
                          Additional Items &amp; Add-ons
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                        Additional items, food selections, and add-ons are subject to quotation. Their final pricing will be discussed and confirmed in your quotation.
                      </p>
                    </div>

                    {/* Notice 3: Event setup & size adjustments */}
                    <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/90 text-xs space-y-1.5 shadow-2xs hover:bg-blue-50/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100/80 text-[#2C4B8A] flex items-center justify-center shrink-0">
                          <Store className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs font-sans">
                          Event Setup &amp; Size Adjustments
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                        Need a different event setup or size? Setup adjustments may be possible to provide a more comfortable experience for your guests. Any changes can be discussed and finalized during the quotation process.
                      </p>
                    </div>

                    {/* Notice 4: Coordinator consultation */}
                    <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/90 text-xs space-y-1.5 shadow-2xs hover:bg-blue-50/70 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-blue-100/80 text-[#2C4B8A] flex items-center justify-center shrink-0">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-bold text-slate-900 text-xs font-sans">
                          Quotation Consultation
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed pl-8">
                        Our team will contact you to confirm the details of your event and discuss any requested adjustments so we can prepare a more accurate quotation for you.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. STANDALONE FOOD / MENU SELECTIONS (If no package chosen) */}
            {!hasPackage && categorizedMenu.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="w-4 h-4 text-[#2C4B8A]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Food &amp; Menu Selections ({resolvedMenuItems.length} items)
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">Custom Food Selection</span>
                </div>

                <div className="space-y-4">
                  {categorizedMenu.map(({ category, dishes }) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                        {category} ({dishes.length})
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {dishes.map((dish, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs"
                          >
                            {dish.image_url ? (
                              <img
                                src={dish.image_url}
                                alt={dish.name}
                                className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center text-[#2C4B8A] shrink-0">
                                <Utensils className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-xs">{dish.name}</div>
                              {dish.description && (
                                <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
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
            )}

            {/* 4. ADD-ONS & EXTRA SERVICES (Only if selected) */}
            {hasAddons && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#2C4B8A]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Add-ons &amp; Extra Services
                    </h2>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {(inquiry.service_items?.length || 0) + (inquiry.additional_services?.length || 0)} Selected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {Array.isArray(inquiry.service_items) &&
                    inquiry.service_items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#2C4B8A]/10 text-[#2C4B8A] flex items-center justify-center shrink-0">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 truncate">{item.name}</div>
                            {item.quantity && (
                              <div className="text-[11px] text-slate-400">Qty: {item.quantity}</div>
                            )}
                          </div>
                        </div>

                        {item.price > 0 ? (
                          <div className="font-bold text-[#2C4B8A] shrink-0">
                            {formatCurrency(item.price)}
                          </div>
                        ) : (
                          <div className="text-[11px] font-semibold text-slate-500 shrink-0">
                            Quoted with booking
                          </div>
                        )}
                      </div>
                    ))}

                  {Array.isArray(inquiry.additional_services) &&
                    inquiry.additional_services.map((serv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{serv}</span>
                      </div>
                    ))}
                </div>

                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-600 flex items-start gap-2.5">
                  <Info className="w-3.5 h-3.5 text-[#2C4B8A] shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-relaxed">
                    Additional items and add-ons are subject to quotation. Final pricing and itemization will be discussed and confirmed in your official quotation.
                  </p>
                </div>
              </div>
            )}

            {/* 5. SPECIAL REQUESTS & DIETARY PREFERENCES (Only if provided) */}
            {hasSpecialRequests && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#2C4B8A]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Special Requests &amp; Dietary Notes
                    </h2>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs">
                  {inquiry.special_requests && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Special Event Requests
                      </span>
                      <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100 text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">
                        {inquiry.special_requests}
                      </div>
                    </div>
                  )}

                  {inquiry.allergies && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-[11px] uppercase tracking-wider block">
                          Declared Food Allergies
                        </span>
                        <span className="font-semibold text-xs mt-0.5 block">{inquiry.allergies}</span>
                      </div>
                    </div>
                  )}

                  {(inquiry.dietary_restrictions || inquiry.dietary_requirements) && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Dietary Preferences &amp; Restrictions
                      </span>
                      <p className="text-slate-700 font-medium">
                        {inquiry.dietary_restrictions || inquiry.dietary_requirements}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 6. CUSTOM STYLING & INSPIRATION PHOTOS (Only if applicable) */}
            {hasCustomSetupOrInspiration && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#2C4B8A]" />
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">
                      Custom Event Styling &amp; Inspiration
                    </h2>
                  </div>
                  {inquiry.is_custom_setup && (
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full">
                      Custom Setup Requested
                    </span>
                  )}
                </div>

                <div className="space-y-4 text-xs">
                  {Array.isArray(inquiry.custom_setup_scope) && inquiry.custom_setup_scope.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Styling Scope Elements
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inquiry.custom_setup_scope.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 font-semibold text-xs"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {inquiry.custom_setup_notes && (
                    <div className="space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Styling Notes
                      </span>
                      <p className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed font-medium">
                        {inquiry.custom_setup_notes}
                      </p>
                    </div>
                  )}

                  {Array.isArray(inquiry.inspiration_images) && inquiry.inspiration_images.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Customer Uploaded Inspiration Photos ({inquiry.inspiration_images.length})
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {inquiry.inspiration_images.map((imgUrl, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedPhoto(imgUrl)}
                            className="aspect-square rounded-xl overflow-hidden border border-slate-200 relative group cursor-pointer shadow-2xs hover:shadow-md transition-all"
                          >
                            <img
                              src={imgUrl}
                              alt={`Inspiration ${idx + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                              Click to view
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SUMMARY & ACTION RAIL (lg:col-span-1 space-y-6) */}
          <div className="space-y-6">
            {/* 1. PRICING & QUOTATION SUMMARY CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#2C4B8A]" /> Pricing &amp; Quotation
                </h3>
                {inquiry.quotation_status && (
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    {inquiry.quotation_status}
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {inquiry.total_price > 0 ? (
                  <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium text-slate-600">Total Quoted Cost</span>
                      <span className="text-lg font-extrabold text-[#1E3563] font-sans">
                        {formatCurrency(inquiry.total_price)}
                      </span>
                    </div>

                    {inquiry.deposit_amount > 0 && (
                      <div className="flex items-baseline justify-between text-xs pt-1.5 border-t border-blue-200/60">
                        <span className="text-slate-600 font-medium">Required Deposit</span>
                        <span className="font-bold text-emerald-700">
                          {formatCurrency(inquiry.deposit_amount)}
                        </span>
                      </div>
                    )}

                    {inquiry.quotation_expiration_date && (
                      <div className="text-[10px] text-slate-500 pt-1">
                        Quote valid until: {formatShortDate(inquiry.quotation_expiration_date)}
                      </div>
                    )}
                  </div>
                ) : inquiry.estimated_total > 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs font-medium text-slate-600 block">Estimated Total</span>
                        <span className="text-[10px] text-amber-700 font-semibold inline-block">
                          Pre-Quotation Estimate
                        </span>
                      </div>
                      <span className="text-base font-extrabold text-slate-900 font-sans">
                        {formatCurrency(inquiry.estimated_total)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug pt-1.5 border-t border-slate-200/70">
                      Initial calculation shown at submission. Deductions for removed package inclusions, added item prices, and setup adjustments will be finalized in your official quotation.
                    </p>
                  </div>
                ) : resolvedPackage?.setup_price > 0 ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-xs font-medium text-slate-600 block">Package Base Price</span>
                        <span className="text-[10px] text-amber-700 font-semibold inline-block">
                          Subject to Quotation
                        </span>
                      </div>
                      <span className="text-base font-extrabold text-slate-900 font-sans">
                        {formatCurrency(resolvedPackage.setup_price)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug pt-1.5 border-t border-slate-200/70">
                      Official quotation will finalize guest count, catering menus, potential inclusion deductions, and add-on itemization.
                    </p>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    Pricing will be calculated based on your specifications and sent via formal quotation.
                  </div>
                )}

                {/* Primary Action Buttons */}
                {isQuotationSent && (
                  <Button
                    onClick={openQuotationView}
                    disabled={isLoadingQuotation}
                    className="w-full bg-[#1E3563] hover:bg-[#152547] text-white font-bold text-xs h-9 rounded-xl cursor-pointer shadow-xs gap-1.5 transition-all"
                  >
                    <FileCheck2 className="w-4 h-4" />
                    <span>Review Official Quotation</span>
                  </Button>
                )}

                {inquiry.total_price > 0 && !isConverted && !isDepositPaid && inquiry.status !== "Cancelled" && (
                  <Button
                    onClick={startInquiryCheckout}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl cursor-pointer shadow-xs gap-1.5 transition-all"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Deposit Now</span>
                  </Button>
                )}
              </div>
            </div>

            {/* 2. CONTACT INFORMATION CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans border-b border-slate-100 pb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-[#2C4B8A]" /> Contact Information
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2C4B8A] flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer Name</span>
                    <span className="font-bold text-slate-900 text-xs truncate block">
                      {inquiry.contact_first_name} {inquiry.contact_last_name}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2C4B8A] flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Email Address</span>
                    <span className="font-semibold text-slate-800 text-xs truncate block">
                      {inquiry.contact_email || "No email provided"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2C4B8A] flex items-center justify-center shrink-0">
                    <Phone className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone Number</span>
                    <span className="font-bold text-[#2C4B8A] text-xs block">
                      {inquiry.contact_phone || "No phone provided"}
                    </span>
                  </div>
                </div>

                {inquiry.contact_alt_phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2C4B8A] flex items-center justify-center shrink-0">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Alt Phone</span>
                      <span className="font-medium text-slate-700 text-xs block">
                        {inquiry.contact_alt_phone}
                      </span>
                    </div>
                  </div>
                )}

                {inquiry.contact_method && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Preferred Contact:</span>
                    <span className="font-semibold text-slate-800 capitalize">{inquiry.contact_method}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 3. COORDINATOR CHAT / SUPPORT ASSISTANCE */}
            <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/60 border border-blue-100 rounded-2xl p-5 shadow-2xs space-y-3 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E3563] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-[#1E3563] text-xs">Questions or Changes?</h4>
                  <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                    Message our catering coordinator directly regarding your venue, menu changes, or quotation inquiry.
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenChat}
                className="w-full bg-white hover:bg-blue-50 text-[#1E3563] border-blue-200 font-bold text-xs h-8.5 rounded-xl cursor-pointer shadow-2xs gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat with Catering Team</span>
              </Button>
            </div>

            {/* 4. CANCEL INQUIRY ACTION (If active) */}
            {inquiry.status !== "Converted to Booking" && inquiry.status !== "Cancelled" && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
                <Button
                  variant="outline"
                  onClick={() => setIsCancelDialogOpen(true)}
                  className="w-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-semibold h-9 rounded-xl cursor-pointer shadow-2xs transition-all gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Inquiry Request
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REUSED MODALS */}
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

      {isEditModalOpen && (
        <CustomerInquiryEditModal
          open={isEditModalOpen}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          inquiry={inquiry}
          onSaved={fetchInquiryDetails}
        />
      )}

      {/* Photo Preview Dialog */}
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

      {/* Cancel Confirmation Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Cancel Inquiry Request?</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Are you sure you want to cancel this event inquiry? You can submit a new request anytime.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
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
