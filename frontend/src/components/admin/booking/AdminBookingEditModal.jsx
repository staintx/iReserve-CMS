import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Check,
  Plus,
  Minus,
  Trash2,
  Calendar,
  Clock,
  Users,
  MapPin,
  CreditCard,
  Utensils,
  Package as PackageIcon,
  Sparkles,
  ChevronDown,
  Search,
  AlertCircle,
  ArrowRight,
  Save,
  RotateCcw,
  FileText,
  DollarSign,
  Layers,
  CheckCircle2,
  Info,
  Ruler,
  Truck,
  Palette,
  Phone,
  Mail,
  User,
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../ui/dialog";
import { AdminAPI } from "../../../api/admin";
import useToast from "../../../hooks/useToast";
import { formatCurrency } from "../../../utils/format";
import { getBatangasMunicipalities, getBatangasBarangays, BATANGAS_PROVINCE } from "../../../utils/batangas";
import { EVENT_TYPES, OTHER_EVENT_TYPE, matchEventType, isOtherEventType } from "../../../lib/eventTypes";
import { VENUE_TYPES, OTHER_VENUE_TYPE, isCustomVenueType, SERVICE_TYPES } from "../../../pages/customer/booking/lib/bookingRules";
import { eventSpaceLabel } from "../../../lib/packageDisplay";
import { resolveGroup, CATEGORY_GROUPS } from "../../../lib/menuCategories";
import { money, MENU_PRICING, menuLineTotal, addOnLineTotal, menuAmountLabel, derivePackageStartingPrice } from "../../../utils/quotationPricing";
import AdminOcularDateTimePicker from "../ui/AdminOcularDateTimePicker";

const safeDateToIsoString = (val) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
  } catch {
    return "";
  }
};

