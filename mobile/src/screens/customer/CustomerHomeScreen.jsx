import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Dimensions,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  ChevronDown,
  Bell,
  Sparkles,
  Heart,
  Star,
  Users,
  Utensils,
  Camera,
  Layers,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  CalendarCheck,
  FileText,
  CreditCard,
  CheckCircle2,
  Clock,
  Cake,
  Briefcase,
  UtensilsCrossed,
  GlassWater,
  X,
  Plus,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography, layout } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import customerApi from "../../api/customer";
import NotificationBadge from "../../components/common/NotificationBadge";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import AppButton from "../../components/common/AppButton";
import GalleryLightboxModal from "../../components/common/GalleryLightboxModal";
import DishDetailModal from "../../components/common/DishDetailModal";
import CoachMarkSequence from "../../components/common/CoachMarkSequence";
import {
  resolveDishImage,
  resolvePackageCover,
  resolvePackagePreviewDishes,
} from "../../constants/cateringData";
import { formatCurrency, formatDate } from "../../utils/format";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import useRealTimeRefresh from "../../utils/useRealTimeRefresh";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PACKAGE_CATEGORIES = [
  { id: "all", label: "All Packages" },
  { id: "wedding", label: "Weddings" },
  { id: "birthday", label: "Birthdays & Debuts" },
  { id: "food", label: "Food Only" },
  { id: "special", label: "Special Offers" },
];

const recordTitle = (record) => {
  if (!record) return "";
  const celebrant = record.celebrant_name?.trim();
  const eventName = record.event_type === "Other" ? record.event_type_other : record.event_type;
  if (celebrant) {
    if (eventName && celebrant.toLowerCase().includes(eventName.toLowerCase())) {
      return celebrant;
    }
    const suffix = celebrant.endsWith("s") || celebrant.endsWith("S") ? "'" : "'s";
    return `${celebrant}${suffix} ${eventName || "Event"}`;
  }
  const owner = record.contact_first_name ? `${record.contact_first_name}'s ` : "";
  if (eventName) return `${owner}${eventName}`;
  const pkgName = record.package_name_snapshot || record.package_name || record.package_id?.name;
  if (pkgName) return `${owner}${pkgName}`;
  if (record.service_type) return record.service_type;
  return record.reference || "Catering Event";
};

