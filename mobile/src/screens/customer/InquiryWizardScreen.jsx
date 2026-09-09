import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Utensils,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  Plus,
  Minus,
  AlertCircle,
  FileCheck,
  Truck,
  Package as PackageIcon,
  Layers,
  ShieldCheck,
  Phone,
  Mail,
  Home,
  Info,
  FileEdit,
  Edit3,
  Pencil,
  Users,
  Receipt,
  FileText,
  CheckCircle2,
  Search,
  X,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import AppInput from "../../components/common/AppInput";
import Card from "../../components/common/Card";
import LoadingState from "../../components/common/LoadingState";
import AnimatedProgressBar from "../../components/common/AnimatedProgressBar";
import AnimatedStepper from "../../components/common/AnimatedStepper";
import { useAuth } from "../../context/AuthContext";
import customerApi from "../../api/customer";
import SerratedDivider from "../../components/common/SerratedDivider";
import {
  BATANGAS_PROVINCE,
  getBatangasMunicipalities,
  getBatangasBarangays,
  searchBatangasMunicipalities,
  searchBatangasBarangays,
} from "../../utils/batangas";
import { formatCurrency, formatDate } from "../../utils/format";

const MIN_DATE_OFFSET_DAYS = 4;

export const SERVICE_TYPES = {
  FOOD_ONLY: "Food Only",
  SETUP_ONLY: "Event Setup Only",
  FULL_SERVICE: "Food and Event Setup",
};

const VENUE_TYPES = [
  "Covered Court",
  "Private Resort",
  "Function Hall",
  "Garden",
  "Beach",
  "Hotel Ballroom",
  "Restaurant",
  "Event Hall",
  "Other",
];

const CURATED_PALETTES = [
  { id: "navy_gold", label: "Navy & Gold", preview: ["#1E3A8A", "#F59E0B"] },
  { id: "blush_sage", label: "Blush & Sage", preview: ["#F472B6", "#10B981"] },
  { id: "emerald_champagne", label: "Emerald & Champagne", preview: ["#047857", "#FDE68A"] },
  { id: "rustic_terracotta", label: "Rustic Terracotta", preview: ["#C2410C", "#FED7AA"] },
  { id: "white_silver", label: "Classic White & Silver", preview: ["#CBD5E1", "#94A3B8"] },
  { id: "burgundy_gold", label: "Burgundy & Gold", preview: ["#831843", "#FBBF24"] },
];

const DEFAULT_SCAFFOLD_OPTIONS = [
  { _id: "scaffold_20x20", label: "20 × 20 ft", width_ft: 20, length_ft: 20, guest_min: 50, guest_max: 80, price: 15000 },
  { _id: "scaffold_20x40", label: "20 × 40 ft", width_ft: 20, length_ft: 40, guest_min: 100, guest_max: 150, price: 25000 },
  { _id: "scaffold_40x40", label: "40 × 40 ft", width_ft: 40, length_ft: 40, guest_min: 150, guest_max: 220, price: 38000 },
  { _id: "scaffold_20x60", label: "20 × 60 ft", width_ft: 20, length_ft: 60, guest_min: 180, guest_max: 250, price: 45000 },
];

const MENU_CATEGORIES = [
  "All",
  "Main Dish",
  "Pork",
  "Beef",
  "Chicken",
  "Seafood",
  "Vegetables",
  "Pasta",
  "Dessert",
  "Beverage",
  "Appetizer",
];