export default function AdminBookingEditModal({
  open,
  onClose,
  booking,
  totalPaid = 0,
  onSaved,
}) {
  const { notify } = useToast();

  // Active section tab
  const [activeTab, setActiveTab] = useState("specs"); // 'specs' | 'package_scaffold' | 'menu' | 'addons' | 'fees_discounts'
  
  // Catalogs
  const [packagesList, setPackagesList] = useState([]);
  const [menuCatalog, setMenuCatalog] = useState([]);
  const [addonCatalog, setAddonCatalog] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(false);

  // Form State
  const [form, setForm] = useState({
    event_type: "",
    event_type_other: "",
    booking_for: "myself",
    celebrant_name: "",
    event_date: "",
    start_time: "12:00",
    duration_hours: 4,
    guest_count: 1,
    service_type: SERVICE_TYPES.FULL_SERVICE,
    delivery_method: "setup",
    venue_type: "",
    venue_type_other: "",
    province: BATANGAS_PROVINCE,
    municipality: "",
    barangay: "",
    street: "",
    landmark: "",
    zip_code: "",
    event_theme: "",
    special_requests: "",
    dietary_restrictions: "",
    allergies: "",
    contact_first_name: "",
    contact_last_name: "",
    contact_email: "",
    contact_phone: "",
    contact_alt_phone: "",
    package_id: "",
    selected_scaffold_option_id: "",
    scaffold_width: "",
    scaffold_length: "",
    scaffold_price: "",
    custom_scaffold: false,
    revision_note: "",
  });

  // Items State
  const [menuItems, setMenuItems] = useState([]);
  const [serviceItems, setServiceItems] = useState([]);
  const [additionalCharges, setAdditionalCharges] = useState([]);
  const [transportationFee, setTransportationFee] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  // Menu Search & Filter
  const [dishSearch, setDishSearch] = useState("");
  const [activeCourseTab, setActiveCourseTab] = useState("all");

  // Addon Search & Custom
  const [addonSearch, setAddonSearch] = useState("");
  const [customAddon, setCustomAddon] = useState({ name: "", price: "", quantity: 1, pricing_type: "fixed" });
  const [showCustomAddonForm, setShowCustomAddonForm] = useState(false);

  // Pre-save Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Catalogs on open
  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoadingCatalogs(true);

    Promise.allSettled([
      AdminAPI.getPackages(),
      AdminAPI.getMenu(),
      AdminAPI.getAddons(),
    ])
      .then(([pkgRes, menuRes, addonRes]) => {
        if (!alive) return;
        setPackagesList(pkgRes.status === "fulfilled" ? pkgRes.value?.data || [] : []);
        setMenuCatalog(menuRes.status === "fulfilled" ? menuRes.value?.data || [] : []);
        setAddonCatalog(addonRes.status === "fulfilled" ? addonRes.value?.data || [] : []);
      })
      .finally(() => {
        if (alive) setLoadingCatalogs(false);
      });

    return () => {
      alive = false;
    };
  }, [open]);

  // Initialize form from booking
  useEffect(() => {
    if (!open || !booking) return;

    const rawEventType = booking.event_type || "";
    const eventTypeIsOther = isOtherEventType(rawEventType);
    const rawVenueType = booking.venue_type || "";
    const venueTypeIsOther = isCustomVenueType({ venue_type: rawVenueType });

    const pkgId = booking.package_id?._id || booking.package_id || "";

    setForm({
      event_type: eventTypeIsOther ? OTHER_EVENT_TYPE : matchEventType(rawEventType) || rawEventType,
      event_type_other: eventTypeIsOther ? rawEventType : "",
      booking_for: booking.booking_for || "myself",
      celebrant_name: booking.celebrant_name || "",
      event_date: safeDateToIsoString(booking.event_date),
      start_time: booking.start_time || "12:00",
      duration_hours: booking.duration_hours || 4,
      guest_count: Number(booking.guest_count) || 1,
      service_type: booking.service_type || SERVICE_TYPES.FULL_SERVICE,
      delivery_method: booking.delivery_method || "setup",
      venue_type: venueTypeIsOther ? OTHER_VENUE_TYPE : rawVenueType,
      venue_type_other: venueTypeIsOther ? rawVenueType : "",
      province: booking.province || BATANGAS_PROVINCE,
      municipality: booking.municipality || "",
      barangay: booking.barangay || "",
      street: booking.street || "",
      landmark: booking.landmark || "",
      zip_code: booking.zip_code || "",
      event_theme: booking.event_theme || "",
      special_requests: booking.special_requests || "",
      dietary_restrictions: booking.dietary_restrictions || "",
      allergies: booking.allergies || "",
      contact_first_name: booking.contact_first_name || "",
      contact_last_name: booking.contact_last_name || "",
      contact_email: booking.contact_email || "",
      contact_phone: booking.contact_phone || "",
      contact_alt_phone: booking.contact_alt_phone || "",
      package_id: pkgId,
      selected_scaffold_option_id: booking.selected_scaffold_option_id || "",
      scaffold_width: booking.scaffold_width || "",
      scaffold_length: booking.scaffold_length || "",
      scaffold_price: booking.scaffold_price || "",
      custom_scaffold: Boolean(!booking.selected_scaffold_option_id && (booking.scaffold_width || booking.scaffold_length)),
      revision_note: "",
    });

    // Menu Items
    const initialMenu = Array.isArray(booking.menu_items)
      ? booking.menu_items.map((item) => ({
          name: item.name || "",
          category: item.category || "Main",
          note: item.note || "",
          quantity: Math.max(1, Number(item.quantity) || 1),
          unit: item.unit || "",
          pricing_type: item.pricing_type || MENU_PRICING.PER_GUEST,
          price: Number(item.price) || 0,
        }))
      : [];
    setMenuItems(initialMenu);

    // Add-ons / Service Items
    const initialAddons = Array.isArray(booking.service_items)
      ? booking.service_items.map((item) => ({
          name: item.name || "",
          quantity: Math.max(1, Number(item.quantity) || 1),
          price: Number(item.price) || 0,
          note: item.note || "",
          pricing_type: item.pricing_type || "fixed",
        }))
      : [];
    setServiceItems(initialAddons);

    // Additional Charges & Fees
    let initialTranspo = 0;
    const initialOtherCharges = [];
    (Array.isArray(booking.additional_charges) ? booking.additional_charges : []).forEach((c) => {
      const amt = Number(c?.amount) || 0;
      if (String(c?.name || "").toLowerCase().includes("transport")) {
        initialTranspo = amt;
      } else {
        initialOtherCharges.push({ name: c.name || "Additional Fee", amount: amt });
      }
    });
    setTransportationFee(initialTranspo);
    setAdditionalCharges(initialOtherCharges);

    // Discounts & Taxes
    setDiscountAmount(Number(booking.discount_amount) || 0);
    setTaxAmount(Number(booking.tax_amount) || 0);

    setActiveTab("specs");
    setShowConfirmModal(false);
  }, [open, booking]);

  // Selected Package Object
  const selectedPackage = useMemo(() => {
    if (!form.package_id) return null;
    return packagesList.find((p) => String(p._id) === String(form.package_id)) || (booking?.package_id && typeof booking.package_id === "object" ? booking.package_id : null);
  }, [form.package_id, packagesList, booking]);

  // Scaffold Options for chosen package
  const scaffoldOptions = useMemo(() => {
    return Array.isArray(selectedPackage?.scaffold_size_options)
      ? selectedPackage.scaffold_size_options
      : [];
  }, [selectedPackage]);

  // Batangas Municipalities & Barangays
  const municipalities = useMemo(() => getBatangasMunicipalities(), []);
  const barangays = useMemo(() => getBatangasBarangays(form.municipality), [form.municipality]);

  // Calculate Base Package / Scaffold Price
  const basePackagePrice = useMemo(() => {
    if (!selectedPackage) return 0;
    
    // If a scaffold option is chosen from the package
    if (form.selected_scaffold_option_id && !form.custom_scaffold) {
      const matched = scaffoldOptions.find(
        (opt, idx) => String(opt._id) === String(form.selected_scaffold_option_id) || String(idx) === String(form.selected_scaffold_option_id)
      );
      if (matched && Number(matched.price) > 0) {
        return Number(matched.price);
      }
    }

    // Custom scaffold price if specified
    if (form.custom_scaffold && Number(form.scaffold_price) > 0) {
      return Number(form.scaffold_price);
    }

    // Otherwise derive from package setup or guest rate
    const inquiryLike = {
      package_id: selectedPackage,
      service_type: form.service_type,
      scaffold_price: Number(form.scaffold_price) || 0,
      offer_base_price: selectedPackage.offer_base_price || 0,
    };
    return derivePackageStartingPrice(inquiryLike, form.guest_count);
  }, [selectedPackage, form.selected_scaffold_option_id, form.custom_scaffold, form.scaffold_price, form.service_type, form.guest_count, scaffoldOptions]);

  // Menu subtotal
  const menuSubtotal = useMemo(() => {
    const guestCount = Math.max(1, Number(form.guest_count) || 1);
    return money(
      menuItems.reduce((sum, item) => sum + menuLineTotal(item, guestCount), 0)
    );
  }, [menuItems, form.guest_count]);

  // Add-ons subtotal
  const addOnsSubtotal = useMemo(() => {
    return money(
      serviceItems.reduce((sum, item) => sum + addOnLineTotal(item), 0)
    );
  }, [serviceItems]);

  // Additional fees subtotal
  const additionalFeesSubtotal = useMemo(() => {
    const charges = additionalCharges.reduce((sum, c) => sum + money(c.amount), 0);
    return money(money(transportationFee) + charges);
  }, [transportationFee, additionalCharges]);

  // Subtotal before tax and discount
  const computedSubtotal = useMemo(() => {
    return money(basePackagePrice + menuSubtotal + addOnsSubtotal + additionalFeesSubtotal);
  }, [basePackagePrice, menuSubtotal, addOnsSubtotal, additionalFeesSubtotal]);

  // Updated Total Cost
  const updatedTotalCost = useMemo(() => {
    const rawTotal = computedSubtotal + money(taxAmount) - money(discountAmount);
    return money(Math.max(0, rawTotal));
  }, [computedSubtotal, taxAmount, discountAmount]);

  // Remaining Balance = Updated Total Cost - Total Paid
  const currentPaid = Number(totalPaid) || 0;
  const newRemainingBalance = useMemo(() => {
    return money(Math.max(0, updatedTotalCost - currentPaid));
  }, [updatedTotalCost, currentPaid]);

  const originalTotal = Number(booking?.total_price) || 0;
  const priceDifference = money(updatedTotalCost - originalTotal);

  // Menu Catalog Filtering
  const groupedMenuCatalog = useMemo(() => {
    const byId = new Map();
    (menuCatalog || []).forEach((item) => {
      const group = resolveGroup(item?.category);
      if (!byId.has(group.id)) byId.set(group.id, { ...group, items: [] });
      byId.get(group.id).items.push(item);
    });
    const order = CATEGORY_GROUPS.map((group) => group.id);
    return [...byId.values()].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [menuCatalog]);

  const filteredCatalogDishes = useMemo(() => {
    const q = dishSearch.trim().toLowerCase();
    return groupedMenuCatalog
      .filter((group) => activeCourseTab === "all" || group.id === activeCourseTab)
      .map((group) => {
        const matchingItems = q
          ? group.items.filter(
              (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q)
            )
          : group.items;
        return { ...group, items: matchingItems };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedMenuCatalog, activeCourseTab, dishSearch]);

  // Add dish from catalog
  const handleAddDish = (dish) => {
    const already = menuItems.find((m) => m.name.toLowerCase() === dish.name.toLowerCase());
    if (already) {
      notify(`"${dish.name}" is already in the selected menu.`, "info");
      return;
    }
    const defaultPricingType = dish.pricing_type || MENU_PRICING.PER_GUEST;
    const defaultPrice = Number(dish.price) || 0;
    setMenuItems((prev) => [
      ...prev,
      {
        name: dish.name,
        category: dish.category || "Main",
        note: "",
        quantity: 1,
        unit: dish.unit || "",
        pricing_type: defaultPricingType,
        price: defaultPrice,
      },
    ]);
  };

  // Remove dish
  const handleRemoveDish = (index) => {
    setMenuItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update dish field
  const handleUpdateDish = (index, field, val) => {
    setMenuItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Add-on Catalog Filtering
  const filteredAddonCatalog = useMemo(() => {
    const q = addonSearch.trim().toLowerCase();
    return (addonCatalog || []).filter((item) => {
      if (item.available === false) return false;
      if (!q) return true;
      return item.name?.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
    });
  }, [addonCatalog, addonSearch]);

  // Add add-on from catalog
  const handleAddAddon = (item) => {
    const already = serviceItems.find((s) => s.name.toLowerCase() === item.name.toLowerCase());
    if (already) {
      // Increment quantity
      setServiceItems((prev) =>
        prev.map((s) =>
          s.name.toLowerCase() === item.name.toLowerCase()
            ? { ...s, quantity: (Number(s.quantity) || 1) + 1 }
            : s
        )
      );
      return;
    }
    setServiceItems((prev) => [
      ...prev,
      {
        name: item.name,
        quantity: 1,
        price: Number(item.price) || 0,
        note: item.description || "",
        pricing_type: item.pricing_type || "fixed",
      },
    ]);
  };

  // Add custom add-on
  const handleAddCustomAddon = () => {
    if (!customAddon.name.trim()) {
      notify("Please enter a name for the custom service/add-on.", "error");
      return;
    }
    setServiceItems((prev) => [
      ...prev,
      {
        name: customAddon.name.trim(),
        quantity: Math.max(1, Number(customAddon.quantity) || 1),
        price: money(customAddon.price),
        note: "Custom admin add-on",
        pricing_type: customAddon.pricing_type || "fixed",
      },
    ]);
    setCustomAddon({ name: "", price: "", quantity: 1, pricing_type: "fixed" });
    setShowCustomAddonForm(false);
  };

  // Remove add-on
  const handleRemoveAddon = (index) => {
    setServiceItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Update add-on field
  const handleUpdateAddon = (index, field, val) => {
    setServiceItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Add additional fee
  const handleAddCustomFee = () => {
    setAdditionalCharges((prev) => [...prev, { name: "Custom Fee", amount: 0 }]);
  };

  const handleUpdateCustomFee = (index, field, val) => {
    setAdditionalCharges((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleRemoveCustomFee = (index) => {
    setAdditionalCharges((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Validation before opening confirm modal
  const handleInitiateSave = () => {
    if (!form.event_date) {
      notify("Please select a target event date.", "error");
      setActiveTab("specs");
      return;
    }
    if (!form.start_time) {
      notify("Please select a start time.", "error");
      setActiveTab("specs");
      return;
    }
    if (!form.guest_count || Number(form.guest_count) <= 0) {
      notify("Please enter a valid guest count greater than 0.", "error");
      setActiveTab("specs");
      return;
    }
    if (!form.contact_first_name || !form.contact_last_name) {
      notify("Please provide the contact customer's name.", "error");
      setActiveTab("specs");
      return;
    }

    // Open pre-save summary modal
    setShowConfirmModal(true);
  };

  // Final persist to backend
  const handleSaveConfirmed = async () => {
    setSaving(true);
    try {
      const resolvedEventType =
        form.event_type === OTHER_EVENT_TYPE
          ? String(form.event_type_other || "").trim()
          : form.event_type;

      const resolvedVenueType =
        form.venue_type === OTHER_VENUE_TYPE
          ? String(form.venue_type_other || "").trim()
          : form.venue_type;

      // Compile clean additional charges array including transpo
      const allCharges = [];
      if (money(transportationFee) > 0) {
        allCharges.push({ name: "Transportation Fee", amount: money(transportationFee) });
      }
      additionalCharges.forEach((c) => {
        if (c.name && money(c.amount) > 0) {
          allCharges.push({ name: c.name.trim(), amount: money(c.amount) });
        }
      });

      const payload = {
        event_type: resolvedEventType || "Catering Event",
        booking_for: form.booking_for || "myself",
        celebrant_name: form.celebrant_name || "",
        event_date: form.event_date,
        start_time: form.start_time,
        duration_hours: Number(form.duration_hours) || 4,
        guest_count: Number(form.guest_count),
        service_type: form.service_type,
        delivery_method: form.delivery_method,
        venue_type: resolvedVenueType || "Venue",
        province: form.province || BATANGAS_PROVINCE,
        municipality: form.municipality || "",
        barangay: form.barangay || "",
        street: form.street || "",
        landmark: form.landmark || "",
        zip_code: form.zip_code || "",
        event_theme: form.event_theme || "",
        special_requests: form.special_requests || "",
        dietary_restrictions: form.dietary_restrictions || "",
        allergies: form.allergies || "",
        contact_first_name: form.contact_first_name,
        contact_last_name: form.contact_last_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        contact_alt_phone: form.contact_alt_phone,
        package_id: form.package_id || undefined,
        package_name_snapshot: selectedPackage?.name || booking.package_name_snapshot || "",
        selected_scaffold_option_id: form.selected_scaffold_option_id || undefined,
        scaffold_width: form.scaffold_width ? Number(form.scaffold_width) : undefined,
        scaffold_length: form.scaffold_length ? Number(form.scaffold_length) : undefined,
        scaffold_price: form.scaffold_price ? Number(form.scaffold_price) : undefined,
        menu_items: menuItems.map((item) => ({
          name: item.name,
          category: item.category,
          note: item.note,
          quantity: Number(item.quantity) || 1,
          unit: item.unit,
          pricing_type: item.pricing_type,
          price: Number(item.price) || 0,
        })),
        service_items: serviceItems.map((item) => ({
          name: item.name,
          quantity: Number(item.quantity) || 1,
          price: Number(item.price) || 0,
          note: item.note,
          pricing_type: item.pricing_type || "fixed",
        })),
        additional_charges: allCharges,
        subtotal: computedSubtotal,
        discount_amount: money(discountAmount),
        tax_amount: money(taxAmount),
        total_price: updatedTotalCost,
        revision_note: form.revision_note ? form.revision_note.trim() : "Admin updated booking specifications and pricing",
      };

      await AdminAPI.updateBooking(booking._id, payload);
      notify("Booking details and pricing updated successfully!", "success");
      setShowConfirmModal(false);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      notify(err.response?.data?.message || "Failed to update booking.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!open || !booking) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[950px] w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 border-slate-200">
        {/* Modal Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Edit Booking Specifications
              </h2>
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {booking.reference || `BK-${String(booking._id).slice(-6).toUpperCase()}`}
              </span>
              <span className="text-xs px-2 py-0.5 rounded font-semibold capitalize bg-emerald-50 text-emerald-800 border border-emerald-200">
                {booking.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Full administrative editing for event specifications, menu, add-ons, and pricing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 bg-white border-b border-slate-200 overflow-x-auto shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("specs")}
            className={`px-3.5 py-2 font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "specs"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4" /> 1. Event &amp; Venue
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("package_scaffold")}
            className={`px-3.5 py-2 font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "package_scaffold"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <PackageIcon className="w-4 h-4" /> 2. Package &amp; Setup
          </button>
          {form.service_type !== SERVICE_TYPES.SETUP_ONLY && (
            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={`px-3.5 py-2 font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === "menu"
                  ? "border-primary text-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Utensils className="w-4 h-4" /> 3. Menu Dishes ({menuItems.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab("addons")}
            className={`px-3.5 py-2 font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "addons"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4" /> 4. Add-ons &amp; Services ({serviceItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("fees_discounts")}
            className={`px-3.5 py-2 font-bold border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "fees_discounts"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DollarSign className="w-4 h-4" /> 5. Fees &amp; Discounts
          </button>
        </div>

        {/* Modal Body & Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Event & Venue Specs */}
          {activeTab === "specs" && (
            <div className="space-y-5">
              {/* Event Type & Guest Count */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary" /> Basic Event Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Event Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={form.event_type}
                      onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                      <option value={OTHER_EVENT_TYPE}>Other (Custom Event Type)</option>
                    </select>
                    {form.event_type === OTHER_EVENT_TYPE && (
                      <input
                        type="text"
                        placeholder="Specify event type..."
                        value={form.event_type_other}
                        onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
                        className="w-full h-8 mt-1.5 rounded-md border border-slate-300 px-2 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Guest Count (Pax) <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, guest_count: Math.max(1, (Number(form.guest_count) || 1) - 5) })}
                        className="h-9 w-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={form.guest_count}
                        onChange={(e) => setForm({ ...form, guest_count: Math.max(1, Number(e.target.value) || 1) })}
                        className="flex-1 h-9 rounded-lg border border-slate-300 bg-white text-center font-bold text-xs focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, guest_count: (Number(form.guest_count) || 1) + 5 })}
                        className="h-9 w-9 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center font-bold text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Service Type
                    </label>
                    <select
                      value={form.service_type}
                      onChange={(e) => setForm({ ...form, service_type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                    >
                      <option value={SERVICE_TYPES.FULL_SERVICE}>Food and Event Setup</option>
                      <option value={SERVICE_TYPES.FOOD_ONLY}>Food Only (Catering)</option>
                      <option value={SERVICE_TYPES.SETUP_ONLY}>Event Setup Only</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-100">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Celebrant / For
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={form.booking_for}
                        onChange={(e) => setForm({ ...form, booking_for: e.target.value })}
                        className="w-32 h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium"
                      >
                        <option value="myself">For Client</option>
                        <option value="someone_else">Someone Else</option>
                      </select>
                      {form.booking_for === "someone_else" && (
                        <input
                          type="text"
                          placeholder="Celebrant Name..."
                          value={form.celebrant_name}
                          onChange={(e) => setForm({ ...form, celebrant_name: e.target.value })}
                          className="flex-1 h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Event Theme / Styling Palette
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bohemian Navy & Gold, Rustic Floral"
                      value={form.event_theme}
                      onChange={(e) => setForm({ ...form, event_theme: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium focus:ring-1 focus:ring-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time Picker */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" /> Schedule &amp; Target Date
                </h3>
                <AdminOcularDateTimePicker
                  selectedBooking={booking}
                  dateValue={form.event_date}
                  timeValue={form.start_time}
                  onDateChange={(d) => setForm({ ...form, event_date: d })}
                  onTimeChange={(t) => setForm({ ...form, start_time: t })}
                  dateLabel="Target Event Date"
                  timeLabel="Start Time"
                  hideContextPill={true}
                  hideSummaryBanner={true}
                  disableEventDateLimit={true}
                />
              </div>

              {/* Venue Address & Location */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" /> Venue &amp; Batangas Location
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Venue Type
                    </label>
                    <select
                      value={form.venue_type}
                      onChange={(e) => setForm({ ...form, venue_type: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium"
                    >
                      {VENUE_TYPES.map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                      <option value={OTHER_VENUE_TYPE}>Other (Custom Venue)</option>
                    </select>
                    {form.venue_type === OTHER_VENUE_TYPE && (
                      <input
                        type="text"
                        placeholder="Specify venue type..."
                        value={form.venue_type_other}
                        onChange={(e) => setForm({ ...form, venue_type_other: e.target.value })}
                        className="w-full h-8 mt-1.5 rounded-md border border-slate-300 px-2 text-xs font-medium"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Municipality (Batangas)
                    </label>
                    <select
                      value={form.municipality}
                      onChange={(e) => setForm({ ...form, municipality: e.target.value, barangay: "" })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium"
                    >
                      <option value="">Select Municipality...</option>
                      {municipalities.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Barangay
                    </label>
                    <select
                      value={form.barangay}
                      disabled={!form.municipality}
                      onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium disabled:bg-slate-100"
                    >
                      <option value="">Select Barangay...</option>
                      {barangays.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Street Address &amp; House/Building No.
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Purok 1, Sitio Camaya"
                      value={form.street}
                      onChange={(e) => setForm({ ...form, street: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Landmark / Directions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Near Barangay Hall"
                      value={form.landmark}
                      onChange={(e) => setForm({ ...form, landmark: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Contact Information */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" /> Customer Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">First Name</label>
                    <input
                      type="text"
                      value={form.contact_first_name}
                      onChange={(e) => setForm({ ...form, contact_first_name: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={form.contact_last_name}
                      onChange={(e) => setForm({ ...form, contact_last_name: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={form.contact_phone}
                      onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Special Requests & Dietary */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Special Requests &amp; Kitchen Notes
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Special Requests</label>
                    <textarea
                      rows={2}
                      value={form.special_requests}
                      onChange={(e) => setForm({ ...form, special_requests: e.target.value })}
                      placeholder="Special instructions or requests..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Dietary Restrictions</label>
                    <textarea
                      rows={2}
                      value={form.dietary_restrictions}
                      onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })}
                      placeholder="e.g. Halal, vegetarian, no pork..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Allergies</label>
                    <textarea
                      rows={2}
                      value={form.allergies}
                      onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                      placeholder="e.g. Peanut allergy, seafood..."
                      className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Package & Scaffold Setup */}
          {activeTab === "package_scaffold" && (
            <div className="space-y-5">
              {/* Package Selector */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <PackageIcon className="w-4 h-4 text-primary" /> Selected Base Package
                  </h3>
                  {selectedPackage && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                      Base Rate: {formatCurrency(basePackagePrice)}
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <label className="block text-[11px] font-bold text-slate-600">Choose Package</label>
                  <select
                    value={form.package_id}
                    onChange={(e) => setForm({ ...form, package_id: e.target.value, selected_scaffold_option_id: "" })}
                    className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- No Specific Package (Custom Booking) --</option>
                    {packagesList.map((pkg) => (
                      <option key={pkg._id} value={pkg._id}>
                        {pkg.name} ({pkg.category || "Package"}) — Starting at {formatCurrency(pkg.price_per_guest ? pkg.price_per_guest * (Number(form.guest_count) || 1) : (pkg.setup_price || pkg.base_price || 0))}
                      </option>
                    ))}
                  </select>
                  {selectedPackage && (
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-lg text-xs space-y-1 text-slate-700">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{selectedPackage.name}</span>
                        <span className="capitalize">{selectedPackage.category}</span>
                      </div>
                      {selectedPackage.description && (
                        <p className="text-slate-500 text-[11.5px] leading-relaxed">{selectedPackage.description}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Scaffold / Event Space Footprint */}
              {form.service_type !== SERVICE_TYPES.FOOD_ONLY && (
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-primary" /> Scaffold Sizing &amp; Event Space
                    </h3>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-slate-600">
                      <input
                        type="checkbox"
                        checked={form.custom_scaffold}
                        onChange={(e) => setForm({ ...form, custom_scaffold: e.target.checked, selected_scaffold_option_id: e.target.checked ? "" : form.selected_scaffold_option_id })}
                        className="rounded text-primary focus:ring-primary w-4 h-4"
                      />
                      <span>Custom Dimensions</span>
                    </label>
                  </div>

                  {!form.custom_scaffold ? (
                    <div className="space-y-2 text-xs">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Select Standard Scaffold Option
                      </label>
                      {scaffoldOptions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {scaffoldOptions.map((opt, idx) => {
                            const isSelected = String(form.selected_scaffold_option_id) === String(opt._id) || String(form.selected_scaffold_option_id) === String(idx);
                            const optPrice = Number(opt.price) || 0;
                            return (
                              <div
                                key={opt._id || idx}
                                onClick={() => setForm({ ...form, selected_scaffold_option_id: String(opt._id || idx) })}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                                  isSelected
                                    ? "bg-blue-50/90 border-blue-400 text-blue-950 shadow-2xs ring-1 ring-blue-300"
                                    : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800"
                                }`}
                              >
                                <div>
                                  <span className="font-bold block text-xs">
                                    {opt.label || `${opt.width_ft || opt.width}ft × ${opt.length_ft || opt.length}ft`}
                                  </span>
                                  <span className="text-[11px] text-slate-500">
                                    Capacity: {opt.capacity_guests ? `Up to ${opt.capacity_guests} pax` : "Standard Setup"}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-mono font-bold text-xs text-primary block">
                                    {optPrice > 0 ? formatCurrency(optPrice) : "Included"}
                                  </span>
                                  {isSelected && (
                                    <span className="inline-flex items-center text-[10px] font-bold text-blue-700 gap-0.5">
                                      <Check className="w-3 h-3" /> Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                          This package does not have pre-configured scaffold sizes. You can enable custom dimensions above.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
                      <span className="font-bold text-slate-800 block text-xs">Custom Area Dimensions</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Width (ft)</label>
                          <input
                            type="number"
                            placeholder="e.g. 20"
                            value={form.scaffold_width}
                            onChange={(e) => setForm({ ...form, scaffold_width: e.target.value })}
                            className="w-full h-9 rounded-md border border-slate-300 px-2.5 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Length (ft)</label>
                          <input
                            type="number"
                            placeholder="e.g. 40"
                            value={form.scaffold_length}
                            onChange={(e) => setForm({ ...form, scaffold_length: e.target.value })}
                            className="w-full h-9 rounded-md border border-slate-300 px-2.5 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Setup / Scaffold Price (₱)</label>
                          <input
                            type="number"
                            placeholder="₱ 0.00"
                            value={form.scaffold_price}
                            onChange={(e) => setForm({ ...form, scaffold_price: e.target.value })}
                            className="w-full h-9 rounded-md border border-slate-300 px-2.5 text-xs font-semibold font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Itemized Menu Dishes */}
          {activeTab === "menu" && (
            <div className="space-y-5">
              {/* Selected Dishes Table */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-primary" /> Active Menu Selections ({menuItems.length})
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary">
                    Dishes Subtotal: {formatCurrency(menuSubtotal)}
                  </span>
                </div>

                {menuItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
                    <div className="bg-slate-50 px-3 py-2 flex items-center font-bold text-[11px] text-slate-600 uppercase">
                      <span className="flex-1">Dish Name &amp; Category</span>
                      <span className="w-24 text-center">Pricing Type</span>
                      <span className="w-24 text-center">Unit / Qty</span>
                      <span className="w-28 text-right pr-2">Rate (₱)</span>
                      <span className="w-28 text-right pr-2">Line Total</span>
                      <span className="w-10 text-center">Action</span>
                    </div>
                    {menuItems.map((item, idx) => {
                      const guestCount = Math.max(1, Number(form.guest_count) || 1);
                      const lineTotal = menuLineTotal(item, guestCount);
                      return (
                        <div key={idx} className="p-2.5 flex items-center gap-2 hover:bg-slate-50/80 transition-colors">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{item.category}</span>
                          </div>
                          
                          {/* Pricing Type toggle */}
                          <div className="w-24 text-center">
                            <select
                              value={item.pricing_type}
                              onChange={(e) => handleUpdateDish(idx, "pricing_type", e.target.value)}
                              className="h-7 text-[11px] font-semibold rounded border border-slate-300 bg-white px-1"
                            >
                              <option value={MENU_PRICING.PER_GUEST}>Per Guest</option>
                              <option value={MENU_PRICING.QUANTITY}>Custom Qty</option>
                            </select>
                          </div>

                          {/* Quantity / Unit */}
                          <div className="w-24 text-center">
                            {item.pricing_type === MENU_PRICING.QUANTITY ? (
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateDish(idx, "quantity", Math.max(1, Number(e.target.value) || 1))}
                                className="w-16 h-7 text-center rounded border border-slate-300 font-bold text-xs"
                              />
                            ) : (
                              <span className="text-slate-500 font-medium text-[11px]">
                                {guestCount} pax
                              </span>
                            )}
                          </div>

                          {/* Unit Rate */}
                          <div className="w-28 text-right pr-2">
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={item.price}
                              onChange={(e) => handleUpdateDish(idx, "price", Math.max(0, Number(e.target.value) || 0))}
                              className="w-24 h-7 text-right rounded border border-slate-300 px-1 font-mono font-bold text-xs"
                            />
                          </div>

                          {/* Line Total */}
                          <div className="w-28 text-right pr-2 font-mono font-bold text-slate-800">
                            {formatCurrency(lineTotal)}
                          </div>

                          {/* Remove button */}
                          <div className="w-10 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveDish(idx)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              title="Remove Dish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                    No dishes selected. Select dishes from the catalog below.
                  </div>
                )}
              </div>

              {/* Menu Catalog Browser */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-primary" /> Browse Menu Catalog
                  </h3>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search dish name..."
                      value={dishSearch}
                      onChange={(e) => setDishSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Course Filter Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCourseTab("all")}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      activeCourseTab === "all" ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    All Courses
                  </button>
                  {groupedMenuCatalog.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setActiveCourseTab(group.id)}
                      className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer whitespace-nowrap ${
                        activeCourseTab === group.id ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {group.label} ({group.items.length})
                    </button>
                  ))}
                </div>

                {/* Filtered Dishes Grid */}
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {filteredCatalogDishes.map((group) => (
                    <div key={group.id} className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {group.label}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {group.items.map((dish) => {
                          const isAlreadyAdded = menuItems.some(
                            (m) => m.name.toLowerCase() === dish.name.toLowerCase()
                          );
                          const dishPrice = Number(dish.price) || 0;
                          return (
                            <div
                              key={dish._id}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-colors ${
                                isAlreadyAdded ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              <div className="min-w-0">
                                <span className="font-bold text-slate-900 block truncate">{dish.name}</span>
                                <span className="font-mono text-[11px] font-semibold text-primary">
                                  {dishPrice > 0 ? formatCurrency(dishPrice) : "Included"}
                                  {dish.pricing_type === "quantity" ? ` / ${dish.unit || "unit"}` : " / guest"}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddDish(dish)}
                                disabled={isAlreadyAdded}
                                className={`px-2.5 py-1 rounded text-xs font-bold shrink-0 transition-colors flex items-center gap-1 cursor-pointer ${
                                  isAlreadyAdded
                                    ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                    : "bg-primary text-white hover:bg-primary/90"
                                }`}
                              >
                                {isAlreadyAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                                {isAlreadyAdded ? "Added" : "Add"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Add-ons & Extra Services */}
          {activeTab === "addons" && (
            <div className="space-y-5">
              {/* Selected Add-ons Table */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" /> Selected Add-ons &amp; Extra Services ({serviceItems.length})
                  </h3>
                  <span className="font-mono text-xs font-bold text-primary">
                    Add-ons Subtotal: {formatCurrency(addOnsSubtotal)}
                  </span>
                </div>

                {serviceItems.length > 0 ? (
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-200 text-xs">
                    <div className="bg-slate-50 px-3 py-2 flex items-center font-bold text-[11px] text-slate-600 uppercase">
                      <span className="flex-1">Service / Add-on Name</span>
                      <span className="w-24 text-center">Pricing Type</span>
                      <span className="w-28 text-center">Quantity</span>
                      <span className="w-28 text-right pr-2">Rate (₱)</span>
                      <span className="w-28 text-right pr-2">Line Total</span>
                      <span className="w-10 text-center">Action</span>
                    </div>
                    {serviceItems.map((item, idx) => {
                      const lineTotal = addOnLineTotal(item);
                      return (
                        <div key={idx} className="p-2.5 flex items-center gap-2 hover:bg-slate-50/80 transition-colors">
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                            {item.note && <span className="text-[10px] text-slate-400 block">{item.note}</span>}
                          </div>

                          {/* Pricing Type */}
                          <div className="w-24 text-center">
                            <select
                              value={item.pricing_type || "fixed"}
                              onChange={(e) => handleUpdateAddon(idx, "pricing_type", e.target.value)}
                              className="h-7 text-[11px] font-semibold rounded border border-slate-300 bg-white px-1"
                            >
                              <option value="fixed">Fixed</option>
                              <option value="quantity">Per Unit</option>
                            </select>
                          </div>

                          {/* Quantity Stepper */}
                          <div className="w-28 text-center flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateAddon(idx, "quantity", Math.max(1, (Number(item.quantity) || 1) - 1))}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 font-bold font-mono text-center">{item.quantity || 1}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateAddon(idx, "quantity", (Number(item.quantity) || 1) + 1)}
                              className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold flex items-center justify-center cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Rate */}
                          <div className="w-28 text-right pr-2">
                            <input
                              type="number"
                              min="0"
                              value={item.price}
                              onChange={(e) => handleUpdateAddon(idx, "price", Math.max(0, Number(e.target.value) || 0))}
                              className="w-24 h-7 text-right rounded border border-slate-300 px-1 font-mono font-bold text-xs"
                            />
                          </div>

                          {/* Line Total */}
                          <div className="w-28 text-right pr-2 font-mono font-bold text-slate-800">
                            {formatCurrency(lineTotal)}
                          </div>

                          {/* Remove button */}
                          <div className="w-10 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveAddon(idx)}
                              className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              title="Remove Service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
                    No extra add-on services selected.
                  </div>
                )}
              </div>

              {/* Add Custom Service / Add-on */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-primary" /> Add Custom Service / Item
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomAddonForm(!showCustomAddonForm)}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                  >
                    {showCustomAddonForm ? "Hide Form" : "+ Create Custom Service"}
                  </button>
                </div>

                {showCustomAddonForm && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Service Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Photo Booth, LED Wall, Acoustic Band"
                        value={customAddon.name}
                        onChange={(e) => setCustomAddon({ ...customAddon, name: e.target.value })}
                        className="w-full h-8 rounded border border-slate-300 px-2 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Price (₱)</label>
                      <input
                        type="number"
                        placeholder="₱ 0.00"
                        value={customAddon.price}
                        onChange={(e) => setCustomAddon({ ...customAddon, price: e.target.value })}
                        className="w-full h-8 rounded border border-slate-300 px-2 font-mono text-xs font-semibold"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddCustomAddon}
                        className="w-full h-8 bg-primary text-white rounded font-bold hover:bg-primary/90 transition-colors cursor-pointer text-xs"
                      >
                        Add to Booking
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Addon Catalog Browser */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-4 h-4 text-primary" /> Browse Add-on Catalogue
                  </h3>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search add-ons..."
                      value={addonSearch}
                      onChange={(e) => setAddonSearch(e.target.value)}
                      className="w-full h-8 pl-8 pr-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1 text-xs">
                  {filteredAddonCatalog.map((item) => {
                    const isAdded = serviceItems.some((s) => s.name.toLowerCase() === item.name.toLowerCase());
                    const itemPrice = Number(item.price) || 0;
                    return (
                      <div
                        key={item._id}
                        className={`p-2.5 rounded-lg border flex flex-col justify-between gap-2 transition-colors ${
                          isAdded ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-900 block truncate">{item.name}</span>
                          <span className="font-mono text-[11px] font-bold text-primary block mt-0.5">
                            {itemPrice > 0 ? formatCurrency(itemPrice) : "Free"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddAddon(item)}
                          className="w-full py-1 bg-slate-200 hover:bg-primary hover:text-white text-slate-800 rounded text-[11px] font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> {isAdded ? "Add More (+1)" : "Add Item"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Fees, Discounts & Taxes */}
          {activeTab === "fees_discounts" && (
            <div className="space-y-5">
              {/* Transportation & Logistics Fee */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-primary" /> Transportation &amp; Delivery Logistics
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Delivery / Setup Method
                    </label>
                    <select
                      value={form.delivery_method}
                      onChange={(e) => setForm({ ...form, delivery_method: e.target.value })}
                      className="w-full h-9 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium"
                    >
                      <option value="setup">Full On-Site Setup &amp; Service</option>
                      <option value="delivery">Drop-Off Delivery</option>
                      <option value="pickup">Customer Pickup</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Transportation Fee (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={transportationFee}
                      onChange={(e) => setTransportationFee(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 font-mono font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Custom Additional Fees */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-primary" /> Additional Custom Fees
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddCustomFee}
                    className="text-xs font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Custom Fee
                  </button>
                </div>

                {additionalCharges.length > 0 ? (
                  <div className="space-y-2 text-xs">
                    {additionalCharges.map((fee, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Fee description (e.g. Generator rental, Overtime)"
                          value={fee.name}
                          onChange={(e) => handleUpdateCustomFee(idx, "name", e.target.value)}
                          className="flex-1 h-8 rounded border border-slate-300 px-2 text-xs font-medium"
                        />
                        <div className="relative w-36">
                          <span className="absolute left-2.5 top-2 text-slate-400 font-mono">₱</span>
                          <input
                            type="number"
                            min="0"
                            value={fee.amount}
                            onChange={(e) => handleUpdateCustomFee(idx, "amount", Math.max(0, Number(e.target.value) || 0))}
                            className="w-full h-8 pl-6 pr-2 rounded border border-slate-300 text-right font-mono font-bold text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomFee(idx)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">No additional custom fees applied.</p>
                )}
              </div>

              {/* Discounts & Taxes */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" /> Discounts &amp; Taxes / VAT
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Discount Deduction Amount (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 font-mono font-bold text-xs text-emerald-700"
                      placeholder="₱ 0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Deducted from booking subtotal.</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Taxes / VAT Amount (₱)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full h-9 rounded-lg border border-slate-300 px-2.5 font-mono font-bold text-xs"
                      placeholder="₱ 0.00"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">Added to booking subtotal if applicable.</p>
                  </div>
                </div>
              </div>

              {/* Revision Reason / Audit Note */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Modification Reason / Audit Note
                </label>
                <textarea
                  rows={2}
                  placeholder="Record why terms or specifications are being updated..."
                  value={form.revision_note}
                  onChange={(e) => setForm({ ...form, revision_note: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          )}
        </div>

        {/* Live Recalculated Sticky Footer */}
        <div className="bg-white border-t border-slate-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs font-mono">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">Subtotal</span>
              <strong className="text-slate-800">{formatCurrency(computedSubtotal)}</strong>
            </div>
            {discountAmount > 0 && (
              <div>
                <span className="text-[10px] text-emerald-600 uppercase font-bold block">Discount</span>
                <strong className="text-emerald-700">-{formatCurrency(discountAmount)}</strong>
              </div>
            )}
            {taxAmount > 0 && (
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Tax</span>
                <strong className="text-slate-700">+{formatCurrency(taxAmount)}</strong>
              </div>
            )}
            <div className="pl-2 border-l border-slate-200">
              <span className="text-[10px] text-primary uppercase font-bold block">New Total Cost</span>
              <strong className="text-primary text-sm sm:text-base font-bold">
                {formatCurrency(updatedTotalCost)}
              </strong>
            </div>
            <div className="pl-2 border-l border-slate-200">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">Already Paid</span>
              <strong className="text-emerald-700 text-xs sm:text-sm font-semibold">
                {formatCurrency(currentPaid)}
              </strong>
            </div>
            <div className="pl-2 border-l border-slate-200">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Remaining Balance</span>
              <strong className="text-amber-800 text-sm sm:text-base font-bold">
                {formatCurrency(newRemainingBalance)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitiateSave}
              className="px-5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" /> Save Changes
            </button>
          </div>
        </div>

        {/* Pre-Save Confirmation Dialog */}
        {showConfirmModal && (
          <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
            <DialogContent className="sm:max-w-[480px] p-5 bg-white">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Review &amp; Confirm Booking Changes
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  Please verify the updated financial and booking summary before persisting.
                </DialogDescription>
              </DialogHeader>

              <div className="py-3 space-y-3 text-xs">
                {/* Financial Summary Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Previous Total:</span>
                    <span className="font-mono font-semibold text-slate-600 line-through">
                      {formatCurrency(originalTotal)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-900 font-bold">Updated Total Cost:</span>
                    <span className="font-mono font-bold text-sm text-primary">
                      {formatCurrency(updatedTotalCost)}
                    </span>
                  </div>

                  {priceDifference !== 0 && (
                    <div className="flex justify-between items-center text-[11px] pt-1 border-t border-slate-200">
                      <span className="text-slate-500">Price Adjustment:</span>
                      <span className={`font-mono font-bold ${priceDifference > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                        {priceDifference > 0 ? `+${formatCurrency(priceDifference)}` : formatCurrency(priceDifference)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200">
                    <span className="text-emerald-800 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Customer Already Paid:
                    </span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(currentPaid)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-bold text-amber-950 block text-xs">New Remaining Balance:</span>
                      <span className="text-[10px] text-amber-800 font-mono">
                        (Updated Total − Total Paid)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-base text-amber-900">
                      {formatCurrency(newRemainingBalance)}
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-blue-50/70 border border-blue-200/70 rounded-lg text-[11px] text-blue-900 space-y-0.5">
                  <div className="font-bold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-blue-700" /> Payment Protection Notice
                  </div>
                  <p className="text-blue-800 leading-snug">
                    The customer’s already-paid deposit of <strong>{formatCurrency(currentPaid)}</strong> will remain recorded and will <strong>NOT</strong> be charged again.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={saving}
                  className="px-3.5 py-1.5 rounded-md border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Back to Editing
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfirmed}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {saving ? "Updating..." : "Confirm & Update Booking"}
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
