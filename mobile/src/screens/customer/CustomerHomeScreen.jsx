import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  CheckCircle2,
  Clock,
  Cake,
  Briefcase,
  UtensilsCrossed,
  GlassWater,
  X,
  Plus,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
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
import {
  resolveDishImage,
  resolvePackageCover,
  resolvePackagePreviewDishes,
} from "../../constants/cateringData";
import { formatCurrency, formatDate } from "../../utils/format";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const PACKAGE_CATEGORIES = [
  { id: "all", label: "All Packages" },
  { id: "wedding", label: "Weddings" },
  { id: "birthday", label: "Birthdays & Debuts" },
  { id: "food", label: "Food Only" },
  { id: "special", label: "Special Offers" },
];

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

  // Modals
  const [selectedGalleryItem, setSelectedGalleryItem] = useState(null);
  const [selectedDish, setSelectedDish] = useState(null);

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

      // Check for active booking
      if (Array.isArray(bookingsData)) {
        const upcoming = bookingsData.find(
          (b) => !["Completed", "completed", "Cancelled", "cancelled"].includes(b.status)
        );
        setActiveBooking(upcoming || null);
      }

      // Check for active inquiry
      if (Array.isArray(inquiriesData)) {
        const pending = inquiriesData.find(
          (i) => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status)
        );
        setActiveInquiry(pending || null);
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

  return (
    <View style={styles.container}>
      {/* 1. Header (Baemin Reference 1) */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.brandRow}>
          <TouchableOpacity
            style={styles.brandLocationPill}
            onPress={() => navigation.navigate("Packages")}
            activeOpacity={0.7}
          >
            <View style={styles.brandLogoDot} />
            <Text style={styles.brandLocationText} numberOfLines={1}>
              iReserve • Caezelle's Catering
            </Text>
            <ChevronDown size={14} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.headerIcons}>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() =>
                navigation.navigate("CustomerMessages", {
                  initialTab: "notifications",
                })
              }
              activeOpacity={0.7}
            >
              <Bell size={20} color={colors.foreground} />
              <NotificationBadge count={unreadCount} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.iconBtn, styles.zelleBtn]}
              onPress={() => navigation.navigate("ZelleChat")}
              activeOpacity={0.7}
            >
              <Sparkles size={18} color={colors.primary} />
            </TouchableOpacity>
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
        <View style={styles.tabNavRow}>
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
        {/* Promotional Hero Card (Baemin Reference 1) */}
        <View style={styles.heroPromoCard}>
          <View style={styles.heroPromoLeft}>
            <View style={styles.promoTag}>
              <Sparkles size={12} color={colors.primary} />
              <Text style={styles.promoTagText}>Batangas' Premier Caterer</Text>
            </View>
            <Text style={styles.heroPromoTitle}>
              Handcrafted Feasts for Your Milestones
            </Text>
            <Text style={styles.heroPromoSub}>
              Full buffet spread, premium table styling & dedicated banquet staff.
            </Text>
            <TouchableOpacity
              style={styles.heroCtaBtn}
              onPress={() => navigation.navigate("InquiryWizard")}
              activeOpacity={0.8}
            >
              <Text style={styles.heroCtaText}>Request a Quote</Text>
              <ChevronRight size={14} color={colors.white} />
            </TouchableOpacity>
          </View>

          <Image
            source={{
              uri: "https://images.pexels.com/photos/28736727/pexels-photo-28736727.jpeg?auto=compress&cs=tinysrgb&w=800",
            }}
            style={styles.heroPromoImage}
            resizeMode="cover"
          />
        </View>

        {/* Custom Event Services Strip (Matches Website) */}
        <View style={styles.customServicesSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>Custom Event Services</Text>
              <Text style={styles.sectionSub}>Tailored catering, staging, or full banquet</Text>
            </View>
          </View>

          <View style={styles.customServicesGrid}>
            <TouchableOpacity
              style={styles.customServiceCard}
              onPress={() => navigation.navigate("InquiryWizard", { serviceType: "Food Only" })}
              activeOpacity={0.8}
            >
              <View style={[styles.customServiceIconBox, { backgroundColor: "#FEF3C7" }]}>
                <Utensils size={18} color="#D97706" />
              </View>
              <Text style={styles.customServiceTitle}>Food Only</Text>
              <Text style={styles.customServiceDesc}>Buffet delivery or pickup</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customServiceCard}
              onPress={() => navigation.navigate("InquiryWizard", { serviceType: "Event Setup Only" })}
              activeOpacity={0.8}
            >
              <View style={[styles.customServiceIconBox, { backgroundColor: "#EDE9FE" }]}>
                <Layers size={18} color="#7C3AED" />
              </View>
              <Text style={styles.customServiceTitle}>Setup Only</Text>
              <Text style={styles.customServiceDesc}>Scaffolding & styling</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.customServiceCard}
              onPress={() => navigation.navigate("InquiryWizard", { serviceType: "Food and Event Setup" })}
              activeOpacity={0.8}
            >
              <View style={[styles.customServiceIconBox, { backgroundColor: colors.primaryLight }]}>
                <Sparkles size={18} color={colors.primary} />
              </View>
              <Text style={styles.customServiceTitle}>Full Service</Text>
              <Text style={styles.customServiceDesc}>Banquet & complete setup</Text>
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
                    pkg.guest_min && pkg.guest_max
                      ? `${pkg.guest_min} - ${pkg.guest_max} Pax`
                      : pkg.guest_count
                      ? `${pkg.guest_count} Pax Combo`
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

      {/* 4. Glovo-style Floating Active Event Tracking Capsule */}
      {(activeBooking || activeInquiry) && (
        <View style={styles.floatingCapsuleDock}>
          <TouchableOpacity
            style={styles.floatingCapsule}
            onPress={() => {
              if (activeBooking) {
                navigation.navigate("BookingDetail", { id: activeBooking._id });
              } else if (activeInquiry) {
                navigation.navigate("QuotationDetail", { inquiryId: activeInquiry._id });
              }
            }}
            activeOpacity={0.9}
          >
            <View style={styles.capsuleIconContainer}>
              <Calendar size={18} color={colors.white} />
            </View>

            <View style={styles.capsuleInfo}>
              <View style={styles.capsuleTopRow}>
                <Text style={styles.capsuleTitle} numberOfLines={1}>
                  {activeBooking
                    ? activeBooking.event_name || "Active Catering Booking"
                    : activeInquiry?.event_name || "Pending Quote Review"}
                </Text>
                <StatusBadge
                  status={activeBooking ? activeBooking.status : activeInquiry?.status}
                  size="sm"
                />
              </View>
              <Text style={styles.capsuleSubtitle} numberOfLines={1}>
                {activeBooking?.event_date
                  ? `Event Date: ${formatDate(activeBooking.event_date)}`
                  : "Tap to track catering milestones"}
              </Text>
            </View>

            <View style={styles.capsuleAction}>
              <ChevronRight size={18} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

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
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  brandLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    maxWidth: "75%",
  },
  brandLogoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  brandLocationText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.primary,
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
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
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
    paddingBottom: 130, // Clearance for Baemin floating navigation dock
  },
  heroPromoCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadows.md,
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
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamily.extraBold,
    color: colors.white,
    lineHeight: 20,
    marginBottom: 4,
  },
  heroPromoSub: {
    fontSize: 11,
    fontFamily: typography.fontFamily.regular,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 15,
    marginBottom: spacing.sm,
  },
  heroCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },
  heroCtaText: {
    fontSize: 11,
    fontFamily: typography.fontFamily.bold,
    color: colors.white,
  },
  heroPromoImage: {
    width: 90,
    height: 90,
    borderRadius: radius.lg,
  },
  sectionContainer: {
    marginBottom: spacing.lg,
  },
  filterPillsScroll: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
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
  floatingCapsuleDock: {
    position: "absolute",
    bottom: 84, // Anchored directly above Baemin FloatingTabBar
    left: 14,
    right: 14,
    zIndex: 99,
  },
  floatingCapsule: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    ...shadows.dock,
  },
  capsuleIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  capsuleInfo: {
    flex: 1,
  },
  capsuleTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  capsuleTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamily.bold,
    color: colors.foreground,
    flex: 1,
  },
  capsuleSubtitle: {
    fontSize: 10,
    fontFamily: typography.fontFamily.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  capsuleAction: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  customServicesSection: {
    marginBottom: spacing.lg,
  },
  customServicesGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  customServiceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    alignItems: "center",
    ...shadows.xs,
  },
  customServiceIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  customServiceTitle: {
    fontSize: typography.sizes.xs,
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
    lineHeight: 13,
  },
});

export default CustomerHomeScreen;