export const CustomerHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useSocket();

  // Active Catalog Tab: "packages" | "menu" | "gallery"
  const [activeTab, setActiveTab] = useState("packages");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [activePackageCat, setActivePackageCat] = useState("all");
  const [activeMenuCat, setActiveMenuCat] = useState("all");
  const [activeGalleryCat, setActiveGalleryCat] = useState("all");

  // Data States
  const [packages, setPackages] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [galleryItems, setGalleryItems] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [activeInquiry, setActiveInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals & Image State
  const [selectedGalleryItem, setSelectedGalleryItem] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);
  const [heroImageError, setHeroImageError] = useState(false);

  // Coach Mark Refs & Steps
  const tabNavRef = useRef(null);
  const heroCtaRef = useRef(null);
  const zelleBtnRef = useRef(null);

  const coachMarkSteps = useMemo(
    () => [
      {
        id: "step_catalog_tabs",
        title: "Explore Catering Offerings",
        description:
          "Switch between complete catering packages, custom dish menus, and styled event setups in Batangas.",
        targetRef: tabNavRef,
        placement: "bottom",
      },
      {
        id: "step_request_quote",
        title: "Request a Custom Quote",
        description:
          "Plan your celebration with an itemized catering proposal tailored to your date, guest count, and theme.",
        targetRef: heroCtaRef,
        placement: "bottom",
      },
      {
        id: "step_zelle_ai",
        title: "Zelle AI Assistant",
        description:
          "Tap here anytime for instant answers on package pairings, dish ingredients, and budget estimations.",
        targetRef: zelleBtnRef,
        placement: "bottom",
      },
    ],
    []
  );

  const loadAllData = useCallback(async () => {
    try {
      const [pkgsData, menuData, galData, bookingsData, inquiriesData] =
        await Promise.all([
          customerApi.getPackages().catch(() => null),
          customerApi.getMenu().catch(() => null),
          customerApi.getGallery().catch(() => null),
          customerApi.getBookings().catch(() => null),
          customerApi.getInquiries().catch(() => null),
        ]);

      if (Array.isArray(pkgsData) && pkgsData.length > 0) {
        setPackages(pkgsData);
        cacheData(CACHE_KEYS.PACKAGES, pkgsData);
      } else {
        const cachedP = await getCachedData(CACHE_KEYS.PACKAGES);
        if (cachedP) setPackages(cachedP);
      }

      if (Array.isArray(menuData) && menuData.length > 0) {
        setMenuItems(menuData);
        cacheData(CACHE_KEYS.MENU, menuData);
      } else {
        const cachedM = await getCachedData(CACHE_KEYS.MENU);
        if (cachedM) setMenuItems(cachedM);
      }

      if (Array.isArray(galData) && galData.length > 0) {
        const validGallery = galData.filter((item) => item?.image_url);
        setGalleryItems(validGallery);
        cacheData(CACHE_KEYS.GALLERY, validGallery);
      } else {
        const cachedG = await getCachedData(CACHE_KEYS.GALLERY);
        if (cachedG) setGalleryItems(cachedG);
      }

      // Check for active booking (signed-in customer)
      if (Array.isArray(bookingsData)) {
        const activeList = bookingsData.filter(
          (b) => !["Completed", "completed", "Cancelled", "cancelled", "refunded"].includes(b.status)
        );
        activeList.sort((a, b) => {
          const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
          const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
          return dateA - dateB;
        });
        setActiveBooking(activeList[0] || null);
      } else {
        setActiveBooking(null);
      }

      // Check for active inquiry (signed-in customer)
      if (Array.isArray(inquiriesData)) {
        const activeList = inquiriesData.filter(
          (i) => !["Converted to Booking", "Cancelled", "Quote Rejected", "Expired"].includes(i.status)
        );
        // Prioritize quotes needing action ("Quotation Sent"), then nearest event date
        activeList.sort((a, b) => {
          if (a.status === "Quotation Sent" && b.status !== "Quotation Sent") return -1;
          if (b.status === "Quotation Sent" && a.status !== "Quotation Sent") return 1;
          const dateA = a.event_date ? new Date(a.event_date).getTime() : Infinity;
          const dateB = b.event_date ? new Date(b.event_date).getTime() : Infinity;
          return dateA - dateB;
        });
        setActiveInquiry(activeList[0] || null);
      } else {
        setActiveInquiry(null);
      }
    } catch (error) {
      console.warn("Failed to load customer home catalog data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useRealTimeRefresh(loadAllData);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Dynamically derive unique categories from live menu items
  const menuCategories = useMemo(() => {
    const byKey = new Map();
    menuItems.forEach((item) => {
      const raw = String(item?.category || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, { id: raw, label: raw });
      }
    });
    return [{ id: "all", label: "All Dishes" }, ...Array.from(byKey.values())];
  }, [menuItems]);

  // Dynamically derive unique categories from live gallery items
  const galleryCategories = useMemo(() => {
    const byKey = new Map();
    galleryItems.forEach((item) => {
      const raw = String(item?.category || "").trim();
      if (!raw) return;
      const key = raw.toLowerCase();
      if (!byKey.has(key)) {
        byKey.set(key, { id: raw, label: raw });
      }
    });
    return [{ id: "all", label: "All Setups" }, ...Array.from(byKey.values())];
  }, [galleryItems]);

  // Filtered Packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch =
        !searchQuery ||
        pkg.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pkg.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activePackageCat === "all") return true;
      if (activePackageCat === "special") {
        return pkg.offer_type === "special" || pkg.is_combo || pkg.package_type === "Special Offer";
      }
      if (activePackageCat === "food") {
        return pkg.package_type === "Food Only";
      }
      const nameLower = String(pkg.name || "").toLowerCase();
      const typeLower = String(pkg.event_type || pkg.service_type || pkg.package_type || "").toLowerCase();
      return nameLower.includes(activePackageCat) || typeLower.includes(activePackageCat);
    });
  }, [packages, searchQuery, activePackageCat]);

  // Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeMenuCat === "all") return true;
      return String(item.category || "").trim().toLowerCase() === activeMenuCat.toLowerCase();
    });
  }, [menuItems, searchQuery, activeMenuCat]);

  // Filtered Gallery Items
  const filteredGallery = useMemo(() => {
    return galleryItems.filter((item) => {
      const matchesSearch =
        !searchQuery ||
        item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.venue?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (activeGalleryCat === "all") return true;
      return String(item.category || "").trim().toLowerCase() === activeGalleryCat.toLowerCase();
    });
  }, [galleryItems, searchQuery, activeGalleryCat]);

  // Derive contextual active record (booking or inquiry) for signed-in customer
  const activeRecordMeta = useMemo(() => {
    // 1. Signed-in customer's active booking takes primary precedence
    if (activeBooking) {
      const b = activeBooking;
      const statusLower = String(b.status || "").trim().toLowerCase();
      const isDepositNeeded =
        statusLower.includes("deposit") || statusLower === "customer_accepted";

      let kicker = "Active Reservation";
      let subtitlePrompt = "Tap to view milestones";

      if (isDepositNeeded) {
        kicker = "Action Required";
        subtitlePrompt = "Tap to settle deposit & lock date";
      } else if (["preparing", "food prep"].includes(statusLower)) {
        subtitlePrompt = "Kitchen preparing your menu";
      } else if (["out for delivery", "in transit"].includes(statusLower)) {
        subtitlePrompt = "Delivery dispatched to venue";
      } else if (statusLower === "ready for event") {
        subtitlePrompt = "Ready for your event celebration";
      } else if (statusLower === "ocular scheduled") {
        subtitlePrompt = "Site visit scheduled";
      }

      const title = recordTitle(b);
      const dateStr = b.event_date ? formatDate(b.event_date) : "";
      const subtitle = dateStr
        ? `Date: ${dateStr} • ${subtitlePrompt}`
        : subtitlePrompt;

      return {
        type: "booking",
        id: b._id,
        kicker,
        status: b.status,
        title,
        subtitle,
        iconType: isDepositNeeded ? "deposit" : "booking",
        onPress: () => navigation.navigate("BookingDetail", { id: b._id }),
      };
    }

    // 2. Signed-in customer's active inquiry
    if (activeInquiry) {
      const i = activeInquiry;
      const isQuoteReady = i.status === "Quotation Sent";
      const isRevision = i.status === "Revision Requested";

      let kicker = "Inquiry in Progress";
      let subtitlePrompt = "Proposal being prepared by team";

      if (isQuoteReady) {
        kicker = "Quotation Update";
        subtitlePrompt = "Tap to review pricing & menu options";
      } else if (isRevision) {
        kicker = "Quotation Revision";
        subtitlePrompt = "Catering team updating your quote";
      }

      const title = recordTitle(i);
      const dateStr = i.event_date ? formatDate(i.event_date) : "";
      const subtitle = dateStr
        ? `Date: ${dateStr} • ${subtitlePrompt}`
        : subtitlePrompt;

      return {
        type: "inquiry",
        id: i._id,
        kicker,
        status: i.status,
        title,
        subtitle,
        iconType: isQuoteReady ? "quote" : "inquiry",
        onPress: () => {
          if (isQuoteReady) {
            navigation.navigate("QuotationDetail", { inquiryId: i._id });
          } else {
            navigation.navigate("InquiryDetail", { inquiryId: i._id });
          }
        },
      };
    }

    // 3. No real active record -> completely hidden
    return null;
  }, [activeBooking, activeInquiry, navigation]);

  return (
    <View style={styles.container}>
      {/* 1. Header (Baemin Reference 1) */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.brandRow}>
          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => navigation.navigate("Notifications")}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Bell size={20} color={colors.foreground} />
              <NotificationBadge count={unreadCount} />
            </TouchableOpacity>

            <View ref={zelleBtnRef} collapsable={false}>
              <TouchableOpacity
                style={[styles.iconBtn, styles.zelleBtn]}
                onPress={() => navigation.navigate("ZelleChat")}
                activeOpacity={0.7}
              >
                <Sparkles size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* 2. Full-Pill Search Bar (Baemin/Glovo References 1 & 3) */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.foregroundMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === "packages"
                ? "Search catering packages, sets, buffets..."
                : activeTab === "menu"
                ? "Search dishes, appetizers, pasta, desserts..."
                : "Search event styling, floral setups, venues..."
            }
            placeholderTextColor={colors.textDisabled}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 3. Sticky Segmented Top Navigation Tabs (Baemin Reference 1) */}
        <View ref={tabNavRef} collapsable={false} style={styles.tabNavRow}>
          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === "packages" && styles.tabNavItemActive]}
            onPress={() => setActiveTab("packages")}
            activeOpacity={0.8}
          >
            <Layers size={16} color={activeTab === "packages" ? colors.primary : colors.foregroundMuted} />
            <Text
              style={[
                styles.tabNavText,
                activeTab === "packages" && styles.tabNavTextActive,
              ]}
            >
              Packages
            </Text>
            {activeTab === "packages" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === "menu" && styles.tabNavItemActive]}
            onPress={() => setActiveTab("menu")}
            activeOpacity={0.8}
          >
            <Utensils size={16} color={activeTab === "menu" ? colors.primary : colors.foregroundMuted} />
            <Text
              style={[
                styles.tabNavText,
                activeTab === "menu" && styles.tabNavTextActive,
              ]}
            >
              The Menu
            </Text>
            {activeTab === "menu" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabNavItem, activeTab === "gallery" && styles.tabNavItemActive]}
            onPress={() => setActiveTab("gallery")}
            activeOpacity={0.8}
          >
            <Camera size={16} color={activeTab === "gallery" ? colors.primary : colors.foregroundMuted} />
            <Text
              style={[
                styles.tabNavText,
                activeTab === "gallery" && styles.tabNavTextActive,
              ]}
            >
              Event Gallery
            </Text>
            {activeTab === "gallery" && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Scrollable Catalog Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Contextual Active Reservation / Quotation Status Card */}
        {activeRecordMeta && (
          <TouchableOpacity
            style={styles.liveTrackerCard}
            onPress={activeRecordMeta.onPress}
            activeOpacity={0.88}
          >
            <View style={styles.trackerLeft}>
              <View style={styles.trackerIconWrap}>
                {activeRecordMeta.iconType === "deposit" ? (
                  <CreditCard size={18} color="#D97706" />
                ) : activeRecordMeta.iconType === "quote" ? (
                  <FileText size={18} color={colors.primary} />
                ) : activeRecordMeta.iconType === "inquiry" ? (
                  <Clock size={18} color="#D97706" />
                ) : (
                  <CalendarCheck size={18} color={colors.primary} />
                )}
              </View>
              <View style={styles.trackerInfo}>
                <View style={styles.trackerBadgeRow}>
                  <Text style={styles.trackerKicker}>
                    {activeRecordMeta.kicker}
                  </Text>
                  <StatusBadge
                    status={activeRecordMeta.status}
                    size="sm"
                  />
                </View>
                <Text style={styles.trackerTitle} numberOfLines={1}>
                  {activeRecordMeta.title}
                </Text>
                <Text style={styles.trackerSub} numberOfLines={1}>
                  {activeRecordMeta.subtitle}
                </Text>
              </View>
            </View>
            <View style={styles.trackerActionBtn}>
              <ChevronRight size={16} color={colors.primary} />
            </View>
          </TouchableOpacity>
        )}

        {/* Promotional Hero Card */}
        <View style={styles.heroPromoCard}>
          <View style={styles.heroPromoLeft}>
            <View style={styles.promoTag}>
              <Sparkles size={11} color={colors.primary} />
              <Text style={styles.promoTagText}>Batangas' Premier Caterer</Text>
            </View>
            <Text style={styles.heroPromoTitle}>
              Effortless Catering for Your Celebration
            </Text>
            <Text style={styles.heroPromoSub} numberOfLines={2}>
              Custom buffet spreads, event styling & dedicated banquet staff.
            </Text>
            <View ref={heroCtaRef} collapsable={false} style={{ alignSelf: "flex-start" }}>
              <TouchableOpacity
                style={styles.heroCtaBtn}
                onPress={() => navigation.navigate("InquiryWizard")}
                activeOpacity={0.85}
              >
                <Text style={styles.heroCtaText}>Request a Quote</Text>
                <ChevronRight size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <Image
            source={
              heroImageError
                ? require("../../../assets/images/logo.jpg")
                : {
                    uri: "https://images.pexels.com/photos/28736727/pexels-photo-28736727.jpeg?auto=compress&cs=tinysrgb&w=800",
                  }
            }
            style={styles.heroPromoImage}
            resizeMode="cover"
            onError={() => setHeroImageError(true)}
          />
        </View>

        {/* Custom Event Services Strip */}
        <View style={styles.customServicesSection}>
          <View style={styles.customServicesHeaderRow}>
            <Text style={styles.customServicesHeading}>Custom Event Services</Text>
          </View>

          <View style={styles.customServicesGrid}>
            <TouchableOpacity
              style={styles.customServiceCard}
              onPress={() => navigation.navigate("InquiryWizard", { serviceType: "Food Only" })}
              activeOpacity={0.8}
            >
              <View style={[styles.customServiceIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Utensils size={16} color="#D97706" />
              </View>
              <Text style={styles.customServiceTitle}>Food Only</Text>
              <Text style={styles.customServiceDesc}>Delivery or pickup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customServiceCard}
              onPress={() => navigation.navigate("InquiryWizard", { serviceType: "Event Setup Only" })}
              activeOpacity={0.8}
            >
              <View style={[styles.customServiceIconBox, { backgroundColor: "#EDE9FE" }]}>
                <Layers size={16} color="#7C3AED" />
              </View>
              <Text style={styles.customServiceTitle}>Setup Only</Text>
              <Text style={styles.customServiceDesc}>Styling & setup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customServiceCard}
              onPress={() => navigation.navigate("InquiryWizard", { serviceType: "Food and Event Setup" })}
              activeOpacity={0.8}
            >
              <View style={[styles.customServiceIconBox, { backgroundColor: colors.primaryLight }]}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <Text style={styles.customServiceTitle}>Full Service</Text>
              <Text style={styles.customServiceDesc}>Banquet & setup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: PACKAGES BROWSER (Matches Website with real Hero Covers)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "packages" && (
          <View style={styles.sectionContainer}>
            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {PACKAGE_CATEGORIES.map((cat) => {
                const isSelected = activePackageCat === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setActivePackageCat(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Featured / Best Seller Highlight */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Signature Packages</Text>
                <Text style={styles.sectionSub}>Complete catering & event space packages</Text>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate("Packages")}
                style={styles.seeAllBtn}
              >
                <Text style={styles.seeAllText}>See All</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={{ gap: spacing.md }}>
                <SkeletonLoader height={240} borderRadius={radius.xl} />
                <SkeletonLoader height={240} borderRadius={radius.xl} />
              </View>
            ) : filteredPackages.length === 0 ? (
              <Card style={styles.emptyCard} variant="flat">
                <Utensils size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No Packages Found</Text>
                <Text style={styles.emptySub}>Try searching for a different keyword or category.</Text>
              </Card>
            ) : (
              <View style={styles.packageList}>
                {filteredPackages.map((pkg) => {
                  const packageCover = resolvePackageCover(pkg);
                  const priceLabel =
                    pkg.price_per_guest > 0
                      ? `${formatCurrency(pkg.price_per_guest)} / pax`
                      : pkg.price_label || "Custom Quotation";
                  const guestRange =
                    pkg.guest_max
                      ? `Up to ${pkg.guest_max} Pax`
                      : pkg.guest_count
                      ? `Up to ${pkg.guest_count} Pax`
                      : "Flexible Pax";

                  const displayInclusions = Array.isArray(pkg.inclusions) && pkg.inclusions.length > 0
                    ? pkg.inclusions.slice(0, 3).map((inc) => String(inc).replace(/^\[[^\]]+\]\s*/, ""))
                    : ["Full Table Setup", "Waitstaff", "Chafing Dishes"];

                  return (
                    <Card
                      key={pkg._id}
                      style={styles.packageCard}
                      onPress={() => navigation.navigate("PackageDetail", { id: pkg._id })}
                    >
                      {/* Package Cover Photo (matches Website) */}
                      <View style={styles.packageMediaContainer}>
                        {packageCover ? (
                          <Image
                            source={{ uri: packageCover }}
                            style={styles.packageHeroImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.packageImageFallback}>
                            <Utensils size={28} color={colors.primary} />
                            <Text style={styles.packageImageFallbackText}>{pkg.name}</Text>
                          </View>
                        )}

                        {/* Event & Offer Badges Overlay */}
                        <View style={styles.packageBadgeRow}>
                          {pkg.event_type ? (
                            <View style={styles.packageEventBadge}>
                              <Text style={styles.packageEventBadgeText}>{pkg.event_type}</Text>
                            </View>
                          ) : null}
                          {(pkg.offer_type === "special" || pkg.is_combo || pkg.package_type === "Special Offer") && (
                            <View style={styles.packageOfferBadge}>
                              <Sparkles size={11} color={colors.white} />
                              <Text style={styles.packageOfferBadgeText}>Combo Pack</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Package Info */}
                      <View style={styles.packageBody}>
                        <View style={styles.packageTitleRow}>
                          <Text style={styles.packageName} numberOfLines={1}>
                            {pkg.name}
                          </Text>
                          <View style={styles.ratingBadge}>
                            <Star size={12} color="#EAB308" fill="#EAB308" />
                            <Text style={styles.ratingText}>4.9 (120+)</Text>
                          </View>
                        </View>

                        <Text style={styles.packageDesc} numberOfLines={2}>
                          {pkg.description ||
                            "Includes multi-course buffet dining, professional uniformed waitstaff, full banquet tables and floral styling."}
                        </Text>

                        {/* Badges & Meta Row */}
                        <View style={styles.packageMetaRow}>
                          <View style={styles.metaChip}>
                            <Users size={12} color={colors.primary} />
                            <Text style={styles.metaChipText}>{guestRange}</Text>
                          </View>

                          <View style={styles.metaChipPrice}>
                            <Text style={styles.metaPriceText}>{priceLabel}</Text>
                          </View>
                        </View>

                        {/* Inclusions Strip */}
                        <View style={styles.inclusionsRow}>
                          {displayInclusions.map((inc, iIdx) => (
                            <View key={iIdx} style={styles.inclusionItem}>
                              <CheckCircle2 size={12} color={colors.success} />
                              <Text style={styles.inclusionText} numberOfLines={1}>
                                {inc}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Full-width Pill View CTA */}
                        <View style={styles.packageActionBtn}>
                          <Text style={styles.packageActionText}>View Package Details & Gallery</Text>
                          <ChevronRight size={15} color={colors.white} />
                        </View>
                      </View>
                    </Card>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: THE MENU (WITH PICTURES) (References 2 & 3)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "menu" && (
          <View style={styles.sectionContainer}>
            {/* Course Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {menuCategories.map((cat) => {
                const isSelected = activeMenuCat === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setActiveMenuCat(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Caezelle's Culinary Menu</Text>
                <Text style={styles.sectionSub}>
                  Browse authentic dishes crafted for celebrations ({filteredMenuItems.length} dishes)
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={{ gap: spacing.sm }}>
                <SkeletonLoader height={110} borderRadius={radius.lg} />
                <SkeletonLoader height={110} borderRadius={radius.lg} />
                <SkeletonLoader height={110} borderRadius={radius.lg} />
              </View>
            ) : filteredMenuItems.length === 0 ? (
              <Card style={styles.emptyCard} variant="flat">
                <Utensils size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No Dishes Found</Text>
                <Text style={styles.emptySub}>Try selecting a different food category or query.</Text>
              </Card>
            ) : (
              <View style={styles.menuGrid}>
                {filteredMenuItems.map((dish) => {
                  const dishImage = resolveDishImage(dish);
                  const price = Number(dish.price || 0);

                  return (
                    <TouchableOpacity
                      key={dish._id}
                      style={styles.dishCard}
                      onPress={() => setSelectedDish(dish)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: dishImage }}
                        style={styles.dishCardImage}
                        resizeMode="cover"
                      />
                      <View style={styles.dishCardBody}>
                        <View style={styles.dishCourseTag}>
                          <Text style={styles.dishCourseTagText}>{dish.category || "Catering Dish"}</Text>
                        </View>
                        <Text style={styles.dishCardTitle} numberOfLines={1}>
                          {dish.name}
                        </Text>
                        <Text style={styles.dishCardDesc} numberOfLines={2}>
                          {dish.description ||
                            "Prepared fresh with savory spices, tender cuts, and signature marinades."}
                        </Text>

                        <View style={styles.dishCardBottom}>
                          <Text style={styles.dishCardPrice}>
                            {price > 0 ? `${formatCurrency(price)}` : "Package Included"}
                          </Text>
                          <View style={styles.addDishPill}>
                            <Plus size={13} color={colors.primary} />
                            <Text style={styles.addDishText}>Inquire</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: EVENT GALLERY (PORTFOLIO SHOWCASE)
           ══════════════════════════════════════════════════════════════════════ */}
        {activeTab === "gallery" && (
          <View style={styles.sectionContainer}>
            {/* Gallery Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsScroll}
            >
              {galleryCategories.map((cat) => {
                const isSelected = activeGalleryCat === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.filterPill, isSelected && styles.filterPillActive]}
                    onPress={() => setActiveGalleryCat(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterPillText, isSelected && styles.filterPillTextActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={styles.sectionHeading}>Event Styling & Setups</Text>
                <Text style={styles.sectionSub}>
                  Real celebrations styled & catered by Caezelle's ({filteredGallery.length} setups)
                </Text>
              </View>
            </View>

            {loading ? (
              <View style={{ gap: spacing.md }}>
                <SkeletonLoader height={220} borderRadius={radius.xl} />
                <SkeletonLoader height={220} borderRadius={radius.xl} />
              </View>
            ) : filteredGallery.length === 0 ? (
              <Card style={styles.emptyCard} variant="flat">
                <Camera size={32} color={colors.textDisabled} />
                <Text style={styles.emptyTitle}>No Setups Found</Text>
                <Text style={styles.emptySub}>Try selecting a different gallery theme.</Text>
              </Card>
            ) : (
              <View style={styles.galleryList}>
                {filteredGallery.map((item) => (
                  <TouchableOpacity
                    key={item._id}
                    style={styles.galleryCard}
                    onPress={() => setSelectedGalleryItem(item)}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                    <View style={styles.galleryOverlay}>
                      <View style={styles.galleryCatBadge}>
                        <Sparkles size={11} color={colors.white} />
                        <Text style={styles.galleryCatText}>{item.category || "Event Setup"}</Text>
                      </View>
                      <Text style={styles.galleryTitle}>{item.title}</Text>
                      <Text style={styles.galleryVenue} numberOfLines={1}>
                        {item.description || item.venue || "Caezelle's Catered Event"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Lightbox & Detail Modals */}
      <GalleryLightboxModal
        visible={Boolean(selectedGalleryItem)}
        item={selectedGalleryItem}
        onClose={() => setSelectedGalleryItem(null)}
        onInquireSetup={(item) =>
          navigation.navigate("InquiryWizard", {
            prefillEventType: item.category,
            stylingNotes: item.title,
          })
        }
      />

      <DishDetailModal
        visible={Boolean(selectedDish)}
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        onSelectDish={(dish) =>
          navigation.navigate("InquiryWizard", {
            favoriteDish: dish.name,
          })
        }
      />

      {/* In-App Coach Marks Feature Tour */}
      <CoachMarkSequence screenKey="customer_home" steps={coachMarkSteps} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    ...shadows.sm,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: spacing.xs,
  },
  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  zelleBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.powder,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginVertical: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: colors.foreground,
    padding: 0,
  },
  tabNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    marginTop: spacing.xs,
  },
  tabNavItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 46,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    position: "relative",
  },
  tabNavItemActive: {},
  tabNavText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
  },
  tabNavTextActive: {
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: spacing.sm,
    right: spacing.sm,
    height: 3,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  scrollContent: {
    padding: spacing.base,
    paddingBottom: 130, // Generous clearance for FloatingTabBar
  },
  heroPromoCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadows.sm,
  },
  heroPromoLeft: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  promoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  promoTagText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  heroPromoTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    lineHeight: 21,
    marginBottom: 3,
  },
  heroPromoSub: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255, 255, 255, 0.9)",
    lineHeight: 15,
    marginBottom: 10,
  },
  heroCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    ...shadows.xs,
  },
  heroCtaText: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  heroPromoImage: {
    width: 78,
    height: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  filterPillsScroll: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.base,
    paddingVertical: 9,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.semiBold,
    color: colors.foreground,
  },
  filterPillTextActive: {
    color: colors.white,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  sectionSub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  emptyCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
  },
  packageList: {
    gap: spacing.md,
  },
  packageCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  packageMediaContainer: {
    height: 175,
    width: "100%",
    position: "relative",
    backgroundColor: colors.surfaceAlt,
  },
  packageHeroImage: {
    width: "100%",
    height: "100%",
  },
  packageImageFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
  },
  packageImageFallbackText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  packageBadgeRow: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  packageEventBadge: {
    backgroundColor: "rgba(10, 15, 29, 0.8)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  packageEventBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
  packageOfferBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.accentDark,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  packageOfferBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
  },
  packageBody: {
    padding: spacing.md,
  },
  packageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  packageName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.xs,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  ratingText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  packageDesc: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  packageMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  metaChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  metaChipPrice: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  metaPriceText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  inclusionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginVertical: spacing.xs,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  inclusionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inclusionText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.medium,
    color: colors.foregroundMuted,
  },
  packageActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: radius.pill,
    marginTop: spacing.xs,
  },
  packageActionText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  menuGrid: {
    gap: spacing.sm,
  },
  dishCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  dishCardImage: {
    width: 110,
    height: 110,
    backgroundColor: colors.surfaceAlt,
  },
  dishCardBody: {
    flex: 1,
    padding: spacing.sm + 2,
    justifyContent: "space-between",
  },
  dishCourseTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    alignSelf: "flex-start",
  },
  dishCourseTagText: {
    fontSize: 9,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    textTransform: "uppercase",
  },
  dishCardTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    marginTop: 2,
  },
  dishCardDesc: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    lineHeight: 15,
  },
  dishCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dishCardPrice: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
  },
  addDishPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  addDishText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
  },
  galleryList: {
    gap: spacing.md,
  },
  galleryCard: {
    borderRadius: radius.xl,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
    aspectRatio: 16 / 10,
    ...shadows.md,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  galleryOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    padding: spacing.md,
  },
  galleryCatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  galleryCatText: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  galleryTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  galleryVenue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.medium,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  liveTrackerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: spacing.sm + 2,
    ...shadows.xs,
  },
  trackerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: spacing.xs,
  },
  trackerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  trackerInfo: {
    flex: 1,
  },
  trackerBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  trackerKicker: {
    fontSize: 10,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  trackerTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    lineHeight: 18,
    marginBottom: 1,
  },
  trackerSub: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    lineHeight: 15,
  },
  trackerActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  customServicesSection: {
    marginBottom: spacing.md,
  },
  customServicesHeaderRow: {
    marginBottom: spacing.xs,
  },
  customServicesHeading: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.foreground,
  },
  customServicesGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  customServiceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    ...shadows.xs,
  },
  customServiceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },
  customServiceTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    textAlign: "center",
  },
  customServiceDesc: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 12,
  },
});

export default CustomerHomeScreen;
