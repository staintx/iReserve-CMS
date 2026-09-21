import React, { useState, useEffect, useMemo, useRef } from "react";
import Modal from "../../common/Modal";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import FeedbackDialog from "../../feedback/FeedbackDialog";
import { useConfirm } from "../../feedback/confirmContext";
import {
  FileText,
  RefreshCw,
  Save,
  Send,
  X,
} from "lucide-react";

// Calculations & Utilities
import {
  computeQuotationTotals,
  derivePackageStartingPrice,
  inclusionAdjustmentAmount,
  MENU_PRICING,
  money,
} from "../../../utils/quotationPricing";
import { diffQuotationVersions } from "../../../utils/quotationDiff";
import {
  eventSpaceLabel,
  inclusionDisplayName,
  parseInclusion,
  parseInclusionQuantity,
  withInclusionName,
} from "../../../lib/packageDisplay";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../../lib/eventTypes";
import {
  SERVICE_TYPES,
  cateringRequested,
} from "../../../pages/customer/booking/lib/bookingRules";
import { resolveServiceType } from "../../customer/portal/statusMeta";
import {
  isSpecialOffer,
  offerBaseFoodPrice,
  offerFoodItems,
  offerGuestCount,
  offerInclusions,
  offerPricePerPax,
} from "../../../lib/specialOffers";
import { BATANGAS_PROVINCE, getBatangasBarangays, getBatangasMunicipalities } from "../../../utils/batangas";
import { formatCurrency, formatShortDate } from "../../../utils/format";

// Sub-components
import QuotationNavigation from "./QuotationNavigation";
import QuotationLiveSummary from "./QuotationLiveSummary";
import CustomerRequestStep from "./steps/CustomerRequestStep";
import PricingAdjustmentsStep from "./steps/PricingAdjustmentsStep";
import ReviewSendStep from "./steps/ReviewSendStep";
import { resolveDishImageUrl } from "./DishThumbnail";

/* ---------------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------------- */

const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const formatSavedAt = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const time = date.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
  const isToday = new Date().toDateString() === date.toDateString();
  if (isToday) return `today at ${time}`;
  return `${date.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} at ${time}`;
};

const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toDateInput(date);
};

const computeMaxValidityDate = (eventDateStr) => {
  if (!eventDateStr) return null;
  const date = new Date(eventDateStr);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() - 3);
  return toDateInput(date);
};

const computeDefaultExpiration = (eventDateStr) => {
  const plus7 = addDays(7);
  const maxValid = computeMaxValidityDate(eventDateStr);
  if (!maxValid) return plus7;
  const today = toDateInput(new Date());
  if (maxValid < plus7) {
    return maxValid < today ? today : maxValid;
  }
  return plus7;
};

const todayInput = () => toDateInput(new Date());

const numberOf = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

const isBlankAmount = (value) => String(value ?? "").trim() === "";

const inclusionText = (inclusion) =>
  typeof inclusion === "string" ? inclusion : String(inclusion?.name || inclusion || "");

const inclusionRow = (name, partial = {}) => {
  const text = inclusionText(name);
  const parsed = parseInclusionQuantity(text);
  return {
    name: text,
    removed: false,
    deduction: "",
    fromPackage: true,
    baseQuantity: parsed ? parsed.quantity : null,
    quantity: parsed ? parsed.quantity : null,
    unitPrice: "",
    ...partial,
  };
};

const menuRow = (partial = {}) => ({
  name: "",
  category: "",
  note: "",
  quantity: 1,
  unit: "",
  pricing_type: MENU_PRICING.QUANTITY,
  price: "",
  image_url: "",
  isCustomUnit: false,
  ...partial,
});