export const InquiryWizardScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // Incoming parameters
  const preselectedPackage = route?.params?.selectedPackage || null;
  const paramServiceType = route?.params?.serviceType || null;
  const prefillEventType = route?.params?.prefillEventType || null;
  const favoriteDish = route?.params?.favoriteDish || null;
  const stylingNotes = route?.params?.stylingNotes || "";

  const isDirectPackage = Boolean(preselectedPackage);

  // Initial service type determination
  const initialServiceType = useMemo(() => {
    if (paramServiceType) return paramServiceType;
    if (preselectedPackage) {
      if (preselectedPackage.package_type === "Food Only") return SERVICE_TYPES.FOOD_ONLY;
      if (preselectedPackage.package_type === "Event Setup Only") return SERVICE_TYPES.SETUP_ONLY;
      return SERVICE_TYPES.FULL_SERVICE;
    }
    return SERVICE_TYPES.FULL_SERVICE;
  }, [paramServiceType, preselectedPackage]);

  // Loading & Reference Data
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [blockedDates, setBlockedDates] = useState([]);
  const [businessInfo, setBusinessInfo] = useState(null);

  // Step state (0-indexed)
  const [stepIndex, setStepIndex] = useState(0);

  // Keyboard avoidance & scroll management
  const scrollViewRef = useRef(null);
  const stepContainerY = useRef(0);
  const fieldYCoords = useRef({});
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setIsKeyboardVisible(true)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setIsKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // When step changes, scroll smoothly to top and dismiss keyboard
  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    Keyboard.dismiss();
    fieldYCoords.current = {};
  }, [stepIndex]);

  const handleFieldLayout = (key) => (event) => {
    fieldYCoords.current[key] = event.nativeEvent.layout.y;
  };

  const handleFieldFocus = (key, offsetAdjustment = 20) => () => {
    setTimeout(() => {
      const fieldRelativeY = fieldYCoords.current[key];
      if (typeof fieldRelativeY === "number") {
        const targetY = (stepContainerY.current || 0) + fieldRelativeY - offsetAdjustment;
        scrollViewRef.current?.scrollTo({
          y: Math.max(0, targetY),
          animated: true,
        });
      } else {
        if (
          key.toLowerCase().includes("landmark") ||
          key.toLowerCase().includes("street") ||
          key.toLowerCase().includes("phone")
        ) {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }
      }
    }, 150);
  };

  // Form State
  const [selectedPackage, setSelectedPackage] = useState(preselectedPackage);
  const [serviceType, setServiceType] = useState(initialServiceType);
  const [includeFood, setIncludeFood] = useState(initialServiceType !== SERVICE_TYPES.SETUP_ONLY);

  // Special Offer Combo check
  const isComboOffer = Boolean(
    selectedPackage?.offer_type === "special" ||
    selectedPackage?.is_combo ||
    selectedPackage?.combo_guest_count ||
    selectedPackage?.guest_count
  );

  const comboPax = isComboOffer
    ? (selectedPackage?.combo_guest_count || selectedPackage?.guest_count || 50)
    : null;

  // Event specifics
  const [eventType, setEventType] = useState(prefillEventType || "Birthday");
  const [celebrantName, setCelebrantName] = useState("");
  const [eventTheme, setEventTheme] = useState(stylingNotes || "");
  const [selectedPalette, setSelectedPalette] = useState(CURATED_PALETTES[0].label);
  const [guestCount, setGuestCount] = useState(comboPax || preselectedPackage?.guest_min || 50);
  const [venueType, setVenueType] = useState("Private Resort");

  // Scaffold / Setup tier
  const availableScaffoldOptions = useMemo(() => {
    if (selectedPackage?.scaffold_size_options?.length > 0) {
      return selectedPackage.scaffold_size_options;
    }
    return DEFAULT_SCAFFOLD_OPTIONS;
  }, [selectedPackage]);

  const [selectedScaffoldId, setSelectedScaffoldId] = useState(() => {
    return availableScaffoldOptions[0]?._id || "scaffold_20x20";
  });

  const selectedScaffold = useMemo(() => {
    return availableScaffoldOptions.find((o) => o._id === selectedScaffoldId) || availableScaffoldOptions[0];
  }, [availableScaffoldOptions, selectedScaffoldId]);

  // Schedule
  const minSelectableDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MIN_DATE_OFFSET_DAYS);
    return d;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [startTime, setStartTime] = useState("12:00 PM");

  // Fulfillment & Venue Location
  const [deliveryMethod, setDeliveryMethod] = useState("delivery"); // delivery | pickup | setup
  const [municipality, setMunicipality] = useState("Batangas City");
  const [barangay, setBarangay] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");

  // Dishes & Dining
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [activeMenuCat, setActiveMenuCat] = useState("All");
  const [allergies, setAllergies] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Add-ons
  const [selectedAddons, setSelectedAddons] = useState({}); // { [addonId]: quantity }

  // Contact Info
  const [contactFirstName, setContactFirstName] = useState(
    user?.first_name || user?.full_name?.split(" ")[0] || ""
  );
  const [contactLastName, setContactLastName] = useState(
    user?.last_name || user?.full_name?.split(" ").slice(1).join(" ") || ""
  );
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [contactPhone, setContactPhone] = useState(user?.phone || "");
  const [contactAltPhone, setContactAltPhone] = useState("");

  // Modals
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);
  const [municipalityQuery, setMunicipalityQuery] = useState("");
  const [barangayQuery, setBarangayQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [isReviewEditMode, setIsReviewEditMode] = useState(false);

  // Sync serviceType when direct package passes in
  useEffect(() => {
    if (preselectedPackage) {
      setSelectedPackage(preselectedPackage);
      if (preselectedPackage.package_type === "Food Only") {
        setServiceType(SERVICE_TYPES.FOOD_ONLY);
        setIncludeFood(true);
      } else if (preselectedPackage.package_type === "Event Setup Only") {
        setServiceType(SERVICE_TYPES.SETUP_ONLY);
        setIncludeFood(false);
      } else {
        setServiceType(SERVICE_TYPES.FULL_SERVICE);
        setIncludeFood(true);
      }
      if (preselectedPackage.guest_count || preselectedPackage.combo_guest_count) {
        setGuestCount(preselectedPackage.guest_count || preselectedPackage.combo_guest_count);
      }
    }
  }, [preselectedPackage]);

  // Load Reference Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pkgs, menu, adds, blocked, bInfo] = await Promise.all([
          customerApi.getPackages().catch(() => []),
          customerApi.getMenu().catch(() => []),
          customerApi.getAddons().catch(() => []),
          customerApi.getBlockedDates().catch(() => []),
          customerApi.getBusinessInfo().catch(() => null),
        ]);
        setPackages(pkgs || []);
        setMenuItems(menu || []);
        setAddons(adds || []);
        setBlockedDates((blocked || []).map((b) => (b.date ? b.date.split("T")[0] : null)).filter(Boolean));
        setBusinessInfo(bInfo);

        // Pre-select favorite dish if provided
        if (favoriteDish && Array.isArray(menu)) {
          const fav = menu.find((m) => m.name.toLowerCase().includes(favoriteDish.toLowerCase()));
          if (fav) {
            setSelectedDishes([fav]);
          }
        }
      } catch (err) {
        console.warn("Failed to load inquiry wizard reference data", err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchData();
  }, [favoriteDish]);

  // Available barangays
  const availableBarangays = useMemo(() => {
    return getBatangasBarangays(municipality);
  }, [municipality]);

  // Filtered municipalities & barangays for instant search
  const filteredMunicipalities = useMemo(() => {
    return searchBatangasMunicipalities(municipalityQuery);
  }, [municipalityQuery]);

  const filteredBarangays = useMemo(() => {
    return searchBatangasBarangays(municipality, barangayQuery);
  }, [municipality, barangayQuery]);

  // Derived Booleans
  const isFoodOnly = serviceType === SERVICE_TYPES.FOOD_ONLY;
  const isEventSetupOnly = serviceType === SERVICE_TYPES.SETUP_ONLY;
  const isFullService = serviceType === SERVICE_TYPES.FULL_SERVICE;

  // ══════════════════════════════════════════════════════════════════════════
  // DYNAMIC STEP PIPELINE
  // ══════════════════════════════════════════════════════════════════════════
  const steps = useMemo(() => {
    const list = [];

    // Step: Service Selection (Custom flow only; bypassed for direct package)
    if (!isDirectPackage) {
      list.push({
        id: "service",
        title: "Service Scope",
        subtitle: "Choose custom catering, event styling, or full service",
      });
    }

    // Step: Schedule Date & Time
    list.push({
      id: "datetime",
      title: "Date & Time",
      subtitle: "Select your celebration schedule",
    });

    if (isFoodOnly) {
      // ────────────────── FOOD ONLY PATH ──────────────────
      list.push({
        id: "delivery",
        title: "Guests & Fulfillment",
        subtitle: "Guest count, Batangas delivery address or kitchen pickup",
      });
      list.push({
        id: "menu",
        title: "Dish Selection",
        subtitle: "Select handcrafted dishes from our catalog",
      });
      list.push({
        id: "dietary",
        title: "Dietary Needs",
        subtitle: "Allergies and special dining requests",
      });
    } else if (isEventSetupOnly) {
      // ────────────────── EVENT SETUP ONLY PATH ───────────
      list.push({
        id: "setup_tier",
        title: "Setup & Scaffolding",
        subtitle: "Choose tent/scaffold dimensions and staging size",
      });
      list.push({
        id: "event_venue",
        title: "Event Details & Venue",
        subtitle: "Occasion, theme, venue type & Batangas address",
      });
      list.push({
        id: "addons",
        title: "Equipment & Extras",
        subtitle: "Sound system, lighting, tables and decor add-ons",
      });
    } else {
      // ────────────────── FULL SERVICE / DIRECT PACKAGE ───
      if (!isComboOffer) {
        list.push({
          id: "setup_tier",
          title: "Setup & Scaffolding",
          subtitle: "Choose tent/scaffold dimensions and staging size",
        });
      }
      list.push({
        id: "event_venue",
        title: "Event Details & Venue",
        subtitle: "Occasion, theme, venue type & Batangas address",
      });
      list.push({
        id: "menu",
        title: isComboOffer ? "Combo Inclusions" : "Banquet Menu",
        subtitle: isComboOffer
          ? "Pre-configured combo banquet dishes & inclusions"
          : "Select favorite dishes or let the chef customize",
      });
      if (includeFood) {
        list.push({
          id: "dietary",
          title: "Dietary Needs",
          subtitle: "Allergies and special dining requests",
        });
      }
      if (!isComboOffer) {
        list.push({
          id: "addons",
          title: "Equipment & Extras",
          subtitle: "Sound system, lighting, tables and decor add-ons",
        });
      }
    }

    // Common Ending Steps
    list.push({
      id: "contact",
      title: "Contact Details",
      subtitle: "Where our manager will send your official quotation",
    });
    list.push({
      id: "review",
      title: "Review & Submit",
      subtitle: "Verify event details & submit your inquiry for quotation",
    });

    return list;
  }, [isDirectPackage, isFoodOnly, isEventSetupOnly, isFullService, isComboOffer, includeFood]);

  // Keep step index bounded if steps list length changes
  useEffect(() => {
    if (stepIndex >= steps.length) {
      setStepIndex(Math.max(0, steps.length - 1));
    }
  }, [steps.length, stepIndex]);

  const currentStep = steps[stepIndex] || steps[0];

  // Review edit mode handlers
  const jumpToStep = (targetStepId) => {
    const targetIndex = steps.findIndex((s) => s.id === targetStepId);
    if (targetIndex !== -1) {
      setIsReviewEditMode(true);
      setStepIndex(targetIndex);
      setShowEditModal(false);
    }
  };

  const jumpToField = (field) => {
    switch (field) {
      case "service":
        jumpToStep(steps.some((s) => s.id === "service") ? "service" : steps[0]?.id);
        break;
      case "datetime":
      case "schedule":
        jumpToStep("datetime");
        break;
      case "guestCount":
      case "location":
        jumpToStep(isFoodOnly ? "delivery" : "event_venue");
        break;
      case "eventType":
      case "celebrant":
      case "theme":
        jumpToStep("event_venue");
        break;
      case "setup":
      case "scaffold":
        jumpToStep("setup_tier");
        break;
      case "menu":
        jumpToStep("menu");
        break;
      case "dietary":
        jumpToStep("dietary");
        break;
      case "addons":
        jumpToStep("addons");
        break;
      case "contact":
        jumpToStep("contact");
        break;
      default:
        jumpToStep("event_venue");
        break;
    }
  };

  const returnToReview = () => {
    const reviewIdx = steps.findIndex((s) => s.id === "review");
    if (reviewIdx !== -1) {
      setStepIndex(reviewIdx);
      setIsReviewEditMode(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // ESTIMATE CALCULATION
  // ══════════════════════════════════════════════════════════════════════════
  const estimatedTotal = useMemo(() => {
    let sum = 0;

    // Special Combo Offer
    if (isComboOffer && selectedPackage) {
      const pax = guestCount || comboPax || 50;
      const perPax = selectedPackage.price_per_guest || (selectedPackage.price ? selectedPackage.price / pax : 0);
      return perPax * pax;
    }

    // Setup Fee
    if (!isFoodOnly) {
      if (selectedScaffold?.price) {
        sum += selectedScaffold.price;
      } else if (selectedPackage?.setup_price) {
        sum += selectedPackage.setup_price;
      } else if (selectedPackage?.price) {
        sum += selectedPackage.price;
      } else {
        sum += businessInfo?.custom_event_setup_price || 15000;
      }
    }

    // Catering / Food
    if (includeFood || isFoodOnly) {
      if (selectedPackage?.price_per_guest) {
        sum += selectedPackage.price_per_guest * guestCount;
      } else if (selectedDishes.length > 0) {
        const dishSum = selectedDishes.reduce((acc, d) => acc + (d.price || 0), 0);
        sum += dishSum > 0 ? dishSum * guestCount : (businessInfo?.custom_food_and_event_price || 450) * guestCount;
      }
    }

    // Addons
    Object.entries(selectedAddons).forEach(([addonId, qty]) => {
      if (qty > 0) {
        const addon = addons.find((a) => a._id === addonId);
        if (addon?.price) {
          sum += addon.price * qty;
        }
      }
    });

    return sum;
  }, [
    isComboOffer,
    selectedPackage,
    guestCount,
    comboPax,
    isFoodOnly,
    selectedScaffold,
    businessInfo,
    includeFood,
    selectedDishes,
    selectedAddons,
    addons,
  ]);

  const depositRate = businessInfo?.deposit_percentage || 20;
  const depositAmount = Math.round((estimatedTotal * depositRate) / 100);

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION PER STEP
  // ══════════════════════════════════════════════════════════════════════════
  const canProceed = useMemo(() => {
    if (!currentStep) return false;

    switch (currentStep.id) {
      case "service":
        return Boolean(serviceType);

      case "datetime":
        return Boolean(selectedDate && startTime);

      case "delivery":
        if (guestCount <= 0) return false;
        if (deliveryMethod === "pickup") return true;
        return Boolean(municipality && barangay);

      case "setup_tier":
        return true;

      case "event_venue":
        if (!eventType || guestCount <= 0) return false;
        return Boolean(municipality && barangay);

      case "menu":
        return true;

      case "dietary":
        return true;

      case "addons":
        return true;

      case "contact": {
        const hasFirst = contactFirstName.trim().length > 0;
        const hasLast = contactLastName.trim().length > 0;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^(?:63|0)?9\d{9}$/;
        const hasEmail = emailRegex.test(contactEmail.trim());
        const hasPhone = phoneRegex.test(contactPhone.replace(/\D/g, ""));
        return hasFirst && hasLast && hasEmail && hasPhone;
      }

      case "review":
        return true;

      default:
        return true;
    }
  }, [
    currentStep,
    serviceType,
    selectedDate,
    startTime,
    guestCount,
    deliveryMethod,
    municipality,
    barangay,
    eventType,
    contactFirstName,
    contactLastName,
    contactEmail,
    contactPhone,
  ]);

  // Navigation handlers
  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      handleSubmitInquiry();
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    } else {
      navigation.goBack();
    }
  };

  const toggleDishSelection = (dish) => {
    const exists = selectedDishes.some((d) => d._id === dish._id);
    if (exists) {
      setSelectedDishes(selectedDishes.filter((d) => d._id !== dish._id));
    } else {
      setSelectedDishes([...selectedDishes, dish]);
    }
  };

  const handleAddonQtyChange = (addonId, newQty) => {
    setSelectedAddons((prev) => ({
      ...prev,
      [addonId]: Math.max(0, newQty),
    }));
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SUBMISSION TO API
  // ══════════════════════════════════════════════════════════════════════════
  const handleSubmitInquiry = async () => {
    setSubmitting(true);
    try {
      const activeDeliveryMethod = isFoodOnly ? deliveryMethod : "setup";
      const isPickup = activeDeliveryMethod === "pickup";

      const formattedAddons = Object.entries(selectedAddons)
        .filter(([_, qty]) => qty > 0)
        .map(([addonId, qty]) => {
          const addon = addons.find((a) => a._id === addonId);
          return {
            name: addon?.name || "Add-on",
            description: addon?.description || "",
            quantity: qty,
            price: addon?.price || 0,
          };
        });

      const payload = {
        package_id: selectedPackage?._id || undefined,
        booking_type: isComboOffer ? "special" : selectedPackage ? "regular" : "custom",
        package_name_snapshot: selectedPackage?.name || (isFoodOnly ? "Custom Food Order" : isEventSetupOnly ? "Custom Event Setup" : "Custom Event & Catering"),
        offer_base_price: isComboOffer ? estimatedTotal : undefined,
        offer_food_snapshot: isComboOffer && Array.isArray(selectedPackage?.offer_food_items)
          ? selectedPackage.offer_food_items.map((item) => ({
              menu_category: item.menu_category,
              item_name: item.item_name,
            }))
          : undefined,
        selected_scaffold_option_id: !isFoodOnly && selectedScaffold ? selectedScaffold._id : undefined,
        scaffold_width: !isFoodOnly && selectedScaffold ? selectedScaffold.width_ft : undefined,
        scaffold_length: !isFoodOnly && selectedScaffold ? selectedScaffold.length_ft : undefined,
        scaffold_base_area: !isFoodOnly && selectedScaffold ? (selectedScaffold.width_ft * selectedScaffold.length_ft) : undefined,
        scaffold_price: !isFoodOnly && selectedScaffold ? selectedScaffold.price : undefined,
        event_type: isFoodOnly ? "Food Order" : eventType,
        booking_for: celebrantName ? "someone_else" : "myself",
        celebrant_name: celebrantName,
        event_theme: eventTheme,
        event_palette: selectedPalette ? [selectedPalette] : undefined,
        event_date: selectedDate,
        start_time: startTime,
        duration_hours: 4,
        guest_count: guestCount,
        venue_type: isFoodOnly ? (isPickup ? "Customer Pick-up" : "Delivery Location") : venueType,
        service_type: serviceType,
        include_food: isFoodOnly ? true : isEventSetupOnly ? false : includeFood,
        delivery_method: activeDeliveryMethod,
        delivery_instructions: specialRequests,
        province: isPickup ? undefined : BATANGAS_PROVINCE,
        municipality: isPickup ? undefined : municipality,
        barangay: isPickup ? undefined : barangay,
        street: isPickup ? undefined : street,
        landmark: isPickup ? undefined : landmark,
        selected_menu: isComboOffer ? [] : selectedDishes.map((d) => d._id),
        service_items: formattedAddons,
        inventory_items: Array.isArray(selectedPackage?.setup_equipment)
          ? selectedPackage.setup_equipment.map((item) => ({
              inventory_id: item.inventory_id,
              name: item.name || "Equipment",
              quantity: item.quantity || 1,
            }))
          : [],
        allergies,
        dietary_restrictions: allergies,
        special_requests: specialRequests,
        estimated_total: 0,
        contact_first_name: contactFirstName.trim(),
        contact_last_name: contactLastName.trim(),
        contact_email: contactEmail.trim().toLowerCase(),
        contact_phone: contactPhone.trim(),
        contact_alt_phone: contactAltPhone ? contactAltPhone.trim() : undefined,
        contact_method: "Phone",
      };

      const result = await customerApi.submitInquiry(payload);

      // Transition immediately to the dedicated InquiryDetail confirmation screen
      if (result?._id) {
        navigation.replace("InquiryDetail", {
          inquiryId: result._id,
          isNewSubmission: true,
        });
      } else {
        navigation.replace("InquiriesList");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Unable to submit your inquiry. Please verify your entries.";
      Alert.alert("Submission Failed", errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.container}>
        <Header title="Event Inquiry" onBack={() => navigation.goBack()} />
        <LoadingState message="Preparing booking wizard..." />
      </View>
    );
  }

  const isBlockedDate = blockedDates.includes(selectedDate);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Dynamic Header with Step Progress */}
      <Header
        title={`Step ${stepIndex + 1} of ${steps.length}`}
        subtitle={currentStep?.title || "Booking Wizard"}
        onBack={handleBack}
      />

      {/* Stepper Progress Bar */}
      <AnimatedProgressBar
        currentStep={stepIndex + 1}
        totalSteps={steps.length}
        height={4}
      />

      {/* Return to Review Banner (when navigating to edit from Review) */}
      {isReviewEditMode && currentStep?.id !== "review" && (
        <View style={styles.reviewEditBanner}>
          <View style={styles.reviewEditBannerLeft}>
            <FileEdit size={15} color={colors.primary} />
            <Text style={styles.reviewEditBannerText}>
              Editing: <Text style={styles.reviewEditBannerStepName}>{currentStep?.title}</Text>
            </Text>
          </View>
          <TouchableOpacity
            style={styles.returnReviewBtn}
            onPress={returnToReview}
            activeOpacity={0.8}
          >
            <Text style={styles.returnReviewBtnText}>Back to Review</Text>
            <ChevronRight size={14} color={colors.white} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: isKeyboardVisible ? 140 : spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        {/* Step Banner / Context */}
        <View style={styles.stepHeaderCard}>
          <Text style={styles.stepTitle}>{currentStep?.title}</Text>
          <Text style={styles.stepSubtitle}>{currentStep?.subtitle}</Text>
        </View>

        {/* ══════════════════════════════════════════════════════════════════
            STEP: SERVICE SELECTION (CUSTOM ONLY)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "service" && (
          <View>
            <Text style={styles.sectionHeading}>Select Your Service Scope</Text>
            <Text style={styles.sectionDescription}>
              Customize your booking based on your exact event needs.
            </Text>

            {/* Service 1: Food and Event Setup */}
            <TouchableOpacity
              style={[
                styles.serviceCard,
                serviceType === SERVICE_TYPES.FULL_SERVICE && styles.serviceCardActive,
              ]}
              onPress={() => {
                setServiceType(SERVICE_TYPES.FULL_SERVICE);
                setIncludeFood(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.serviceCardHeader}>
                <View style={styles.serviceIconContainer}>
                  <Sparkles size={20} color={colors.primary} />
                </View>
                <View style={styles.serviceTitleWrapper}>
                  <Text style={styles.serviceCardTitle}>Food and Event Setup</Text>
                  <Text style={styles.serviceTag}>Full-Service Banquet</Text>
                </View>
                <View style={[styles.radioCircle, serviceType === SERVICE_TYPES.FULL_SERVICE && styles.radioCircleActive]}>
                  {serviceType === SERVICE_TYPES.FULL_SERVICE && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.serviceCardDescription}>
                One complete booking covering venue styling, tent/scaffolding, backdrop, dining tables, chairs, waitstaff, and full buffet banquet.
              </Text>
              <View style={styles.servicePillRow}>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Catering Menu</Text></View>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Event Styling</Text></View>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Full Crew</Text></View>
              </View>
            </TouchableOpacity>

            {/* Service 2: Food Only */}
            <TouchableOpacity
              style={[
                styles.serviceCard,
                serviceType === SERVICE_TYPES.FOOD_ONLY && styles.serviceCardActive,
              ]}
              onPress={() => {
                setServiceType(SERVICE_TYPES.FOOD_ONLY);
                setIncludeFood(true);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.serviceCardHeader}>
                <View style={styles.serviceIconContainer}>
                  <Utensils size={20} color={colors.primary} />
                </View>
                <View style={styles.serviceTitleWrapper}>
                  <Text style={styles.serviceCardTitle}>Food Only</Text>
                  <Text style={styles.serviceTag}>Buffet Delivery / Pickup</Text>
                </View>
                <View style={[styles.radioCircle, serviceType === SERVICE_TYPES.FOOD_ONLY && styles.radioCircleActive]}>
                  {serviceType === SERVICE_TYPES.FOOD_ONLY && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.serviceCardDescription}>
                Freshly prepared banquet food delivered hot to your Batangas venue, or picked up at our kitchen HQ. No tables, styling, or staging.
              </Text>
              <View style={styles.servicePillRow}>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Chef Dishes</Text></View>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Doorstep Delivery</Text></View>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Self Pickup</Text></View>
              </View>
            </TouchableOpacity>

            {/* Service 3: Event Setup Only */}
            <TouchableOpacity
              style={[
                styles.serviceCard,
                serviceType === SERVICE_TYPES.SETUP_ONLY && styles.serviceCardActive,
              ]}
              onPress={() => {
                setServiceType(SERVICE_TYPES.SETUP_ONLY);
                setIncludeFood(false);
                setSelectedDishes([]);
              }}
              activeOpacity={0.8}
            >
              <View style={styles.serviceCardHeader}>
                <View style={styles.serviceIconContainer}>
                  <Layers size={20} color={colors.primary} />
                </View>
                <View style={styles.serviceTitleWrapper}>
                  <Text style={styles.serviceCardTitle}>Event Setup Only</Text>
                  <Text style={styles.serviceTag}>Styling & Scaffolding</Text>
                </View>
                <View style={[styles.radioCircle, serviceType === SERVICE_TYPES.SETUP_ONLY && styles.radioCircleActive]}>
                  {serviceType === SERVICE_TYPES.SETUP_ONLY && <View style={styles.radioDot} />}
                </View>
              </View>
              <Text style={styles.serviceCardDescription}>
                Heavy-duty scaffolding, event tents, stage backdrop, luxury tables, VIP chairs, audio system, and lighting setup without food catering.
              </Text>
              <View style={styles.servicePillRow}>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Scaffold Tent</Text></View>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>Lighting & Audio</Text></View>
                <View style={styles.serviceMiniPill}><Text style={styles.serviceMiniPillText}>No Food</Text></View>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: DATE & TIME SCHEDULE
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "datetime" && (
          <View onLayout={(e) => { stepContainerY.current = e.nativeEvent.layout.y; }}>
            <View style={styles.noticeBox}>
              <AlertCircle size={18} color={colors.primary} />
              <Text style={styles.noticeBoxText}>
                Batangas catering requires at least {MIN_DATE_OFFSET_DAYS} days advance lead time for kitchen sourcing & logistics.
              </Text>
            </View>

            {/* Suggested Dates Strip */}
            <Text style={styles.fieldLabel}>Suggested Fast Dates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateCardsScroll}>
              {[4, 5, 6, 7, 14, 21].map((offset) => {
                const targetD = new Date();
                targetD.setDate(targetD.getDate() + offset);
                const iso = targetD.toISOString().split("T")[0];
                const dayName = targetD.toLocaleDateString("en-US", { weekday: "short" });
                const dateNum = targetD.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                const isSelected = selectedDate === iso;

                return (
                  <TouchableOpacity
                    key={offset}
                    style={[styles.dateCard, isSelected && styles.dateCardActive]}
                    onPress={() => setSelectedDate(iso)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.dateCardRadio, isSelected && styles.dateCardRadioActive]}>
                      {isSelected && <View style={styles.dateCardRadioDot} />}
                    </View>
                    <Text style={[styles.dateCardDay, isSelected && styles.dateCardTextActive]}>{dayName}</Text>
                    <Text style={[styles.dateCardDate, isSelected && styles.dateCardTextActive]}>{dateNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View onLayout={handleFieldLayout("selectedDate")}>
              <AppInput
                label="Selected Event Date (YYYY-MM-DD)"
                value={selectedDate}
                onChangeText={setSelectedDate}
                placeholder="e.g. 2026-09-25"
                leftIcon={Calendar}
                onFocus={handleFieldFocus("selectedDate")}
              />
            </View>

            {isBlockedDate && (
              <View style={styles.errorAlert}>
                <AlertCircle size={18} color={colors.error} />
                <Text style={styles.errorAlertText}>
                  This date is fully booked. Please choose another date or contact our team directly.
                </Text>
              </View>
            )}

            {/* Start Time Grid */}
            <Text style={styles.fieldLabel}>Preferred Celebration Start Time</Text>
            <View style={styles.timeGrid}>
              {["10:00 AM", "11:30 AM", "12:00 PM", "1:00 PM", "5:00 PM", "6:00 PM", "7:00 PM"].map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, startTime === time && styles.timeChipActive]}
                  onPress={() => setStartTime(time)}
                  activeOpacity={0.7}
                >
                  <Clock size={13} color={startTime === time ? colors.white : colors.foreground} style={{ marginRight: 5 }} />
                  <Text style={[styles.timeChipText, startTime === time && styles.timeChipTextActive]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: DELIVERY & FULFILLMENT (FOOD ONLY)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "delivery" && (
          <View onLayout={(e) => { stepContainerY.current = e.nativeEvent.layout.y; }}>
            {/* Guest Count Stepper with Manual Input */}
            <Text style={styles.fieldLabel}>Number of Guests / Pax</Text>
            <View style={styles.guestCountRow}>
              <AnimatedStepper
                value={guestCount}
                onChange={setGuestCount}
                min={10}
                max={1500}
                step={5}
                unit="Guests"
                size="lg"
                style={{ alignSelf: "flex-start" }}
              />
              <Text style={styles.stepperHint}>Tap number to type directly, or use + / -</Text>
            </View>

            {/* Quick Guest Count Presets */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
              {[20, 30, 50, 80, 100, 150, 200, 300].map((preset) => {
                const isSelected = guestCount === preset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => setGuestCount(preset)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                      {preset} Pax
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Fulfillment Method */}
            <Text style={styles.fieldLabel}>How would you like to receive your food?</Text>
            <View style={styles.methodCardsRow}>
              <TouchableOpacity
                style={[styles.methodCard, deliveryMethod === "delivery" && styles.methodCardActive]}
                onPress={() => setDeliveryMethod("delivery")}
                activeOpacity={0.8}
              >
                <Truck size={24} color={deliveryMethod === "delivery" ? colors.primary : colors.foregroundMuted} />
                <Text style={[styles.methodCardTitle, deliveryMethod === "delivery" && styles.methodCardTitleActive]}>
                  Drop-off Delivery
                </Text>
                <Text style={styles.methodCardDesc}>
                  Delivered hot to your venue in Batangas in insulated thermal containers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, deliveryMethod === "pickup" && styles.methodCardActive]}
                onPress={() => setDeliveryMethod("pickup")}
                activeOpacity={0.8}
              >
                <Home size={24} color={deliveryMethod === "pickup" ? colors.primary : colors.foregroundMuted} />
                <Text style={[styles.methodCardTitle, deliveryMethod === "pickup" && styles.methodCardTitleActive]}>
                  Kitchen Pick-up
                </Text>
                <Text style={styles.methodCardDesc}>
                  Collect directly from our main kitchen commissary in Batangas City
                </Text>
              </TouchableOpacity>
            </View>

            {/* Pickup Details Card */}
            {deliveryMethod === "pickup" && (
              <Card style={styles.pickupCard}>
                <View style={styles.pickupHeader}>
                  <MapPin size={20} color={colors.primary} />
                  <Text style={styles.pickupTitle}>Commissary Pick-up Location</Text>
                </View>
                <Text style={styles.pickupAddress}>
                  {businessInfo?.pickup_address || businessInfo?.address || "iReserve Central Commissary, Kumintang Ibaba, Batangas City"}
                </Text>
                <Text style={styles.pickupHours}>
                  Pick-up Hours: {businessInfo?.hours || "8:00 AM - 6:00 PM Daily"}
                </Text>
                <Text style={styles.pickupNote}>
                  * Please arrive 30 minutes before your serving time with appropriate transport.
                </Text>
              </Card>
            )}

            {/* Delivery Address */}
            {deliveryMethod === "delivery" && (
              <View style={{ marginTop: spacing.md }}>
                <Text style={styles.inputLabel}>Batangas Municipality</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowMunicipalityPicker(true)}
                  activeOpacity={0.7}
                >
                  <MapPin size={18} color={colors.primary} />
                  <Text style={styles.selectBoxText}>{municipality || "Select Municipality"}</Text>
                  <ChevronRight size={18} color={colors.foregroundMuted} />
                </TouchableOpacity>

                <Text style={styles.inputLabel}>Barangay</Text>
                <TouchableOpacity
                  style={styles.selectBox}
                  onPress={() => setShowBarangayPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectBoxText}>{barangay || "Select Barangay"}</Text>
                  <ChevronRight size={18} color={colors.foregroundMuted} />
                </TouchableOpacity>

                <View onLayout={handleFieldLayout("foodStreet")}>
                  <AppInput
                    label="Street Address / Residence"
                    placeholder="e.g. Block 4 Lot 12 Villa Verde Subd."
                    value={street}
                    onChangeText={setStreet}
                    onFocus={handleFieldFocus("foodStreet")}
                  />
                </View>

                <View onLayout={handleFieldLayout("foodLandmark")}>
                  <AppInput
                    label="Landmark (Optional)"
                    placeholder="e.g. Across Barangay Hall or Shell Station"
                    value={landmark}
                    onChangeText={setLandmark}
                    onFocus={handleFieldFocus("foodLandmark")}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: SETUP & SCAFFOLDING TIER (SETUP ONLY & FULL SERVICE)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "setup_tier" && (
          <View>
            <Text style={styles.sectionHeading}>Choose Your Event Scaffolding Size</Text>
            <Text style={styles.sectionDescription}>
              Scaffolding and tents provide weather protection and stage space for your guests.
            </Text>

            <View style={styles.scaffoldGrid}>
              {availableScaffoldOptions.map((option) => {
                const isSelected = selectedScaffoldId === option._id;
                return (
                  <TouchableOpacity
                    key={option._id}
                    style={[styles.scaffoldCard, isSelected && styles.scaffoldCardActive]}
                    onPress={() => setSelectedScaffoldId(option._id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.scaffoldCardTop}>
                      <Text style={[styles.scaffoldDimension, isSelected && styles.scaffoldDimensionActive]}>
                        {option.label || `${option.width_ft} × ${option.length_ft} ft`}
                      </Text>
                    </View>

                    <View style={styles.scaffoldCapacityRow}>
                      <User size={14} color={colors.foregroundMuted} />
                      <Text style={styles.scaffoldCapacityText}>
                        Ideal for {option.guest_min || 50} - {option.guest_max || 120} Guests
                      </Text>
                    </View>

                    <View style={styles.scaffoldFeaturesRow}>
                      <Check size={14} color={colors.primary} />
                      <Text style={styles.scaffoldFeatureText}>Heavy duty galvanized truss & canopy</Text>
                    </View>
                    <View style={styles.scaffoldFeaturesRow}>
                      <Check size={14} color={colors.primary} />
                      <Text style={styles.scaffoldFeatureText}>Professional setup and teardown crew</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: EVENT DETAILS & VENUE
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "event_venue" && (
          <View onLayout={(e) => { stepContainerY.current = e.nativeEvent.layout.y; }}>
            {/* Direct Package Banner if present */}
            {selectedPackage && (
              <Card style={styles.packageBannerCard}>
                <View style={styles.packageBannerHeader}>
                  <Sparkles size={16} color={colors.primary} />
                  <Text style={styles.packageBannerName}>{selectedPackage.name}</Text>
                </View>
                <Text style={styles.packageBannerDesc}>
                  {selectedPackage.description || "Curated celebration package with dedicated team."}
                </Text>
              </Card>
            )}

            {/* Event Type Grid */}
            <Text style={styles.fieldLabel}>What are you celebrating?</Text>
            <View style={styles.typeGrid}>
              {["Wedding", "Birthday", "Debut", "Corporate", "Anniversary", "Christening", "Other"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeCard, eventType === type && styles.typeCardActive]}
                  onPress={() => setEventType(type)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeCardText, eventType === type && styles.typeCardTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View onLayout={handleFieldLayout("celebrantName")}>
              <AppInput
                label="Celebrant / Honoree Name (Optional)"
                placeholder="e.g. Maria's 18th Debut or John & Jane"
                value={celebrantName}
                onChangeText={setCelebrantName}
                onFocus={handleFieldFocus("celebrantName")}
              />
            </View>

            {/* Guest Count Stepper with Manual Input */}
            <Text style={styles.fieldLabel}>Guest Count</Text>
            <View style={styles.guestCountRow}>
              <AnimatedStepper
                value={guestCount}
                onChange={setGuestCount}
                min={10}
                max={2000}
                step={5}
                unit="Guests"
                size="lg"
                disabled={isComboOffer}
                style={{ alignSelf: "flex-start" }}
              />
              {!isComboOffer && (
                <Text style={styles.stepperHint}>Tap number to type directly, or use + / -</Text>
              )}
            </View>
            {isComboOffer ? (
              <Text style={styles.helperNote}>* Guest count is fixed for this special combo offer.</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsScroll}>
                {[30, 50, 80, 100, 150, 200, 300, 500].map((preset) => {
                  const isSelected = guestCount === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetChip, isSelected && styles.presetChipActive]}
                      onPress={() => setGuestCount(preset)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.presetChipText, isSelected && styles.presetChipTextActive]}>
                        {preset} Pax
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* Curated Color Palettes */}
            <Text style={styles.fieldLabel}>Curated Theme & Color Palette</Text>
            <View style={styles.palettesGrid}>
              {CURATED_PALETTES.map((palette) => {
                const isSelected = selectedPalette === palette.label;
                return (
                  <TouchableOpacity
                    key={palette.id}
                    style={[styles.paletteChip, isSelected && styles.paletteChipActive]}
                    onPress={() => {
                      setSelectedPalette(palette.label);
                      if (!eventTheme) setEventTheme(palette.label);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.paletteDotsRow}>
                      {palette.preview.map((c, i) => (
                        <View key={i} style={[styles.colorDot, { backgroundColor: c }]} />
                      ))}
                    </View>
                    <Text style={[styles.paletteChipText, isSelected && styles.paletteChipTextActive]}>
                      {palette.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View onLayout={handleFieldLayout("eventTheme")}>
              <AppInput
                label="Styling Notes or Custom Theme"
                placeholder="e.g. Rustic Navy & Gold with fairy lights"
                value={eventTheme}
                onChangeText={setEventTheme}
                onFocus={handleFieldFocus("eventTheme")}
              />
            </View>

            {/* Venue Type */}
            <Text style={styles.fieldLabel}>Venue Space Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueTypesScroll}>
              {VENUE_TYPES.map((vType) => {
                const isSelected = venueType === vType;
                return (
                  <TouchableOpacity
                    key={vType}
                    style={[styles.venueTypeChip, isSelected && styles.venueTypeChipActive]}
                    onPress={() => setVenueType(vType)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.venueTypeChipText, isSelected && styles.venueTypeChipTextActive]}>
                      {vType}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Batangas Venue Location */}
            <Text style={styles.fieldLabel}>Batangas Venue Location</Text>
            <Text style={styles.inputLabel}>Municipality</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setShowMunicipalityPicker(true)}
              activeOpacity={0.7}
            >
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.selectBoxText}>{municipality || "Select Municipality"}</Text>
              <ChevronRight size={18} color={colors.foregroundMuted} />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Barangay</Text>
            <TouchableOpacity
              style={styles.selectBox}
              onPress={() => setShowBarangayPicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.selectBoxText}>{barangay || "Select Barangay"}</Text>
              <ChevronRight size={18} color={colors.foregroundMuted} />
            </TouchableOpacity>

            <View onLayout={handleFieldLayout("venueStreet")}>
              <AppInput
                label="Venue Name or Street Address"
                placeholder="e.g. Villa Mercedes Events Place, Brgy. Road"
                value={street}
                onChangeText={setStreet}
                onFocus={handleFieldFocus("venueStreet")}
              />
            </View>

            <View onLayout={handleFieldLayout("venueLandmark")}>
              <AppInput
                label="Landmark (Optional)"
                placeholder="e.g. Near St. John Parish Church"
                value={landmark}
                onChangeText={setLandmark}
                onFocus={handleFieldFocus("venueLandmark")}
              />
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: MENU & DISH SELECTION / COMBO INCLUSIONS
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "menu" && (
          <View>
            {/* Special Combo Offer Inclusions View */}
            {isComboOffer ? (
              <View>
                <Card style={styles.comboInclusionsCard}>
                  <View style={styles.comboInclusionsHeader}>
                    <Sparkles size={20} color={colors.primary} />
                    <Text style={styles.comboInclusionsTitle}>Your Special Combo Feast</Text>
                  </View>
                  <Text style={styles.comboInclusionsSub}>
                    This signature combo is pre-configured with chef favorites and complete banquet dining for {comboPax} guests.
                  </Text>

                  {/* Food Items Snapshot */}
                  {Array.isArray(selectedPackage?.offer_food_items) && selectedPackage.offer_food_items.length > 0 ? (
                    <View style={styles.comboFoodList}>
                      <Text style={styles.comboGroupLabel}>Included Dishes & Courses:</Text>
                      {selectedPackage.offer_food_items.map((item, idx) => (
                        <View key={idx} style={styles.comboFoodRow}>
                          <Check size={16} color={colors.primary} />
                          <Text style={styles.comboFoodText}>
                            {item.item_name} {item.menu_category ? `(${item.menu_category})` : ""}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Inclusions List */}
                  {Array.isArray(selectedPackage?.inclusions) && selectedPackage.inclusions.length > 0 ? (
                    <View style={styles.comboInclusionsList}>
                      <Text style={styles.comboGroupLabel}>Banquet Services Included:</Text>
                      {selectedPackage.inclusions.map((inc, idx) => (
                        <View key={idx} style={styles.comboFoodRow}>
                          <Sparkles size={14} color={colors.primary} />
                          <Text style={styles.comboFoodText}>{String(inc).replace(/^\[[^\]]+\]\s*/, "")}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </Card>
              </View>
            ) : (
              /* Custom / Regular Catalog Dish Picker */
              <View>
                {isFullService && (
                  <TouchableOpacity
                    style={[styles.cateringToggleCard, includeFood && styles.cateringToggleCardActive]}
                    onPress={() => setIncludeFood(!includeFood)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.cateringToggleRow}>
                      <Utensils size={20} color={colors.primary} />
                      <View style={{ flex: 1, marginLeft: spacing.sm }}>
                        <Text style={styles.cateringToggleTitle}>Include Catering Menu</Text>
                        <Text style={styles.cateringToggleDesc}>
                          Add our handcrafted buffet feast to your event setup
                        </Text>
                      </View>
                      <View style={[styles.dishCheckbox, includeFood && styles.dishCheckboxActive]}>
                        {includeFood && <Check size={14} color={colors.white} />}
                      </View>
                    </View>
                  </TouchableOpacity>
                )}

                {includeFood && (
                  <View style={{ marginTop: spacing.md }}>
                    <Text style={styles.fieldLabel}>
                      Select Dishes ({selectedDishes.length} selected)
                    </Text>

                    {/* Category Filter Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                      {MENU_CATEGORIES.map((cat) => {
                        const isSelected = activeMenuCat === cat;
                        return (
                          <TouchableOpacity
                            key={cat}
                            style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                            onPress={() => setActiveMenuCat(cat)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                              {cat}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Dishes List */}
                    <View style={styles.dishList}>
                      {menuItems
                        .filter((dish) => {
                          if (activeMenuCat === "All") return true;
                          return (dish.category || "").toLowerCase().includes(activeMenuCat.toLowerCase());
                        })
                        .map((dish) => {
                          const isSelected = selectedDishes.some((d) => d._id === dish._id);
                          return (
                            <TouchableOpacity
                              key={dish._id}
                              style={[styles.dishItem, isSelected && styles.dishItemActive]}
                              onPress={() => toggleDishSelection(dish)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.dishCheckbox, isSelected && styles.dishCheckboxActive]}>
                                {isSelected && <Check size={14} color={colors.white} />}
                              </View>
                              <View style={styles.dishInfo}>
                                <Text style={styles.dishName}>{dish.name}</Text>
                                <Text style={styles.dishCategory}>{dish.category || "Main Dish"}</Text>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: DIETARY NEEDS & ALLERGIES
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "dietary" && (
          <View onLayout={(e) => { stepContainerY.current = e.nativeEvent.layout.y; }}>
            <View style={styles.noticeBox}>
              <Info size={18} color={colors.primary} />
              <Text style={styles.noticeBoxText}>
                Our kitchen caters to specific dietary preferences, halal requirements, and allergen safety.
              </Text>
            </View>

            <View onLayout={handleFieldLayout("allergies")}>
              <AppInput
                label="Allergies & Dietary Restrictions"
                placeholder="e.g. 5 Vegetarians, severe peanut allergy, no shellfish"
                value={allergies}
                onChangeText={setAllergies}
                multiline
                numberOfLines={3}
                onFocus={handleFieldFocus("allergies")}
              />
            </View>

            <View onLayout={handleFieldLayout("specialRequests")}>
              <AppInput
                label="Special Culinary Requests / Serving Preferences"
                placeholder="e.g. Separate kiddie buffet table, extra gravy boat, dessert table display"
                value={specialRequests}
                onChangeText={setSpecialRequests}
                multiline
                numberOfLines={3}
                onFocus={handleFieldFocus("specialRequests")}
              />
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: ADD-ONS & EXTRAS (SETUP & FULL SERVICE)
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "addons" && (
          <View>
            <Text style={styles.sectionHeading}>Upgrade Your Celebration</Text>
            <Text style={styles.sectionDescription}>
              Select optional sound systems, lighting fixtures, and banquet furniture add-ons.
            </Text>

            {addons.length === 0 ? (
              <Card style={styles.emptyAddonsCard}>
                <Sparkles size={24} color={colors.primary} />
                <Text style={styles.emptyAddonsTitle}>All Standard Inclusions Covered</Text>
                <Text style={styles.emptyAddonsSub}>
                  Tables, chairs, and styling setup are included with your package.
                </Text>
              </Card>
            ) : (
              <View style={styles.addonsList}>
                {addons.map((addon) => {
                  const qty = selectedAddons[addon._id] || 0;
                  return (
                    <Card key={addon._id} style={styles.addonCard}>
                      <View style={styles.addonCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.addonName}>{addon.name}</Text>
                          {addon.description ? (
                            <Text style={styles.addonDesc}>{addon.description}</Text>
                          ) : null}
                          <Text style={styles.addonPrice}>
                            Itemized on official quote
                          </Text>
                        </View>

                        {/* Quantity Stepper */}
                        <View style={styles.addonStepper}>
                          <TouchableOpacity
                            style={[styles.stepperBtn, qty === 0 && styles.stepperBtnDisabled]}
                            onPress={() => handleAddonQtyChange(addon._id, qty - 1)}
                            disabled={qty === 0}
                          >
                            <Minus size={14} color={qty === 0 ? colors.foregroundMuted : colors.primary} />
                          </TouchableOpacity>
                          <Text style={styles.stepperQty}>{qty}</Text>
                          <TouchableOpacity
                            style={styles.stepperBtn}
                            onPress={() => handleAddonQtyChange(addon._id, qty + 1)}
                          >
                            <Plus size={14} color={colors.primary} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: CONTACT DETAILS
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "contact" && (
          <View onLayout={(e) => { stepContainerY.current = e.nativeEvent.layout.y; }}>
            <Text style={styles.sectionHeading}>Contact Details</Text>
            <Text style={styles.sectionDescription}>
              Our event manager will send your official quotation and follow up on this number.
            </Text>

            <View onLayout={handleFieldLayout("contactFirstName")}>
              <AppInput
                label="First Name"
                placeholder="e.g. Maria"
                value={contactFirstName}
                onChangeText={setContactFirstName}
                leftIcon={User}
                onFocus={handleFieldFocus("contactFirstName")}
              />
            </View>

            <View onLayout={handleFieldLayout("contactLastName")}>
              <AppInput
                label="Last Name"
                placeholder="e.g. Santos"
                value={contactLastName}
                onChangeText={setContactLastName}
                leftIcon={User}
                onFocus={handleFieldFocus("contactLastName")}
              />
            </View>

            <View onLayout={handleFieldLayout("contactEmail")}>
              <AppInput
                label="Email Address (Where quotation is sent)"
                placeholder="maria.santos@gmail.com"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                leftIcon={Mail}
                onFocus={handleFieldFocus("contactEmail")}
              />
            </View>

            <View onLayout={handleFieldLayout("contactPhone")}>
              <AppInput
                label="Primary Mobile Phone (Philippine 09XX)"
                placeholder="09171234567"
                value={contactPhone}
                onChangeText={setContactPhone}
                keyboardType="phone-pad"
                leftIcon={Phone}
                onFocus={handleFieldFocus("contactPhone")}
              />
            </View>

            <View onLayout={handleFieldLayout("contactAltPhone")}>
              <AppInput
                label="Alternate Phone Number (Optional)"
                placeholder="09181234567"
                value={contactAltPhone}
                onChangeText={setContactAltPhone}
                keyboardType="phone-pad"
                leftIcon={Phone}
                onFocus={handleFieldFocus("contactAltPhone")}
              />
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            STEP: REVIEW & ESTIMATE BREAKDOWN
           ══════════════════════════════════════════════════════════════════ */}
        {currentStep?.id === "review" && (
          <View>
            {/* Event Summary Card */}
            <Card style={styles.summaryCard}>
              <View style={styles.summaryCardHeader}>
                <View style={styles.summaryHeaderTitle}>
                  <FileCheck size={20} color={colors.primary} />
                  <Text style={styles.summaryHeading}>Booking Summary</Text>
                </View>
                <TouchableOpacity
                  style={styles.editInquiryHeaderBtn}
                  onPress={() => setShowEditModal(true)}
                  activeOpacity={0.7}
                  accessibilityLabel="Edit all inquiry details"
                >
                  <Edit3 size={13} color={colors.primary} />
                  <Text style={styles.editInquiryHeaderBtnText}>Edit All</Text>
                </TouchableOpacity>
              </View>

              {/* Service Scope */}
              <TouchableOpacity
                style={styles.summaryRowTouchable}
                onPress={() => jumpToField("service")}
                activeOpacity={0.65}
                accessibilityLabel="Edit service scope"
              >
                <Text style={styles.summaryLabel}>Service Scope:</Text>
                <View style={styles.summaryValueWithIcon}>
                  <Text style={styles.summaryValueHighlight}>{serviceType}</Text>
                  <View style={styles.rowEditBadge}>
                    <Pencil size={11} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Package if selected */}
              {selectedPackage && (
                <TouchableOpacity
                  style={styles.summaryRowTouchable}
                  onPress={() => jumpToField("service")}
                  activeOpacity={0.65}
                  accessibilityLabel="Edit package selection"
                >
                  <Text style={styles.summaryLabel}>Package:</Text>
                  <View style={styles.summaryValueWithIcon}>
                    <Text style={styles.summaryValue} numberOfLines={1}>{selectedPackage.name}</Text>
                    <View style={styles.rowEditBadge}>
                      <Pencil size={11} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Event Type */}
              <TouchableOpacity
                style={styles.summaryRowTouchable}
                onPress={() => jumpToField("eventType")}
                activeOpacity={0.65}
                accessibilityLabel="Edit event type"
              >
                <Text style={styles.summaryLabel}>Event Type:</Text>
                <View style={styles.summaryValueWithIcon}>
                  <Text style={styles.summaryValue}>{eventType}</Text>
                  <View style={styles.rowEditBadge}>
                    <Pencil size={11} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Celebrant if provided */}
              {celebrantName ? (
                <TouchableOpacity
                  style={styles.summaryRowTouchable}
                  onPress={() => jumpToField("celebrant")}
                  activeOpacity={0.65}
                  accessibilityLabel="Edit celebrant name"
                >
                  <Text style={styles.summaryLabel}>Celebrant:</Text>
                  <View style={styles.summaryValueWithIcon}>
                    <Text style={styles.summaryValue} numberOfLines={1}>{celebrantName}</Text>
                    <View style={styles.rowEditBadge}>
                      <Pencil size={11} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* Guest Count */}
              <TouchableOpacity
                style={styles.summaryRowTouchable}
                onPress={() => jumpToField("guestCount")}
                activeOpacity={0.65}
                accessibilityLabel="Edit guest count"
              >
                <Text style={styles.summaryLabel}>Guest Count:</Text>
                <View style={styles.summaryValueWithIcon}>
                  <Text style={styles.summaryValue}>{guestCount} Guests</Text>
                  <View style={styles.rowEditBadge}>
                    <Pencil size={11} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Schedule */}
              <TouchableOpacity
                style={styles.summaryRowTouchable}
                onPress={() => jumpToField("schedule")}
                activeOpacity={0.65}
                accessibilityLabel="Edit schedule date and time"
              >
                <Text style={styles.summaryLabel}>Schedule:</Text>
                <View style={styles.summaryValueWithIcon}>
                  <Text style={styles.summaryValue}>{formatDate(selectedDate)} at {startTime}</Text>
                  <View style={styles.rowEditBadge}>
                    <Pencil size={11} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Location */}
              <TouchableOpacity
                style={styles.summaryRowTouchable}
                onPress={() => jumpToField("location")}
                activeOpacity={0.65}
                accessibilityLabel="Edit venue location"
              >
                <Text style={styles.summaryLabel}>Location:</Text>
                <View style={styles.summaryValueWithIcon}>
                  <Text style={styles.summaryValue} numberOfLines={2}>
                    {deliveryMethod === "pickup"
                      ? "Kitchen HQ Pick-up (Batangas City)"
                      : `${barangay ? barangay + ", " : ""}${municipality}`}
                  </Text>
                  <View style={styles.rowEditBadge}>
                    <Pencil size={11} color={colors.primary} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* Setup / Scaffolding if applicable */}
              {(isEventSetupOnly || isFullService) && selectedScaffold && (
                <TouchableOpacity
                  style={styles.summaryRowTouchable}
                  onPress={() => jumpToField("setup")}
                  activeOpacity={0.65}
                  accessibilityLabel="Edit scaffolding size"
                >
                  <Text style={styles.summaryLabel}>Scaffolding:</Text>
                  <View style={styles.summaryValueWithIcon}>
                    <Text style={styles.summaryValue}>
                      {selectedScaffold.label || `${selectedScaffold.width_ft} × ${selectedScaffold.length_ft} ft`}
                    </Text>
                    <View style={styles.rowEditBadge}>
                      <Pencil size={11} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Dishes Count if food included */}
              {includeFood && (
                <TouchableOpacity
                  style={styles.summaryRowTouchable}
                  onPress={() => jumpToField("menu")}
                  activeOpacity={0.65}
                  accessibilityLabel="Edit menu dishes"
                >
                  <Text style={styles.summaryLabel}>Catering Menu:</Text>
                  <View style={styles.summaryValueWithIcon}>
                    <Text style={styles.summaryValue}>
                      {selectedDishes.length > 0 ? `${selectedDishes.length} Dishes Selected` : "Full Menu Included"}
                    </Text>
                    <View style={styles.rowEditBadge}>
                      <Pencil size={11} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Contact Info */}
              {(contactFirstName || contactEmail || contactPhone) && (
                <TouchableOpacity
                  style={styles.summaryRowTouchable}
                  onPress={() => jumpToField("contact")}
                  activeOpacity={0.65}
                  accessibilityLabel="Edit contact details"
                >
                  <Text style={styles.summaryLabel}>Contact:</Text>
                  <View style={styles.summaryValueWithIcon}>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {`${contactFirstName} ${contactLastName}`.trim() || contactEmail || contactPhone}
                    </Text>
                    <View style={styles.rowEditBadge}>
                      <Pencil size={11} color={colors.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              )}

              {/* Tap to edit hint footer */}
              <View style={styles.summaryEditHintRow}>
                <Edit3 size={11} color={colors.primary} />
                <Text style={styles.summaryEditHintText}>Tap any row or "Edit All" to modify your inquiry</Text>
              </View>

              {/* Official Quotation Guarantee Notice */}
              <SerratedDivider color={colors.background} style={{ marginVertical: spacing.md }} />

              <View style={styles.guaranteeBox}>
                <ShieldCheck size={20} color={colors.primary} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.guaranteeTitle}>Official Quotation Guarantee</Text>
                  <Text style={styles.guaranteeText}>
                    No upfront payment or pricing commitment is required at this stage. Our banquet manager will review your requested date, guest count, and logistics, then prepare an official quotation with complete package costs, deposit amount, and remaining balance.
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            paddingBottom: isKeyboardVisible
              ? spacing.sm
              : insets.bottom + spacing.sm,
          },
        ]}
      >
        {stepIndex > 0 && (
          <AppButton
            title="Back"
            variant="secondary"
            onPress={handleBack}
            size="lg"
            style={styles.backActionBtn}
          />
        )}
        <AppButton
          title={stepIndex === steps.length - 1 ? "Submit Catering Inquiry" : "Continue"}
          onPress={handleNext}
          disabled={!canProceed}
          loading={submitting}
          size="lg"
          style={styles.actionBtn}
        />
      </View>

      {/* Municipality Modal */}
      <Modal visible={showMunicipalityPicker} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Batangas Municipality</Text>
              <TouchableOpacity onPress={() => { setShowMunicipalityPicker(false); setMunicipalityQuery(""); }}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Search size={16} color={colors.foregroundMuted} style={styles.modalSearchIcon} />
              <TextInput
                placeholder="Search municipality..."
                placeholderTextColor={colors.foregroundMuted}
                value={municipalityQuery}
                onChangeText={setMunicipalityQuery}
                style={styles.modalSearchInput}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {municipalityQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMunicipalityQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color={colors.foregroundMuted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredMunicipalities.map((muni) => (
                <TouchableOpacity
                  key={muni}
                  style={styles.modalItem}
                  onPress={() => {
                    setMunicipality(muni);
                    setBarangay("");
                    setMunicipalityQuery("");
                    setShowMunicipalityPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, municipality === muni && styles.modalItemTextActive]}>
                    {muni}
                  </Text>
                  {municipality === muni && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              {filteredMunicipalities.length === 0 && (
                <View style={styles.modalEmptyState}>
                  <Text style={styles.modalEmptyText}>No municipalities match "{municipalityQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Barangay Modal */}
      <Modal visible={showBarangayPicker} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Barangay in {municipality}</Text>
              <TouchableOpacity onPress={() => { setShowBarangayPicker(false); setBarangayQuery(""); }}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Search size={16} color={colors.foregroundMuted} style={styles.modalSearchIcon} />
              <TextInput
                placeholder="Search barangay..."
                placeholderTextColor={colors.foregroundMuted}
                value={barangayQuery}
                onChangeText={setBarangayQuery}
                style={styles.modalSearchInput}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
              {barangayQuery.length > 0 && (
                <TouchableOpacity onPress={() => setBarangayQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={15} color={colors.foregroundMuted} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.modalList} keyboardShouldPersistTaps="handled">
              {filteredBarangays.map((brgy) => (
                <TouchableOpacity
                  key={brgy}
                  style={styles.modalItem}
                  onPress={() => {
                    setBarangay(brgy);
                    setBarangayQuery("");
                    setShowBarangayPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, barangay === brgy && styles.modalItemTextActive]}>
                    {brgy}
                  </Text>
                  {barangay === brgy && <Check size={18} color={colors.primary} />}
                </TouchableOpacity>
              ))}
              {filteredBarangays.length === 0 && (
                <View style={styles.modalEmptyState}>
                  <Text style={styles.modalEmptyText}>No barangays match "{barangayQuery}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Inquiry Sections Modal Sheet */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md, maxHeight: "85%" }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <FileEdit size={18} color={colors.primary} style={{ marginRight: spacing.xs }} />
                <Text style={styles.modalTitle}>Edit Inquiry Sections</Text>
              </View>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Tap any section below to jump back and update your inquiry details:
            </Text>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {/* Option 1: Schedule & Time */}
              <TouchableOpacity
                style={styles.editSectionItem}
                onPress={() => jumpToField("schedule")}
                activeOpacity={0.7}
              >
                <View style={styles.editSectionIconWrap}>
                  <Calendar size={18} color={colors.primary} />
                </View>
                <View style={styles.editSectionTextWrap}>
                  <Text style={styles.editSectionTitle}>Date & Serving Time</Text>
                  <Text style={styles.editSectionSubtitle}>{formatDate(selectedDate)} at {startTime}</Text>
                </View>
                <View style={styles.editSectionActionBadge}>
                  <Text style={styles.editSectionActionText}>Edit</Text>
                  <ChevronRight size={13} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Option 2: Event Details & Guests */}
              <TouchableOpacity
                style={styles.editSectionItem}
                onPress={() => jumpToField("eventType")}
                activeOpacity={0.7}
              >
                <View style={styles.editSectionIconWrap}>
                  <Users size={18} color={colors.primary} />
                </View>
                <View style={styles.editSectionTextWrap}>
                  <Text style={styles.editSectionTitle}>Event Details & Guests</Text>
                  <Text style={styles.editSectionSubtitle}>
                    {eventType} · {guestCount} Guests{celebrantName ? ` (${celebrantName})` : ""}
                  </Text>
                </View>
                <View style={styles.editSectionActionBadge}>
                  <Text style={styles.editSectionActionText}>Edit</Text>
                  <ChevronRight size={13} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Option 3: Venue & Location */}
              <TouchableOpacity
                style={styles.editSectionItem}
                onPress={() => jumpToField("location")}
                activeOpacity={0.7}
              >
                <View style={styles.editSectionIconWrap}>
                  <MapPin size={18} color={colors.primary} />
                </View>
                <View style={styles.editSectionTextWrap}>
                  <Text style={styles.editSectionTitle}>Venue & Location</Text>
                  <Text style={styles.editSectionSubtitle} numberOfLines={1}>
                    {deliveryMethod === "pickup"
                      ? "Kitchen HQ Pick-up (Batangas City)"
                      : `${barangay ? barangay + ", " : ""}${municipality}`}
                  </Text>
                </View>
                <View style={styles.editSectionActionBadge}>
                  <Text style={styles.editSectionActionText}>Edit</Text>
                  <ChevronRight size={13} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Option 4: Setup & Scaffolding (if applicable) */}
              {(isEventSetupOnly || isFullService) && (
                <TouchableOpacity
                  style={styles.editSectionItem}
                  onPress={() => jumpToField("setup")}
                  activeOpacity={0.7}
                >
                  <View style={styles.editSectionIconWrap}>
                    <Layers size={18} color={colors.primary} />
                  </View>
                  <View style={styles.editSectionTextWrap}>
                    <Text style={styles.editSectionTitle}>Setup & Scaffolding</Text>
                    <Text style={styles.editSectionSubtitle}>
                      {selectedScaffold?.label || `${selectedScaffold?.width_ft} × ${selectedScaffold?.length_ft} ft`}
                    </Text>
                  </View>
                  <View style={styles.editSectionActionBadge}>
                    <Text style={styles.editSectionActionText}>Edit</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Option 5: Catering Menu (if food included) */}
              {includeFood && (
                <TouchableOpacity
                  style={styles.editSectionItem}
                  onPress={() => jumpToField("menu")}
                  activeOpacity={0.7}
                >
                  <View style={styles.editSectionIconWrap}>
                    <Utensils size={18} color={colors.primary} />
                  </View>
                  <View style={styles.editSectionTextWrap}>
                    <Text style={styles.editSectionTitle}>Menu & Dining</Text>
                    <Text style={styles.editSectionSubtitle}>
                      {selectedDishes.length > 0 ? `${selectedDishes.length} Dishes Selected` : "Full Menu Included"}
                    </Text>
                  </View>
                  <View style={styles.editSectionActionBadge}>
                    <Text style={styles.editSectionActionText}>Edit</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}

              {/* Option 6: Contact Information */}
              <TouchableOpacity
                style={styles.editSectionItem}
                onPress={() => jumpToField("contact")}
                activeOpacity={0.7}
              >
                <View style={styles.editSectionIconWrap}>
                  <User size={18} color={colors.primary} />
                </View>
                <View style={styles.editSectionTextWrap}>
                  <Text style={styles.editSectionTitle}>Contact Details</Text>
                  <Text style={styles.editSectionSubtitle} numberOfLines={1}>
                    {`${contactFirstName} ${contactLastName}`.trim() || "Contact Name"} · {contactPhone || contactEmail}
                  </Text>
                </View>
                <View style={styles.editSectionActionBadge}>
                  <Text style={styles.editSectionActionText}>Edit</Text>
                  <ChevronRight size={13} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Option 7: Service Scope (if not direct package) */}
              {!isDirectPackage && (
                <TouchableOpacity
                  style={styles.editSectionItem}
                  onPress={() => jumpToField("service")}
                  activeOpacity={0.7}
                >
                  <View style={styles.editSectionIconWrap}>
                    <PackageIcon size={18} color={colors.primary} />
                  </View>
                  <View style={styles.editSectionTextWrap}>
                    <Text style={styles.editSectionTitle}>Service Scope</Text>
                    <Text style={styles.editSectionSubtitle}>{serviceType}</Text>
                  </View>
                  <View style={styles.editSectionActionBadge}>
                    <Text style={styles.editSectionActionText}>Edit</Text>
                    <ChevronRight size={13} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  stepHeaderCard: {
    marginBottom: spacing.xl,
  },
  stepTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  stepSubtitle: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    marginTop: 4,
    lineHeight: 20,
  },
  sectionHeading: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.base,
    lineHeight: 18,
  },
  serviceCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  serviceCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  serviceCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  serviceIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  serviceTitleWrapper: {
    flex: 1,
  },
  serviceCardTitle: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.foreground,
  },
  serviceTag: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 2,
  },
  serviceCardDescription: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  servicePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  serviceMiniPill: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  serviceMiniPillText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.foreground,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioCircleActive: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  noticeBoxText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  dateCardsScroll: {
    paddingVertical: spacing.xs,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  dateCard: {
    width: 86,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  dateCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  dateCardRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  dateCardRadioActive: {
    borderColor: colors.primary,
  },
  dateCardRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dateCardDay: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: 2,
  },
  dateCardDate: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  dateCardTextActive: {
    color: colors.primary,
  },
  errorAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    padding: spacing.md,
    borderRadius: radius.md,
    marginVertical: spacing.sm,
  },
  errorAlertText: {
    fontSize: typography.sizes.xs,
    color: colors.error,
    marginLeft: spacing.sm,
    flex: 1,
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  timeChipTextActive: {
    color: colors.white,
  },
  methodCardsRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.base,
  },
  methodCard: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
    alignItems: "center",
    textAlign: "center",
  },
  methodCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  methodCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  methodCardTitleActive: {
    color: colors.primary,
  },
  methodCardDesc: {
    fontSize: 11,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 15,
  },
  pickupCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    marginVertical: spacing.sm,
  },
  pickupHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  pickupTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginLeft: spacing.xs,
  },
  pickupAddress: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    lineHeight: 18,
    marginTop: 4,
  },
  pickupHours: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.primary,
    marginTop: 4,
  },
  pickupNote: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.inputBackground,
    borderWidth: 1.2,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    height: 48,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  selectBoxText: {
    flex: 1,
    fontSize: typography.sizes.base,
    color: colors.foreground,
    marginLeft: spacing.sm,
  },
  scaffoldGrid: {
    gap: spacing.md,
  },
  scaffoldCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  scaffoldCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  scaffoldCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  scaffoldDimension: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.foreground,
  },
  scaffoldDimensionActive: {
    color: colors.primary,
  },
  scaffoldPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primary,
  },
  scaffoldCapacityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  scaffoldCapacityText: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginLeft: 6,
  },
  scaffoldFeaturesRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
  },
  scaffoldFeatureText: {
    fontSize: 11,
    color: colors.foreground,
    marginLeft: 6,
  },
  packageBannerCard: {
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  packageBannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  packageBannerName: {
    fontSize: typography.sizes.sm,
    fontWeight: "800",
    color: colors.primary,
    marginLeft: spacing.xs,
  },
  packageBannerDesc: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  typeCard: {
    width: "31%",
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  typeCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  typeCardText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  typeCardTextActive: {
    color: colors.primary,
  },
  helperNote: {
    fontSize: typography.sizes.xs,
    color: colors.secondary,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  palettesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  paletteChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.2,
    borderColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  paletteChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  paletteDotsRow: {
    flexDirection: "row",
    marginRight: 6,
    gap: 3,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  paletteChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foreground,
  },
  paletteChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  venueTypesScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  venueTypeChip: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  venueTypeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  venueTypeChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  venueTypeChipTextActive: {
    color: colors.white,
  },
  comboInclusionsCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  comboInclusionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  comboInclusionsTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.foreground,
    marginLeft: spacing.sm,
  },
  comboInclusionsSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  comboGroupLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  comboFoodList: {
    marginBottom: spacing.sm,
  },
  comboFoodRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
  },
  comboFoodText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    marginLeft: spacing.sm,
    flex: 1,
  },
  comboInclusionsList: {
    marginTop: spacing.sm,
  },
  cateringToggleCard: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  cateringToggleCardActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  cateringToggleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cateringToggleTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  cateringToggleDesc: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  categoryScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  categoryChipTextActive: {
    color: colors.white,
  },
  dishList: {
    gap: spacing.xs,
  },
  dishItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  dishItemActive: {
    backgroundColor: colors.primaryLight,
  },
  dishCheckbox: {
    width: 22,
    height: 22,
    borderRadius: radius.xs,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  dishCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dishInfo: {
    flex: 1,
  },
  dishName: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  dishCategory: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  dishPrice: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  emptyAddonsCard: {
    padding: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  emptyAddonsTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptyAddonsSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: 4,
  },
  addonsList: {
    gap: spacing.sm,
  },
  addonCard: {
    padding: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  addonCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  addonName: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  addonDesc: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  addonPrice: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
    marginTop: 4,
  },
  addonStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 3,
  },
  stepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperQty: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    paddingHorizontal: spacing.sm,
    minWidth: 28,
    textAlign: "center",
  },
  reviewEditBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  reviewEditBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.xs,
  },
  reviewEditBannerText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    fontWeight: "600",
  },
  reviewEditBannerStepName: {
    fontWeight: "800",
    color: colors.primary,
  },
  returnReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    gap: 3,
  },
  returnReviewBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.white,
  },
  summaryCard: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.sm,
  },
  summaryHeaderTitle: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  summaryHeading: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.foreground,
    marginLeft: spacing.sm,
  },
  editInquiryHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  editInquiryHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs + 2,
  },
  summaryRowTouchable: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  summaryValue: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "right",
  },
  summaryValueHighlight: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
    textAlign: "right",
  },
  summaryValueWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "68%",
    justifyContent: "flex-end",
  },
  rowEditBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  summaryEditHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    gap: 4,
  },
  summaryEditHintText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  estimateLabel: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.foreground,
  },
  estimateValue: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.primary,
  },
  depositLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
  },
  depositValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.secondary,
  },
  guaranteeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: spacing.xl,
  },
  guaranteeTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  guaranteeText: {
    fontSize: 11,
    color: colors.foreground,
    marginTop: 2,
    lineHeight: 16,
  },
  bottomBar: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexDirection: "row",
    gap: spacing.md,
  },
  backActionBtn: {
    flex: 1,
  },
  actionBtn: {
    flex: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "75%",
    padding: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  modalClose: {
    fontSize: typography.sizes.sm,
    color: colors.primary,
    fontWeight: "700",
  },
  modalList: {
    marginVertical: spacing.sm,
  },
  modalSearchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : spacing.xs,
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalSearchIcon: {
    marginRight: spacing.xs,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    paddingVertical: 0,
  },
  modalEmptyState: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  modalEmptyText: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
  },
  editSectionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  editSectionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  editSectionTextWrap: {
    flex: 1,
  },
  editSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  editSectionSubtitle: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  editSectionActionBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.full,
    gap: 2,
  },
  editSectionActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary,
  },
  modalItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemText: {
    fontSize: typography.sizes.base,
    color: colors.foreground,
  },
  modalItemTextActive: {
    fontWeight: "700",
    color: colors.primary,
  },
  guestCountRow: {
    marginVertical: spacing.xs,
    gap: spacing.xs,
  },
  stepperHint: {
    fontSize: 11,
    color: colors.foregroundMuted,
    fontStyle: "italic",
    marginTop: 2,
  },
  presetsScroll: {
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginRight: spacing.xs,
  },
  presetChipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  presetChipText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foreground,
  },
  presetChipTextActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  successModalCard: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    padding: spacing.xl,
    ...shadows.lg,
  },
  successScrollContent: {
    alignItems: "center",
  },
  successIconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  successIconOuterRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.successLight,
    borderWidth: 5,
    borderColor: "rgba(167, 243, 208, 0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  successIconInnerCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  successRefPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 5,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    gap: 6,
    marginBottom: spacing.sm,
  },
  successRefText: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 0.4,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: typography.sizes.xs + 1,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  successSummaryBox: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.md,
  },
  successSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  successSummaryRowTotal: {
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  successSummaryIconCol: {
    width: 22,
    alignItems: "center",
    marginRight: 6,
  },
  successSummaryLabel: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    fontWeight: "500",
    marginRight: 6,
  },
  successSummaryVal: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
    textAlign: "right",
  },
  successTotalLabel: {
    fontSize: typography.sizes.xs + 1,
    fontWeight: "700",
    color: colors.foreground,
  },
  successTotalVal: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.primary,
    textAlign: "right",
  },
  successNextStepsCard: {
    width: "100%",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
  },
  successNextStepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  nextStepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
    marginTop: 1,
  },
  nextStepDotText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.primary,
  },
  nextStepTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  nextStepSub: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 1,
    lineHeight: 15,
  },
  successActionButtons: {
    width: "100%",
    gap: spacing.xs,
  },
  successPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: radius.full,
    gap: 4,
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  successPrimaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.white,
  },
  successSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.full,
    gap: 4,
  },
  successSecondaryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
});

export default InquiryWizardScreen;