function resolveInitialScaffold(inquiry, pkg, pendingDraft, latestQuote) {
  if (pendingDraft?.draft_details?.scaffold_width && pendingDraft?.draft_details?.scaffold_length) {
    const isCustom = !pendingDraft.draft_details.selected_scaffold_option_id;
    return {
      selectedScaffoldId: pendingDraft.draft_details.selected_scaffold_option_id
        ? String(pendingDraft.draft_details.selected_scaffold_option_id)
        : "custom",
      width: String(pendingDraft.draft_details.scaffold_width),
      length: String(pendingDraft.draft_details.scaffold_length),
      isCustom,
    };
  }

  const options = Array.isArray(pkg?.scaffold_size_options) ? pkg.scaffold_size_options : [];
  let matched = null;

  if (inquiry?.selected_scaffold_option_id) {
    matched = options.find(
      (opt, idx) =>
        String(opt._id) === String(inquiry.selected_scaffold_option_id) ||
        String(idx) === String(inquiry.selected_scaffold_option_id)
    );
  }

  if (!matched && inquiry?.scaffold_width && inquiry?.scaffold_length) {
    matched = options.find(
      (opt) =>
        Number(opt.width_ft) === Number(inquiry.scaffold_width) &&
        Number(opt.length_ft) === Number(inquiry.scaffold_length)
    );
  }

  if (matched) {
    return {
      selectedScaffoldId: String(matched._id || options.indexOf(matched)),
      width: String(matched.width_ft || ""),
      length: String(matched.length_ft || ""),
      isCustom: false,
    };
  }

  if (inquiry?.scaffold_width && inquiry?.scaffold_length) {
    return {
      selectedScaffoldId: "custom",
      width: String(inquiry.scaffold_width),
      length: String(inquiry.scaffold_length),
      isCustom: true,
    };
  }

  if (options.length > 0) {
    const first = options[0];
    return {
      selectedScaffoldId: String(first._id || "0"),
      width: String(first.width_ft || ""),
      length: String(first.length_ft || ""),
      isCustom: false,
    };
  }

  return {
    selectedScaffoldId: "",
    width: "",
    length: "",
    isCustom: false,
  };
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ---------------------------------------------------------------------------
   Main Quotation Builder Component
--------------------------------------------------------------------------- */

export default function QuotationBuilderModal({ inquiry, onClose, onSuccess }) {
  const { notify } = useToast();
  const confirm = useConfirm();

  const isCancelled = ["Cancelled", "Quote Rejected", "Rejected", "Expired"].includes(inquiry?.status);

  useEffect(() => {
    if (isCancelled) {
      notify({
        type: "error",
        message: "Cannot prepare or edit quotation for a cancelled inquiry.",
      });
      onClose();
    }
  }, [isCancelled, notify, onClose]);

  // Loading & submit states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  // Workflow Active Step: 1 (Customer Request) | 2 (Set Prices) | 3 (Review & Send)
  const [activeStep, setActiveStep] = useState(1);
  const [activePricingSection, setActivePricingSection] = useState("pricing-package");

  // Step 1 Edit Mode Toggle (default: false = Read Only Review)
  const [isCustomerEditMode, setIsCustomerEditMode] = useState(false);

  // Live Summary Collapse State (to maximize workspace on smaller screens)
  const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);

  // Stored quotation & draft records
  const [quotation, setQuotation] = useState(null);
  const [savedDraft, setSavedDraft] = useState(null);

  // Reference Catalogs
  const [catalogMenuItems, setCatalogMenuItems] = useState([]);
  const [catalogAddons, setCatalogAddons] = useState([]);
  const [packagesCatalog, setPackagesCatalog] = useState([]);
  const [depositPercentage, setDepositPercentage] = useState(20);

  // Event & Customer Details (Step 1)
  const [details, setDetails] = useState({
    booking_for: "myself",
    celebrant_name: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    event_type: "",
    event_type_other: "",
    event_date: "",
    start_time: "",
    guest_count: 1,
    service_type: SERVICE_TYPES.FULL_SERVICE,
    event_theme: "",
    event_palette: "",
    venue_type: "",
    province: BATANGAS_PROVINCE,
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    include_food: true,
  });

  // Package & Inclusions (Step 2)
  const [packageName, setPackageName] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [inclusions, setInclusions] = useState([]);

  // Scaffold / Space Dimension
  const [selectedScaffoldId, setSelectedScaffoldId] = useState("");
  const [scaffoldWidth, setScaffoldWidth] = useState("");
  const [scaffoldLength, setScaffoldLength] = useState("");
  const [isCustomScaffold, setIsCustomScaffold] = useState(false);
  const [scaffoldInitialized, setScaffoldInitialized] = useState(false);

  // Menu items & Add-ons (Step 2)
  const [menuItems, setMenuItems] = useState([]);
  const [addOns, setAddOns] = useState([]);

  // Logistics & Adjustments (Step 2)
  const [transportationFee, setTransportationFee] = useState("");
  const [additionalFees, setAdditionalFees] = useState([]);
  const [taxes, setTaxes] = useState("");
  const [discounts, setDiscounts] = useState("");

  // Overtime Calculator (Step 2)
  const [includeOvertime, setIncludeOvertime] = useState(false);
  const [overtimeMode, setOvertimeMode] = useState("per_crew");
  const [overtimeHours, setOvertimeHours] = useState(2);
  const [crewCount, setCrewCount] = useState(() => {
    const pax = Number(inquiry?.guest_count) || 50;
    if (pax <= 40) return 2;
    if (pax <= 75) return 3;
    if (pax <= 120) return 4;
    if (pax <= 180) return 6;
    return 8;
  });
  const [hourlyRatePerCrew, setHourlyRatePerCrew] = useState(200);
  const [flatOvertimeFee, setFlatOvertimeFee] = useState(1500);
  const [overtimeCustomTitle, setOvertimeCustomTitle] = useState("");
  const [overtimeCustomAmount, setOvertimeCustomAmount] = useState("");

  // Payment Terms & Expiration (Step 3)
  const [depositAmount, setDepositAmount] = useState("");
  const [expirationDate, setExpirationDate] = useState(addDays(7));
  const [adminNotes, setAdminNotes] = useState("");

  // Validation errors
  const [errors, setErrors] = useState({});
  const [closeIntent, setCloseIntent] = useState(null);
  const savedBaseline = useRef(null);

  const isFoodOnly = details.service_type === SERVICE_TYPES.FOOD_ONLY;
  const isSetupOnly = details.service_type === SERVICE_TYPES.SETUP_ONLY;
  const cateringIncluded = !isSetupOnly && details.include_food !== false;
  const rawPackage = inquiry?.package_id && typeof inquiry.package_id === "object" ? inquiry.package_id : null;
  const packageRecord = useMemo(() => {
    if (rawPackage?.offer_food_items?.length) return rawPackage;
    const pkgId = rawPackage?._id || inquiry?.package_id;
    if (pkgId && packagesCatalog.length > 0) {
      const found = packagesCatalog.find((p) => String(p._id) === String(pkgId));
      if (found) return found;
    }
    return rawPackage;
  }, [rawPackage, inquiry?.package_id, packagesCatalog]);

  const scaffoldOptions = useMemo(() => {
    return Array.isArray(packageRecord?.scaffold_size_options) ? packageRecord.scaffold_size_options : [];
  }, [packageRecord]);

  const selectedScaffoldPrice = useMemo(() => {
    if (isCustomScaffold || !selectedScaffoldId) return null;
    const opt = scaffoldOptions.find(
      (o, idx) => String(o._id) === String(selectedScaffoldId) || String(idx) === String(selectedScaffoldId)
    );
    return opt?.price ? Number(opt.price) : null;
  }, [isCustomScaffold, selectedScaffoldId, scaffoldOptions]);

  const handleScaffoldOptionChange = (optionId) => {
    if (optionId === "custom") {
      setIsCustomScaffold(true);
      setSelectedScaffoldId("custom");
      return;
    }
    const opt = scaffoldOptions.find(
      (entry, idx) => String(entry?._id) === String(optionId) || String(idx) === String(optionId)
    );
    if (opt) {
      setIsCustomScaffold(false);
      setSelectedScaffoldId(String(opt._id || optionId));
      setScaffoldWidth(opt.width_ft ? String(opt.width_ft) : "");
      setScaffoldLength(opt.length_ft ? String(opt.length_ft) : "");
      if (opt.price != null && Number(opt.price) > 0) {
        setStartingPrice(String(opt.price));
      }
    }
  };

  const handleCustomScaffoldChange = (w, l) => {
    setIsCustomScaffold(true);
    setSelectedScaffoldId("custom");
    setScaffoldWidth(w);
    setScaffoldLength(l);
  };

  const maxValidityDate = useMemo(() => computeMaxValidityDate(details.event_date), [details.event_date]);

  const isSpecial = Boolean(
    inquiry?.booking_type === "special" ||
    packageRecord?.offer_type === "special" ||
    packageRecord?.booking_type === "special" ||
    isSpecialOffer(packageRecord) ||
    (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0)
  );

  const activeSpecialDishes = useMemo(
    () => (cateringIncluded ? menuItems.filter((m) => !m.removed) : []),
    [cateringIncluded, menuItems]
  );

  // Combo Special Offer context
  const offerContext = useMemo(() => {
    if (!isSpecial) return null;
    const guests = Number(details.guest_count) || Number(inquiry?.guest_count) || offerGuestCount(packageRecord) || 1;
    const perPax =
      offerPricePerPax(packageRecord) ||
      Number(packageRecord?.price_per_guest) ||
      (Number(inquiry?.guest_count) && Number(inquiry?.offer_base_price)
        ? Number(inquiry.offer_base_price) / Number(inquiry.guest_count)
        : 0);

    const snapshot = (isSpecial && activeSpecialDishes.length > 0)
      ? activeSpecialDishes.map((item) => ({
          menu_category: item.category || "",
          item_name: item.name || "",
        }))
      : (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0
          ? inquiry.offer_food_snapshot
          : (packageRecord ? offerFoodItems(packageRecord) : []));

    const basePrice = Math.round(perPax * guests * 100) / 100;

    return {
      name: packageRecord?.name || inquiry?.package_name_snapshot || "Special Offer",
      guests,
      perPax,
      basePrice,
      food: snapshot.map((item) => (item.menu_category ? `${item.item_name} (${item.menu_category})` : item.item_name)),
      foodItems: snapshot.map((item) => ({ name: item.item_name, category: item.menu_category || "" })),
      included: [
        ...snapshot.map((item) => (item.menu_category ? `${item.item_name} (${item.menu_category})` : item.item_name)),
        ...(packageRecord ? offerInclusions(packageRecord) : []),
      ],
    };
  }, [
    isSpecial,
    packageRecord,
    details.guest_count,
    inquiry?.guest_count,
    inquiry?.offer_base_price,
    inquiry?.offer_food_snapshot,
    inquiry?.package_name_snapshot,
    activeSpecialDishes,
  ]);

  // Customer Original Selection
  const customerSelection = useMemo(() => {
    let dishes = [];

    if (isSpecial) {
      // 1. For Special Offers:
      // Priority A: inquiry.offer_food_snapshot (saved selections by customer)
      // Priority B: offerContext?.foodItems
      // Priority C: packageRecord ? offerFoodItems(packageRecord)
      // Priority D: inquiry.selected_menu
      let sourceList = [];
      if (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0) {
        sourceList = inquiry.offer_food_snapshot.map((f) => ({
          name: f.item_name || f.name || "",
          category: f.menu_category || f.category || "",
          image_url: f.image_url || "",
        }));
      } else if (offerContext?.foodItems && offerContext.foodItems.length > 0) {
        sourceList = offerContext.foodItems.map((f) => ({
          name: f.name || f.item_name || "",
          category: f.category || f.menu_category || "",
          image_url: f.image_url || "",
        }));
      } else if (packageRecord) {
        sourceList = offerFoodItems(packageRecord).map((f) => ({
          name: f.item_name || f.name || "",
          category: f.menu_category || f.category || "",
          image_url: f.image_url || "",
        }));
      }

      if (sourceList.length === 0 && Array.isArray(inquiry?.selected_menu) && inquiry.selected_menu.length > 0) {
        sourceList = inquiry.selected_menu.map((item) => {
          if (item && typeof item === "object") {
            return {
              name: item.name || item.item_name || "",
              category: item.category || item.menu_category || "",
              image_url: item.image_url || "",
            };
          }
          const str = String(item || "").trim();
          const matched = catalogMenuItems.find(
            (c) => String(c._id) === str || (c.name || "").trim().toLowerCase() === str.toLowerCase()
          );
          return {
            name: matched?.name || str,
            category: matched?.category || "",
            image_url: matched?.image_url || "",
          };
        });
      }

      dishes = sourceList
        .filter((d) => Boolean(d.name))
        .map((d) => ({
          id: d.id || d.name,
          name: d.name,
          category: d.category,
          price: 0,
          isSpecialInclusion: true,
          image_url: d.image_url || resolveDishImageUrl({ name: d.name }, catalogMenuItems) || "",
        }));
    } else {
      // 2. For Regular / Default Packages:
      const rawMenu = (Array.isArray(inquiry?.selected_menu) && inquiry.selected_menu.length > 0)
        ? inquiry.selected_menu
        : (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0)
          ? inquiry.offer_food_snapshot
          : [];

      dishes = rawMenu
        .filter(Boolean)
        .map((item) => {
          if (item && typeof item === "object") {
            const dishName = item.name || item.item_name || "";
            return {
              id: String(item._id || item.id || ""),
              name: dishName,
              category: item.category || item.menu_category || "",
              price: Number(item.price) || 0,
              image_url: item.image_url || resolveDishImageUrl({ name: dishName }, catalogMenuItems) || "",
            };
          }
          const strVal = String(item).trim();
          const matched = catalogMenuItems.find(
            (c) => String(c._id) === strVal || (c.name || "").trim().toLowerCase() === strVal.toLowerCase()
          );
          const dishName = matched?.name || strVal;
          return {
            id: matched?._id ? String(matched._id) : strVal,
            name: dishName,
            category: matched?.category || "",
            price: Number(matched?.price) || 0,
            image_url: matched?.image_url || resolveDishImageUrl({ name: dishName }, catalogMenuItems) || "",
          };
        })
        .filter((d) => Boolean(d.name));
    }

    return {
      dishes,
      wantedFood: isSpecial || cateringRequested(inquiry) || dishes.length > 0,
      serviceType: inquiry?.service_type || "",
    };
  }, [inquiry, isSpecial, offerContext, packageRecord, catalogMenuItems]);

  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(() => getBatangasBarangays(details.municipality), [details.municipality]);

  // Overtime calculation
  const computedOvertimeAmount = useMemo(() => {
    if (!includeOvertime) return 0;
    if (overtimeMode === "flat") {
      return Math.max(0, Number(flatOvertimeFee) || 0);
    }
    const hrs = Math.max(0, Number(overtimeHours) || 0);
    const crew = Math.max(1, Number(crewCount) || 1);
    const rate = Math.max(0, Number(hourlyRatePerCrew) || 0);
    return Math.round(hrs * crew * rate);
  }, [includeOvertime, overtimeMode, overtimeHours, crewCount, hourlyRatePerCrew, flatOvertimeFee]);

  const finalOvertimeAmount = useMemo(() => {
    if (!includeOvertime) return 0;
    if (overtimeCustomAmount !== "" && !isNaN(Number(overtimeCustomAmount))) {
      return Math.max(0, Number(overtimeCustomAmount));
    }
    return computedOvertimeAmount;
  }, [includeOvertime, overtimeCustomAmount, computedOvertimeAmount]);

  const defaultOvertimeTitle = useMemo(() => {
    const hrs = Number(overtimeHours) || 0;
    const hrsLabel = `${hrs} hr${hrs === 1 ? "" : "s"}`;
    if (overtimeMode === "flat") {
      return `Event Overtime Fee (${hrsLabel} flat extension)`;
    }
    const crew = Number(crewCount) || 1;
    const rate = Number(hourlyRatePerCrew) || 0;
    return `Crew Overtime (${hrsLabel} × ${crew} crew @ ₱${rate}/hr)`;
  }, [overtimeMode, overtimeHours, crewCount, hourlyRatePerCrew]);

  // Sync overtime to additional fees
  useEffect(() => {
    const title = overtimeCustomTitle.trim() || defaultOvertimeTitle;
    const amountStr = String(finalOvertimeAmount);

    setAdditionalFees((prev) => {
      const filtered = prev.filter((f) => !f.isOvertime && !/overtime/i.test(f.name || ""));
      if (!includeOvertime || finalOvertimeAmount <= 0) {
        return filtered;
      }
      return [...filtered, { name: title, amount: amountStr, isOvertime: true }];
    });
  }, [includeOvertime, finalOvertimeAmount, overtimeCustomTitle, defaultOvertimeTitle]);

  /* ---------------------------------------------------------------------------
     Initial Data Fetching & Setup
  --------------------------------------------------------------------------- */
  useEffect(() => {
    if (!inquiry?._id) return;
    let active = true;

    Promise.all([
      AdminAPI.getMenu().catch(() => ({ data: [] })),
      AdminAPI.getAddons().catch(() => ({ data: [] })),
      AdminAPI.getQuotationsByInquiry(inquiry._id).catch(() => ({ data: [] })),
      AdminAPI.getBusinessInfo().catch(() => ({ data: {} })),
      AdminAPI.getPackages().catch(() => ({ data: [] })),
    ])
      .then(([menuRes, addonRes, quoteRes, businessRes, packagesRes]) => {
        if (!active) return;
        setCatalogMenuItems(menuRes.data || []);
        setCatalogAddons(addonRes.data || []);
        setPackagesCatalog(packagesRes.data || []);
        const standardDeposit = Number(businessRes.data?.deposit_percentage);
        if (Number.isFinite(standardDeposit) && standardDeposit > 0) {
          setDepositPercentage(standardDeposit);
        }

        const storedEventType = inquiry?.event_type || "";
        const detailsFromInquiry = {
          booking_for: inquiry?.booking_for || "myself",
          celebrant_name: inquiry?.celebrant_name || "",
          contact_first_name: inquiry?.contact_first_name || inquiry?.customer_id?.first_name || "",
          contact_last_name: inquiry?.contact_last_name || inquiry?.customer_id?.last_name || "",
          contact_email: inquiry?.contact_email || inquiry?.customer_id?.email || "",
          contact_phone: inquiry?.contact_phone || inquiry?.customer_id?.phone || "",
          event_type: matchEventType(storedEventType) || (storedEventType ? OTHER_EVENT_TYPE : ""),
          event_type_other: isOtherEventType(storedEventType) ? storedEventType : "",
          event_date: toDateInput(inquiry?.event_date),
          start_time: inquiry?.start_time || "",
          guest_count: Number(inquiry?.guest_count) || 1,
          service_type:
            inquiry?.service_type === SERVICE_TYPES.FOOD_ONLY
              ? SERVICE_TYPES.FOOD_ONLY
              : customerSelection.wantedFood
              ? SERVICE_TYPES.FULL_SERVICE
              : SERVICE_TYPES.SETUP_ONLY,
          include_food: customerSelection.wantedFood,
          event_theme: inquiry?.event_theme || "",
          event_palette: Array.isArray(inquiry?.event_palette)
            ? inquiry.event_palette.join(", ")
            : String(inquiry?.event_palette || ""),
          venue_type: inquiry?.venue_type || "",
          province: inquiry?.province || BATANGAS_PROVINCE,
          municipality: inquiry?.municipality || "",
          barangay: inquiry?.barangay || "",
          street: inquiry?.street || "",
          landmark: inquiry?.landmark || "",
          zip_code: inquiry?.zip_code || "",
        };
        setDetails(detailsFromInquiry);

        const quotes = Array.isArray(quoteRes.data) ? quoteRes.data : [];
        const pendingDraft = quotes.find((quote) => quote.status === "Draft") || null;
        const latestIssued = quotes.find((quote) => quote.status !== "Draft") || null;
        setQuotation(latestIssued);
        setSavedDraft(pendingDraft);

        if (pendingDraft) setDraftSavedAt(formatSavedAt(pendingDraft.updatedAt || pendingDraft.createdAt));
        const latest = pendingDraft || latestIssued;

        const scaffoldInit = resolveInitialScaffold(inquiry, packageRecord, pendingDraft, latest);
        setSelectedScaffoldId(scaffoldInit.selectedScaffoldId);
        setScaffoldWidth(scaffoldInit.width);
        setScaffoldLength(scaffoldInit.length);
        setIsCustomScaffold(scaffoldInit.isCustom);
        setScaffoldInitialized(true);

        if (latest) {
          const snapshot = latest.event_snapshot || {};
          const rawSnapshotServiceType = snapshot.service_type
            ? String(snapshot.service_type).replace(/^Custom Quote\s*-\s*/i, "").trim()
            : undefined;

          setDetails((prev) => ({
            ...prev,
            guest_count: Number(latest.guest_count) || prev.guest_count,
            ...(rawSnapshotServiceType ? { service_type: rawSnapshotServiceType } : {}),
            ...(typeof snapshot.include_food === "boolean" ? { include_food: snapshot.include_food } : {}),
            ...(pendingDraft?.draft_details
              ? Object.fromEntries(
                  Object.entries(pendingDraft.draft_details).filter(
                    ([key, value]) => key !== "_id" && value !== undefined && value !== null && value !== ""
                  )
                )
              : {}),
            ...(pendingDraft?.draft_details?.service_type
              ? {
                  service_type: String(pendingDraft.draft_details.service_type)
                    .replace(/^Custom Quote\s*-\s*/i, "")
                    .trim(),
                }
              : {}),
          }));

          setPackageName(latest.package_name || packageRecord?.name || "Custom Package");
          setStartingPrice(String(latest.package_starting_price ?? latest.package_price ?? 0));

          const savedAdjustments = new Map(
            (Array.isArray(latest.inclusion_adjustments) ? latest.inclusion_adjustments : [])
              .filter((entry) => entry?.name)
              .map((entry) => [String(entry.name), entry])
          );

          setInclusions([
            ...(Array.isArray(latest.package_inclusions) ? latest.package_inclusions : []).map((entry) => {
              const text = inclusionText(entry);
              const adjustment = savedAdjustments.get(text);
              const row = inclusionRow(text);
              if (!adjustment) return row;
              return {
                ...row,
                baseQuantity: Number(adjustment.base_quantity) || row.baseQuantity,
                quantity: Number(adjustment.quantity) || row.quantity,
                unitPrice: adjustment.unit_price ? String(adjustment.unit_price) : "",
              };
            }),
            ...(Array.isArray(latest.removed_inclusions) ? latest.removed_inclusions : []).map((entry) =>
              inclusionRow(inclusionText(entry), {
                removed: true,
                deduction: entry?.deduction ? String(entry.deduction) : "",
              })
            ),
          ]);

          const restoredGuests = Number(latest.guest_count) || Number(inquiry?.guest_count) || 1;
          const isLatestSpecial = Boolean(
            latest.booking_type === "special" ||
            latest.is_special_offer ||
            isSpecial
          );

          if (isLatestSpecial) {
            const savedDishes = (Array.isArray(latest.offer_food_snapshot) && latest.offer_food_snapshot.length > 0)
              ? latest.offer_food_snapshot.map((m) => ({ name: m.item_name, category: m.menu_category || "", image_url: m.image_url || "" }))
              : (Array.isArray(latest.menu_items) && latest.menu_items.length > 0)
                ? latest.menu_items.map((m) => ({ name: m.name, category: m.category || "", image_url: m.image_url || "" }))
                : (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0)
                  ? inquiry.offer_food_snapshot.map((m) => ({ name: m.item_name, category: m.menu_category || "", image_url: m.image_url || "" }))
                  : [];

            setMenuItems(
              savedDishes.map(({ name, category, image_url }) =>
                menuRow({
                  name,
                  category,
                  note: "Covered by combo package",
                  quantity: 1,
                  unit: "Included",
                  price: 0,
                  image_url: image_url || resolveDishImageUrl({ name }, menuRes.data || []),
                })
              )
            );
          } else {
            setMenuItems(
              Array.isArray(latest.menu_items)
                ? latest.menu_items.map((m) => {
                    const perGuest = m?.pricing_type !== MENU_PRICING.QUANTITY;
                    return menuRow({
                      name: m?.name || "",
                      category: m?.category || "",
                      note: m?.note || "",
                      quantity: perGuest ? restoredGuests : Number(m?.quantity) > 0 ? Number(m.quantity) : 1,
                      unit: m?.unit || (perGuest ? "Pax" : ""),
                      price: m?.price ? String(m.price) : "",
                      image_url: m?.image_url || resolveDishImageUrl({ name: m?.name }, menuRes.data || []),
                    });
                  })
                : []
            );
          }

          setAddOns(
            Array.isArray(latest.add_ons)
              ? latest.add_ons.map((a) => ({
                  name: a?.name || "",
                  price: a?.price ? String(a.price) : "",
                  quantity: Number(a?.quantity) > 0 ? Number(a.quantity) : 1,
                  note: a?.note || "",
                  pricing_type: "quantity",
                }))
              : []
          );

          setTransportationFee(latest.transportation_fee ? String(latest.transportation_fee) : "");

          const rawFees = Array.isArray(latest.additional_fees) ? latest.additional_fees : [];
          const otFee = rawFees.find((f) => /overtime/i.test(f?.name || ""));
          if (otFee) {
            setIncludeOvertime(true);
            setOvertimeCustomTitle(otFee.name || "");
            if (/flat/i.test(otFee.name || "")) {
              setOvertimeMode("flat");
              setFlatOvertimeFee(Number(otFee.amount) || 1500);
            } else {
              setOvertimeMode("per_crew");
              const m = (otFee.name || "").match(/(\d+(?:\.\d+)?)\s*hrs?.*?(\d+)\s*crew.*?(\d+)/i);
              if (m) {
                setOvertimeHours(Number(m[1]) || 2);
                setCrewCount(Number(m[2]) || 3);
                setHourlyRatePerCrew(Number(m[3]) || 200);
              }
            }
          }

          setAdditionalFees(
            rawFees.map((fee) => ({
              name: fee?.name || "",
              amount: fee?.amount ? String(fee.amount) : "",
              isOvertime: /overtime/i.test(fee?.name || ""),
            }))
          );

          setTaxes(latest.taxes ? String(latest.taxes) : "");
          setDiscounts(latest.discounts ? String(latest.discounts) : "");
          setDepositAmount(latest.deposit_amount ? String(latest.deposit_amount) : "");

          const storedExpiry = toDateInput(latest.expiration_date);
          const maxExpiry = computeMaxValidityDate(latest.event_snapshot?.event_date || inquiry?.event_date);
          const freshExpiry = computeDefaultExpiration(latest.event_snapshot?.event_date || inquiry?.event_date);
          setExpirationDate(
            storedExpiry && storedExpiry >= todayInput()
              ? maxExpiry && storedExpiry > maxExpiry
                ? maxExpiry
                : storedExpiry
              : freshExpiry
          );
          setAdminNotes(latest.admin_notes || "");
          return;
        }

        /* --- Fresh First Quotation Initialization --- */
        const guests = Number(inquiry?.guest_count) || 1;
        if (inquiry?.is_custom_setup) {
          setPackageName(
            inquiry.event_theme ? `Custom ${inquiry.event_theme} Event Setup` : "Bespoke Custom Event Setup"
          );
          setInclusions(
            (Array.isArray(inquiry.custom_setup_scope) ? inquiry.custom_setup_scope : []).map((scope) =>
              inclusionRow(scope)
            )
          );
          setStartingPrice("");
        } else {
          setPackageName(packageRecord?.name || "Custom Package");
          const rawInclusions = Array.isArray(packageRecord?.inclusions) ? packageRecord.inclusions : [];
          setInclusions(rawInclusions.map((entry) => inclusionRow(entry)));
          const derived = derivePackageStartingPrice(inquiry, guests);
          setStartingPrice(derived ? String(derived) : "");
        }

        if (isSpecial) {
          const foodList = (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0)
            ? inquiry.offer_food_snapshot.map(item => ({ name: item.item_name, category: item.menu_category || "", image_url: item.image_url || "" }))
            : (packageRecord ? offerFoodItems(packageRecord).map(item => ({ name: item.item_name, category: item.menu_category || "", image_url: item.image_url || "" })) : []);

          setMenuItems(
            foodList.map(({ name, category, image_url }) =>
              menuRow({
                name,
                category,
                note: "Covered by combo package",
                price: 0,
                unit: "Included",
                quantity: 1,
                image_url: image_url || resolveDishImageUrl({ name }, menuRes.data || []),
              })
            )
          );
        } else {
          setMenuItems(
            !customerSelection.wantedFood
              ? []
              : (Array.isArray(inquiry?.selected_menu) ? inquiry.selected_menu : []).map((item) => {
                  if (item && typeof item === "object") {
                    return menuRow({
                      name: item.name || "",
                      category: item.category || "",
                      note: item.note || "",
                      unit: item.unit || "Pax",
                      price: item.price ? String(item.price) : "",
                      image_url: item.image_url || resolveDishImageUrl({ name: item.name }, menuRes.data || []),
                    });
                  }
                  return menuRow({
                    name: String(item || ""),
                    image_url: resolveDishImageUrl({ name: String(item || "") }, menuRes.data || []),
                  });
                })
          );
        }

        setAddOns(
          (Array.isArray(inquiry?.service_items) ? inquiry.service_items : []).map((item) => {
            if (item && typeof item === "object") {
              return {
                name: item.name || "",
                price: item.price ? String(item.price) : "",
                quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
                note: "",
                pricing_type: "quantity",
              };
            }
            return { name: String(item || ""), price: "", quantity: 1, note: "", pricing_type: "quantity" };
          })
        );

        setExpirationDate(computeDefaultExpiration(inquiry?.event_date));
      })
      .catch(() => {
        if (active) notify("Failed to load quotation details", "error");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [inquiry?._id]);

  /* ---------------------------------------------------------------------------
     Derived Calculations using computeQuotationTotals (No Rewritten Math)
  --------------------------------------------------------------------------- */
  const removedInclusions = useMemo(
    () =>
      inclusions
        .filter((entry) => entry.removed)
        .map((entry) => ({ name: String(entry.name || "").trim(), deduction: numberOf(entry.deduction) })),
    [inclusions]
  );

  const keptInclusions = useMemo(
    () =>
      inclusions
        .filter((entry) => !entry.removed)
        .map((entry) => String(entry.name || "").trim())
        .filter(Boolean),
    [inclusions]
  );

  const inclusionAdjustments = useMemo(
    () =>
      inclusions
        .filter(
          (entry) =>
            !entry.removed &&
            entry.baseQuantity !== null &&
            entry.baseQuantity !== undefined &&
            Number(entry.quantity) !== Number(entry.baseQuantity)
        )
        .map((entry) => ({
          name: String(entry.name || "").trim(),
          base_quantity: Number(entry.baseQuantity) || 0,
          quantity: Number(entry.quantity) || 0,
          unit_price: numberOf(entry.unitPrice),
        }))
        .filter((entry) => entry.name),
    [inclusions]
  );

  const chargeableMenuItems = useMemo(
    () => (cateringIncluded ? menuItems.filter((item) => !item.removed) : []),
    [cateringIncluded, menuItems]
  );

  const chargeableAddOns = useMemo(() => addOns.filter((item) => !item.removed), [addOns]);

  const pricingInput = useMemo(
    () => ({
      is_special_offer: isSpecial,
      booking_type: isSpecial ? "special" : "regular",
      package_starting_price: startingPrice,
      removed_inclusions: removedInclusions,
      inclusion_adjustments: inclusionAdjustments,
      guest_count: details.guest_count,
      menu_items: isSpecial ? [] : chargeableMenuItems,
      add_ons: chargeableAddOns,
      transportation_fee: transportationFee,
      additional_fees: additionalFees,
      taxes,
      discounts,
      deposit_amount: depositAmount,
    }),
    [
      isSpecial,
      startingPrice,
      removedInclusions,
      inclusionAdjustments,
      details.guest_count,
      chargeableMenuItems,
      chargeableAddOns,
      transportationFee,
      additionalFees,
      taxes,
      discounts,
      depositAmount,
    ]
  );

  // Authoritative totals from quotationPricing.js
  const totals = useMemo(() => computeQuotationTotals(pricingInput), [pricingInput]);

  const resolvedEventType =
    details.event_type === OTHER_EVENT_TYPE
      ? String(details.event_type_other || "").trim()
      : details.event_type;

  const eventSpace = useMemo(() => {
    if (scaffoldWidth && scaffoldLength) {
      return `${scaffoldWidth}×${scaffoldLength}`;
    }
    return eventSpaceLabel(inquiry, packageRecord);
  }, [scaffoldWidth, scaffoldLength, inquiry, packageRecord]);

  const resolvedPalette = useMemo(
    () =>
      String(details.event_palette || "")
        .split(",")
        .map((colour) => colour.trim())
        .filter(Boolean),
    [details.event_palette]
  );

  const quotationPayload = useMemo(
    () => ({
      inquiry_id: inquiry?._id,
      package_id: packageRecord?._id || inquiry?.package_id || undefined,
      package_name: packageName || "Custom Package",
      booking_type: isSpecial ? "special" : "regular",
      is_special_offer: isSpecial,
      offer_price_per_guest: isSpecial ? offerContext?.perPax : undefined,
      offer_food_snapshot: isSpecial && offerContext ? offerContext.foodItems.map(f => ({ menu_category: f.category, item_name: f.name })) : undefined,
      event_space_label: eventSpace || undefined,
      package_starting_price: totals.startingPrice,
      package_price: totals.packagePrice,
      package_inclusions: keptInclusions,
      removed_inclusions: removedInclusions.filter((entry) => entry.name),
      inclusion_adjustments: inclusionAdjustments.map((entry) => ({
        ...entry,
        amount: inclusionAdjustmentAmount(entry),
      })),
      guest_count: totals.guestCount,
      menu_items: isSpecial
        ? (offerContext?.foodItems || []).map((item) => ({
            name: String(item.name || "").trim(),
            category: String(item.category || "").trim(),
            note: "Included in combo package",
            pricing_type: "per_guest",
            quantity: 1,
            unit: "Included",
            price: 0,
            image_url: String(item.image_url || resolveDishImageUrl(item, catalogMenuItems) || ""),
          }))
        : chargeableMenuItems.map((item) => ({
            name: String(item.name || "").trim(),
            category: String(item.category || "").trim(),
            note: String(item.note || "").trim(),
            pricing_type: MENU_PRICING.QUANTITY,
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit: String(item.unit || "").trim(),
            price: money(item.price),
            image_url: String(item.image_url || resolveDishImageUrl(item, catalogMenuItems) || ""),
          })),
      add_ons: chargeableAddOns.map((item) => ({
        name: String(item.name || "").trim(),
        price: money(item.price),
        quantity: Math.max(1, Number(item.quantity) || 1),
        note: String(item.note || "").trim(),
        pricing_type: "quantity",
      })),
      transportation_fee: money(transportationFee),
      additional_fees: additionalFees
        .filter((fee) => String(fee.name || "").trim() || numberOf(fee.amount))
        .map((fee) => ({ name: String(fee.name || "").trim(), amount: money(fee.amount) })),
      taxes: totals.taxes,
      discounts: totals.discounts,
      subtotal: totals.subtotal,
      total_cost: totals.totalCost,
      deposit_amount: totals.depositAmount,
      remaining_balance: totals.remainingBalance,
      expiration_date: expirationDate || undefined,
      admin_notes: adminNotes,
    }),
    [
      inquiry?._id,
      inquiry?.package_id,
      packageRecord?._id,
      packageName,
      isSpecial,
      offerContext,
      eventSpace,
      totals,
      keptInclusions,
      removedInclusions,
      inclusionAdjustments,
      chargeableMenuItems,
      chargeableAddOns,
      transportationFee,
      additionalFees,
      expirationDate,
      adminNotes,
    ]
  );

  const pendingChanges = quotation ? diffQuotationVersions(quotation, quotationPayload) : [];

  /* --- Unsaved Work Fingerprint --- */
  const formFingerprint = useMemo(
    () =>
      JSON.stringify({
        quotation: quotationPayload,
        details,
        catering: cateringIncluded,
        scaffold: { selectedScaffoldId, scaffoldWidth, scaffoldLength },
      }),
    [quotationPayload, details, cateringIncluded, selectedScaffoldId, scaffoldWidth, scaffoldLength]
  );

  useEffect(() => {
    if (loading) return;
    if (savedBaseline.current === null) savedBaseline.current = formFingerprint;
  }, [loading, formFingerprint]);

  const isDirty = !loading && savedBaseline.current !== null && savedBaseline.current !== formFingerprint;

  /* --- Warnings --- */
  const warnings = useMemo(() => {
    const notes = [];
    const depositShare = totals.totalCost > 0 ? (totals.depositAmount / totals.totalCost) * 100 : 0;

    if (!totals.startingPrice && !inquiry?.is_custom_setup && packageRecord && !isFoodOnly) {
      notes.push(
        `${packageRecord.name || "This package"} has a starting price of 0. Ensure the baseline is set correctly.`
      );
    }
    if (totals.depositAmount > 0 && depositShare < 10) {
      notes.push(`The deposit covers ${depositShare.toFixed(0)}% of the total. Standard is ${depositPercentage}%.`);
    }
    if (cateringIncluded && chargeableMenuItems.length === 0 && !offerContext) {
      notes.push("Catering is included, but no menu dishes are currently quoted.");
    }
    if (maxValidityDate && maxValidityDate < todayInput()) {
      notes.push("This event is scheduled within the 3-day window. Expedited coordination is advised.");
    }
    return notes;
  }, [totals, inquiry?.is_custom_setup, packageRecord, depositPercentage, cateringIncluded, chargeableMenuItems.length, offerContext, isFoodOnly, maxValidityDate]);

  /* --- Validation --- */
  const validate = () => {
    const found = {};
    if (!String(details.contact_first_name || "").trim()) found.contact_first_name = "Enter customer's first name.";
    if (!String(details.contact_last_name || "").trim()) found.contact_last_name = "Enter customer's last name.";
    if (!String(details.contact_email || "").trim()) found.contact_email = "Email address is required.";
    else if (!EMAIL_PATTERN.test(String(details.contact_email).trim())) found.contact_email = "Invalid email format.";
    if (!String(details.contact_phone || "").trim()) found.contact_phone = "Contact phone is required.";
    if (!details.event_date) found.event_date = "Event date is required.";
    else if (details.event_date < todayInput()) found.event_date = "Event date cannot be in the past.";
    if (!details.start_time) found.start_time = "Start time is required.";
    if (!Number(details.guest_count) || Number(details.guest_count) < 1) found.guest_count = "Guest count is required.";

    if (totals.totalCost <= 0) found.total_cost = "Quotation total must be greater than zero.";

    if (!numberOf(depositAmount)) {
      found.deposit_amount = "A deposit amount is required.";
    } else if (money(depositAmount) > totals.totalCost) {
      found.deposit_amount = `Deposit cannot exceed total cost of ${formatCurrency(totals.totalCost)}.`;
    }

    if (!expirationDate) {
      found.expiration_date = "Expiration date is required.";
    } else if (expirationDate < todayInput()) {
      found.expiration_date = "Expiration date cannot be in the past.";
    } else if (maxValidityDate && expirationDate > maxValidityDate) {
      found.expiration_date = `Must expire at least 3 days before event (by ${formatShortDate(maxValidityDate)}).`;
    }

    return found;
  };

  const clearError = (key) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setDetail = (key, value) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
    clearError(key);
    if (key === "guest_count" && isSpecial) {
      const g = Math.max(1, Number(value) || 1);
      const perPax =
        offerPricePerPax(packageRecord) ||
        Number(packageRecord?.price_per_guest) ||
        (Number(inquiry?.guest_count) && Number(inquiry?.offer_base_price)
          ? Number(inquiry.offer_base_price) / Number(inquiry.guest_count)
          : 0);
      if (perPax > 0) {
        setStartingPrice(String(Math.round(perPax * g * 100) / 100));
      }
    }
  };

  const handleServiceTypeChange = (value) => {
    const cleanType = String(value || "").replace(/^Custom Quote\s*-\s*/i, "").trim();
    setDetails((prev) => ({
      ...prev,
      service_type: cleanType,
      include_food: cleanType !== SERVICE_TYPES.SETUP_ONLY,
    }));
    clearError("service_type");
  };

  /* --- Inclusions Handlers --- */
  const handleInclusionQuantity = (index, value) => {
    setInclusions((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, quantity: value === "" ? "" : Number(value) } : entry))
    );
  };

  const handleInclusionUnitPrice = (index, value) => {
    setInclusions((prev) => prev.map((entry, i) => (i === index ? { ...entry, unitPrice: value } : entry)));
  };

  const handleInclusionDeduction = (index, value) => {
    setInclusions((prev) => prev.map((entry, i) => (i === index ? { ...entry, deduction: value } : entry)));
  };

  const toggleInclusionRemoved = (index) => {
    setInclusions((prev) =>
      prev.map((entry, i) =>
        i === index
          ? {
              ...entry,
              removed: !entry.removed,
              deduction: !entry.removed ? entry.deduction || "" : "",
            }
          : entry
      )
    );
  };

  /* --- Menu Handlers --- */
  const handleMenuChange = (index, field, value) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    clearError(`menu_items.${index}.${field}`);
  };

  const toggleMenuRemoved = (index) => {
    setMenuItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
  };

  const handleDeleteMenu = (index) => {
    setMenuItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogDish = (dish) => {
    setMenuItems((prev) => [
      ...prev,
      menuRow({
        name: dish.name,
        category: dish.category || "",
        price: dish.price ? String(dish.price) : "",
        unit: dish.unit || "Pax",
        quantity: 1,
        image_url: dish.image_url || "",
      }),
    ]);
  };

  const handleAddCustomDish = (name) => {
    if (!name.trim()) return;
    setMenuItems((prev) => [
      ...prev,
      menuRow({
        name: name.trim(),
        category: "Custom",
        price: "",
        unit: "Pax",
        quantity: 1,
      }),
    ]);
  };

  /* --- Special Offer Food Replacement Handlers --- */
  const handleSpecialOfferDishReplace = (category, oldDishName, newDishName) => {
    const dishImg = resolveDishImageUrl({ name: newDishName }, catalogMenuItems) || "";
    setMenuItems((prev) => {
      const cleanCat = (category || "").toLowerCase();
      const targetIdx = prev.findIndex(
        (m) =>
          !m.removed &&
          (m.category || "").toLowerCase() === cleanCat &&
          (m.name || "").trim().toLowerCase() === (oldDishName || "").trim().toLowerCase()
      );
      if (targetIdx !== -1) {
        const next = [...prev];
        next[targetIdx] = menuRow({
          name: newDishName,
          category: category,
          note: "Included in combo package",
          unit: "Included",
          price: 0,
          quantity: 1,
          image_url: dishImg,
        });
        return next;
      }
      return [
        ...prev,
        menuRow({
          name: newDishName,
          category: category,
          note: "Included in combo package",
          unit: "Included",
          price: 0,
          quantity: 1,
          image_url: dishImg,
        }),
      ];
    });
  };

  const handleSpecialOfferDishRemove = (dishName, category) => {
    setMenuItems((prev) =>
      prev.filter((m) => {
        const sameName = (m.name || "").trim().toLowerCase() === (dishName || "").trim().toLowerCase();
        const sameCat = !category || (m.category || "").toLowerCase() === (category || "").toLowerCase();
        return !(sameName && sameCat);
      })
    );
  };

  const handleSpecialOfferDishSelect = (dishName, category) => {
    const dishImg = resolveDishImageUrl({ name: dishName }, catalogMenuItems) || "";
    setMenuItems((prev) => {
      if (prev.some((m) => !m.removed && (m.name || "").trim().toLowerCase() === (dishName || "").trim().toLowerCase())) {
        return prev;
      }
      return [
        ...prev,
        menuRow({
          name: dishName,
          category: category,
          note: "Included in combo package",
          unit: "Included",
          price: 0,
          quantity: 1,
          image_url: dishImg,
        }),
      ];
    });
  };

  const handleResetSpecialOfferFood = () => {
    const original = (Array.isArray(inquiry?.offer_food_snapshot) && inquiry.offer_food_snapshot.length > 0)
      ? inquiry.offer_food_snapshot.map((item) => ({ name: item.item_name, category: item.menu_category || "", image_url: item.image_url || "" }))
      : (packageRecord ? offerFoodItems(packageRecord).map((item) => ({ name: item.item_name, category: item.menu_category || "", image_url: item.image_url || "" })) : []);

    setMenuItems(
      original.map(({ name, category, image_url }) =>
        menuRow({
          name,
          category,
          note: "Covered by combo package",
          price: 0,
          unit: "Included",
          quantity: 1,
          image_url: image_url || resolveDishImageUrl({ name }, catalogMenuItems) || "",
        })
      )
    );
  };

  /* --- Add-on Handlers --- */
  const handleAddOnChange = (index, field, value) => {
    setAddOns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
    clearError(`add_ons.${index}.${field}`);
  };

  const toggleAddOnRemoved = (index) => {
    setAddOns((prev) =>
      prev.map((item, i) => (i === index ? { ...item, removed: !item.removed } : item))
    );
  };

  const handleDeleteAddOn = (index) => {
    setAddOns((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCatalogAddon = (addon) => {
    setAddOns((prev) => [
      ...prev,
      {
        name: addon.name,
        price: addon.price ? String(addon.price) : "",
        quantity: 1,
        note: "",
        pricing_type: "quantity",
      },
    ]);
  };

  const handleAddCustomAddon = (name) => {
    if (!name.trim()) return;
    setAddOns((prev) => [
      ...prev,
      {
        name: name.trim(),
        price: "",
        quantity: 1,
        note: "",
        pricing_type: "quantity",
      },
    ]);
  };

  /* --- Fee Handlers --- */
  const handleFeeChange = (index, field, value) => {
    setAdditionalFees((prev) =>
      prev.map((fee, i) => (i === index ? { ...fee, [field]: value } : fee))
    );
  };

  const handleRemoveFee = (index) => {
    setAdditionalFees((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddFee = () => {
    setAdditionalFees((prev) => [...prev, { name: "", amount: "", isOvertime: false }]);
  };

  /* --- Draft & Submit Handlers --- */
  const draftDetails = () => ({
    contact_first_name: details.contact_first_name,
    contact_last_name: details.contact_last_name,
    contact_email: details.contact_email,
    contact_phone: details.contact_phone,
    event_type: resolvedEventType,
    event_date: details.event_date,
    start_time: details.start_time,
    guest_count: String(details.guest_count || ""),
    service_type: details.service_type,
    include_food: cateringIncluded,
    event_theme: String(details.event_theme || "").trim(),
    event_palette: resolvedPalette,
    venue_type: details.venue_type,
    province: details.province,
    municipality: details.municipality,
    barangay: details.barangay,
    street: details.street,
    landmark: details.landmark,
    zip_code: details.zip_code,
    selected_scaffold_option_id: isCustomScaffold || !selectedScaffoldId ? null : selectedScaffoldId,
    scaffold_width: scaffoldWidth ? Number(scaffoldWidth) : null,
    scaffold_length: scaffoldLength ? Number(scaffoldLength) : null,
    scaffold_base_area: scaffoldWidth && scaffoldLength ? Number(scaffoldWidth) * Number(scaffoldLength) : null,
    scaffold_price: selectedScaffoldPrice != null ? selectedScaffoldPrice : undefined,
  });

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const { data } = await AdminAPI.saveQuotationDraft({
        ...quotationPayload,
        draft_details: draftDetails(),
      });
      setSavedDraft(data);
      setDraftSavedAt(formatSavedAt(data?.updatedAt || new Date().toISOString()));
      savedBaseline.current = formFingerprint;
      setErrors({});
      return data;
    } catch (err) {
      throw new Error(err.response?.data?.message || "Could not save draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await saveDraft();
      notify("Draft saved successfully", "success", {
        description: "You can close this and resume later from this inquiry.",
      });
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const handleDiscardDraft = async () => {
    if (!savedDraft) return;
    await confirm({
      tone: "destructive",
      title: "Discard this saved draft?",
      description: "The draft and all unsaved adjustments will be permanently deleted.",
      confirmLabel: "Discard draft",
      cancelLabel: "Keep draft",
      onConfirm: async () => {
        await AdminAPI.discardQuotationDraft(inquiry._id);
        setSavedDraft(null);
        setDraftSavedAt(null);
        notify("Draft discarded", "info");
        onSuccess();
      },
    });
  };

  const requestClose = (intent) => {
    if (!isDirty) {
      onClose();
      return;
    }
    setCloseIntent(intent);
  };

  const handleSaveDraftAndClose = async () => {
    await saveDraft();
    setCloseIntent(null);
    notify("Draft saved", "success");
    onSuccess();
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      notify("Please review and resolve the highlighted errors before sending.", "error");
      // If error belongs to a specific step, switch to it
      if (found.contact_first_name || found.event_date || found.guest_count) {
        setActiveStep(1);
      } else if (found.package_name || found.total_cost) {
        setActiveStep(2);
      } else {
        setActiveStep(3);
      }
      return;
    }

    setSubmitting(true);
    try {
      await AdminAPI.updateInquiry(inquiry._id, {
        booking_for: details.booking_for || "myself",
        celebrant_name: String(details.celebrant_name || "").trim(),
        contact_first_name: details.contact_first_name.trim(),
        contact_last_name: details.contact_last_name.trim(),
        contact_email: details.contact_email.trim(),
        contact_phone: details.contact_phone.trim(),
        event_type: resolvedEventType,
        event_date: details.event_date,
        start_time: details.start_time,
        guest_count: totals.guestCount,
        service_type: details.service_type,
        include_food: cateringIncluded,
        event_theme: String(details.event_theme || "").trim(),
        event_palette: resolvedPalette,
        venue_type: details.venue_type.trim(),
        province: details.province,
        municipality: details.municipality,
        barangay: details.barangay,
        street: details.street.trim(),
        landmark: details.landmark.trim(),
        zip_code: details.zip_code.trim(),
        selected_scaffold_option_id: isCustomScaffold || !selectedScaffoldId ? null : selectedScaffoldId,
        scaffold_width: scaffoldWidth ? Number(scaffoldWidth) : null,
        scaffold_length: scaffoldLength ? Number(scaffoldLength) : null,
        scaffold_base_area: scaffoldWidth && scaffoldLength ? Number(scaffoldWidth) * Number(scaffoldLength) : null,
        scaffold_price: selectedScaffoldPrice != null ? selectedScaffoldPrice : undefined,
      });
    } catch (err) {
      setSubmitting(false);
      notify(err.response?.data?.message || "Could not save event details. Please try again.", "error");
      return;
    }

    try {
      await AdminAPI.createQuotation(quotationPayload);
      notify(
        quotation
          ? `Version ${(Number(quotation.version_number) || 1) + 1}.0 sent successfully!`
          : `Quotation sent to ${details.contact_first_name || "the customer"}!`,
        "success"
      );
      onSuccess();
    } catch (err) {
      const serverErrors = err.response?.data?.errors;
      if (serverErrors && typeof serverErrors === "object") {
        setErrors(serverErrors);
      }
      notify(err.response?.data?.message || "Failed to generate quotation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!inquiry) return null;

  const refCode = inquiry?.reference || (inquiry?._id ? inquiry._id.slice(-8).toUpperCase() : "");
  const baseTitle = inquiry?.status === "Revision Requested"
    ? "Revise Quotation"
    : quotation
    ? "Quotation Editor"
    : "Quotation Builder";

  const modalTitle = (
    <div className="flex flex-wrap items-center gap-2 font-sans">
      <span className="font-bold text-slate-900 tracking-tight text-sm sm:text-base">
        {baseTitle}
      </span>
      {refCode && (
        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
          #{refCode}
        </span>
      )}
      {(details.contact_first_name || details.contact_last_name) && (
        <span className="text-xs text-slate-500 font-normal truncate max-w-[220px]">
          &middot; {details.contact_first_name} {details.contact_last_name}
        </span>
      )}
    </div>
  );

  if (loading) {
    return (
      <Modal
        title={modalTitle}
        onClose={onClose}
        bodyClassName="overflow-hidden"
        className="max-w-4xl h-[70vh] flex items-center justify-center quotation-builder-modal font-sans"
      >
        <div className="flex h-full items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title={modalTitle}
      onClose={() => requestClose("leave")}
      bodyClassName="overflow-hidden p-0"
      className="max-w-[1520px] w-[98vw] h-[92vh] flex flex-col quotation-builder-modal font-sans"
    >
      <form onSubmit={handleSubmit} className="flex h-full overflow-hidden flex-col lg:flex-row">
        {/* ------------------------------------------------------------------
            Col 1: Compact Left-side Step Navigation (~210px)
        ------------------------------------------------------------------ */}
        <QuotationNavigation
          activeStep={activeStep}
          setActiveStep={setActiveStep}
          activePricingSection={activePricingSection}
          setActivePricingSection={setActivePricingSection}
          cateringIncluded={cateringIncluded}
          isSpecialOffer={isSpecial}
          offerContext={offerContext}
          errors={errors}
          savedDraft={savedDraft}
          draftSavedAt={draftSavedAt}
          onDiscardDraft={handleDiscardDraft}
        />

        {/* ------------------------------------------------------------------
            Col 2: Spacious Main Editing Area (Flex-1)
        ------------------------------------------------------------------ */}
        <main className="flex-1 h-full overflow-y-auto bg-slate-100/50 p-4 sm:p-6">
          {activeStep === 1 && (
            <CustomerRequestStep
              inquiry={inquiry}
              details={details}
              setDetail={setDetail}
              packageRecord={packageRecord}
              packageName={packageName}
              eventSpace={eventSpace}
              customerSelection={customerSelection}
              cateringIncluded={cateringIncluded}
              isFoodOnly={isFoodOnly}
              isSetupOnly={isSetupOnly}
              offerContext={offerContext}
              isSpecialOffer={isSpecial}
              catalogMenuItems={catalogMenuItems}
              errors={errors}
              isEditMode={isCustomerEditMode}
              setIsEditMode={setIsCustomerEditMode}
              onProceedToPrices={() => setActiveStep(2)}
              today={todayInput()}
              municipalities={municipalities}
              barangays={barangays}
              handleServiceTypeChange={handleServiceTypeChange}
            />
          )}

          {activeStep === 2 && (
            <PricingAdjustmentsStep
              packageName={packageName}
              startingPrice={startingPrice}
              setStartingPrice={setStartingPrice}
              inclusions={inclusions}
              setInclusions={setInclusions}
              handleInclusionQuantity={handleInclusionQuantity}
              handleInclusionUnitPrice={handleInclusionUnitPrice}
              handleInclusionDeduction={handleInclusionDeduction}
              toggleInclusionRemoved={toggleInclusionRemoved}
              scaffoldOptions={scaffoldOptions}
              selectedScaffoldId={selectedScaffoldId}
              handleScaffoldOptionChange={handleScaffoldOptionChange}
              isCustomScaffold={isCustomScaffold}
              scaffoldWidth={scaffoldWidth}
              scaffoldLength={scaffoldLength}
              handleCustomScaffoldChange={handleCustomScaffoldChange}
              isFoodOnly={isFoodOnly}
              isSetupOnly={isSetupOnly}
              cateringIncluded={cateringIncluded}
              isSpecialOffer={isSpecial}
              offerContext={offerContext}
              menuItems={menuItems}
              handleMenuChange={handleMenuChange}
              toggleMenuRemoved={toggleMenuRemoved}
              handleDeleteMenu={handleDeleteMenu}
              packageRecord={packageRecord}
              inquiry={inquiry}
              onReplaceSpecialOfferDish={handleSpecialOfferDishReplace}
              onRemoveSpecialOfferDish={handleSpecialOfferDishRemove}
              onSelectSpecialOfferDish={handleSpecialOfferDishSelect}
              onResetSpecialOfferFood={handleResetSpecialOfferFood}
              catalogMenuItems={catalogMenuItems}
              onAddCatalogDish={handleAddCatalogDish}
              onAddCustomDish={handleAddCustomDish}
              addOns={addOns}
              handleAddOnChange={handleAddOnChange}
              toggleAddOnRemoved={toggleAddOnRemoved}
              handleDeleteAddOn={handleDeleteAddOn}
              catalogAddons={catalogAddons}
              onAddCatalogAddon={handleAddCatalogAddon}
              onAddCustomAddon={handleAddCustomAddon}
              transportationFee={transportationFee}
              setTransportationFee={setTransportationFee}
              includeOvertime={includeOvertime}
              setIncludeOvertime={setIncludeOvertime}
              overtimeMode={overtimeMode}
              setOvertimeMode={setOvertimeMode}
              overtimeHours={overtimeHours}
              setOvertimeHours={setOvertimeHours}
              crewCount={crewCount}
              setCrewCount={setCrewCount}
              hourlyRatePerCrew={hourlyRatePerCrew}
              setHourlyRatePerCrew={setHourlyRatePerCrew}
              flatOvertimeFee={flatOvertimeFee}
              setFlatOvertimeFee={setFlatOvertimeFee}
              computedOvertimeAmount={computedOvertimeAmount}
              additionalFees={additionalFees}
              handleFeeChange={handleFeeChange}
              handleRemoveFee={handleRemoveFee}
              handleAddFee={handleAddFee}
              discounts={discounts}
              setDiscounts={setDiscounts}
              taxes={taxes}
              setTaxes={setTaxes}
              errors={errors}
              onProceedToReview={() => setActiveStep(3)}
            />
          )}

          {activeStep === 3 && (
            <ReviewSendStep
              totals={totals}
              details={details}
              packageName={packageName}
              eventSpace={eventSpace}
              chargeableMenuItems={chargeableMenuItems}
              chargeableAddOns={chargeableAddOns}
              transportationFee={transportationFee}
              additionalFees={additionalFees}
              isSpecialOffer={isSpecial}
              offerContext={offerContext}
              catalogMenuItems={catalogMenuItems}
              depositAmount={depositAmount}
              setDepositAmount={setDepositAmount}
              depositPercentage={depositPercentage}
              expirationDate={expirationDate}
              setExpirationDate={setExpirationDate}
              maxValidityDate={maxValidityDate}
              adminNotes={adminNotes}
              setAdminNotes={setAdminNotes}
              quotation={quotation}
              pendingChanges={pendingChanges}
              errors={errors}
              warnings={warnings}
              submitting={submitting}
              savingDraft={savingDraft}
              today={todayInput()}
              onBackToPrices={() => setActiveStep(2)}
              onSaveDraft={handleSaveDraft}
            />
          )}
        </main>

        {/* ------------------------------------------------------------------
            Col 3: Compact Sticky Live Summary (~280px)
        ------------------------------------------------------------------ */}
        <QuotationLiveSummary
          totals={totals}
          activeStep={activeStep}
          onNextStep={() => {
            if (activeStep === 1) setActiveStep(2);
            else if (activeStep === 2) setActiveStep(3);
            else handleSubmit();
          }}
          onPrevStep={() => {
            if (activeStep > 1) setActiveStep(activeStep - 1);
          }}
          onSaveDraft={handleSaveDraft}
          submitting={submitting}
          savingDraft={savingDraft}
          quotation={quotation}
          savedDraft={savedDraft}
          cateringIncluded={cateringIncluded}
          chargeableMenuItemsCount={chargeableMenuItems.length}
          chargeableAddOnsCount={chargeableAddOns.length}
          transportationFee={transportationFee}
          additionalFees={additionalFees}
          eventSpace={eventSpace}
          isFoodOnly={isFoodOnly}
          isSetupOnly={isSetupOnly}
          offerContext={offerContext}
          contactName={details.contact_first_name}
          isCollapsed={isSummaryCollapsed}
          setIsCollapsed={setIsSummaryCollapsed}
        />
      </form>

      {/* Unsaved Changes Confirmation Dialogs */}
      {closeIntent === "leave" && (
        <FeedbackDialog
          open
          onOpenChange={(open) => !open && setCloseIntent(null)}
          tone="warning"
          title="Save this quotation as a draft before leaving?"
          description="You have unsaved changes. Save them as a draft to pick this up later without losing progress."
          confirmLabel="Save as draft"
          confirmIcon={Save}
          cancelLabel="Keep editing"
          onConfirm={handleSaveDraftAndClose}
          tertiary={{
            label: "Discard changes",
            tone: "destructive",
            onClick: () => {
              setCloseIntent(null);
              onClose();
            },
          }}
        />
      )}

      {closeIntent === "cancel" && (
        <FeedbackDialog
          open
          onOpenChange={(open) => !open && setCloseIntent(null)}
          tone="destructive"
          title="Discard changes and exit?"
          description="Any changes you have made will be lost."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          onConfirm={() => {
            setCloseIntent(null);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}
