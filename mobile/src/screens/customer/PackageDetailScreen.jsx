import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  Sparkles,
  Utensils,
  Layers,
  Camera,
  X,
  Plus,
  Star,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Users,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import { resolvePackageCover } from "../../constants/cateringData";
import Header from "../../components/common/Header";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { formatCurrency, formatDate } from "../../utils/format";
import {
  isSpecialOffer,
  offerPricePerPax,
  offerGuestCount,
  offerFoodByCategory,
  offerInclusions,
  groupInclusions,
  scaffoldOptions,
  capacityLabel,
  serviceLabel,
  eventTypeForPackage,
  setupFromPrice,
  priceLabel,
  getPackageRatingStats,
  getCustomerInitials,
  getCustomerEventDetails,
} from "../../utils/packageDisplay";

// Established iReserve Design System Tokens
const BRAND_BLUE = "#4C81E0";
const BRAND_BLUE_LIGHT = "#EFF6FF";
const BRAND_BLUE_BORDER = "#BFDBFE";
const SLATE_900 = "#0F172A";
const SLATE_800 = "#1E293B";
const SLATE_700 = "#334155";
const SLATE_600 = "#475569";
const SLATE_500 = "#64748B";
const SLATE_400 = "#94A3B8";
const SLATE_200 = "#E2E8F0";
const SLATE_100 = "#F1F5F9";
const STAR_AMBER = "#F59E0B";

export const PackageDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route?.params || {};

  const [packageData, setPackageData] = useState(null);
  const [ratingStats, setRatingStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedScaffoldId, setSelectedScaffoldId] = useState(null);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate("Packages");
    }
  };

  useEffect(() => {
    if (!id) {
      setError("Package reference is missing.");
      setLoading(false);
      return;
    }

    const fetchPackage = async () => {
      try {
        const [data, ratingsData] = await Promise.all([
          customerApi.getPackageById(id),
          customerApi.getRatings().catch(() => []),
        ]);
        setPackageData(data);
        if (data && Array.isArray(ratingsData)) {
          const stats = getPackageRatingStats(data, ratingsData);
          setRatingStats(stats);
        }
      } catch (err) {
        setError("Unable to load package details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);

  const isCombo = isSpecialOffer(packageData);
  const packageCover = resolvePackageCover(packageData);
  const packageGallery = useMemo(
    () => (Array.isArray(packageData?.gallery) ? packageData.gallery.filter(Boolean) : []),
    [packageData]
  );

  const comboPerPax = isCombo ? offerPricePerPax(packageData) : 0;
  const comboGuests = isCombo ? offerGuestCount(packageData) : 0;
  const comboCourses = useMemo(
    () => (isCombo ? offerFoodByCategory(packageData) : []),
    [isCombo, packageData]
  );
  const comboInclusionList = useMemo(
    () => (isCombo ? offerInclusions(packageData) : []),
    [isCombo, packageData]
  );

  const regularInclusionGroups = useMemo(
    () => (!isCombo ? groupInclusions(packageData?.inclusions) : []),
    [isCombo, packageData]
  );
  const validScaffoldList = useMemo(
    () => (!isCombo ? scaffoldOptions(packageData) : []),
    [isCombo, packageData]
  );

  // Initialize selected scaffold ID with default or first available option
  useEffect(() => {
    if (packageData && !isCombo && validScaffoldList.length > 0) {
      const defaultOpt =
        validScaffoldList.find(
          (o) => String(o._id) === String(packageData.default_scaffold_option_id)
        ) || validScaffoldList[0];
      if (defaultOpt) {
        setSelectedScaffoldId(String(defaultOpt._id));
      }
    }
  }, [packageData, isCombo, validScaffoldList]);

  const activeScaffold = useMemo(() => {
    if (!validScaffoldList.length) return null;
    return (
      validScaffoldList.find((o) => String(o._id) === String(selectedScaffoldId)) ||
      validScaffoldList[0]
    );
  }, [validScaffoldList, selectedScaffoldId]);

  const guestCap = capacityLabel(packageData);
  const eventType = eventTypeForPackage(packageData);
  const serviceText = serviceLabel(packageData);
  const setupFrom = !isCombo ? setupFromPrice(packageData) : null;
  const longDescription = packageData?.fullDescription || packageData?.description;

  const addOns = useMemo(() => {
    return !isCombo && Array.isArray(packageData?.add_ons)
      ? packageData.add_ons.filter((item) => item?.name || typeof item === "string")
      : [];
  }, [isCombo, packageData]);

  // Total inclusions count
  const totalInclusionsCount = useMemo(() => {
    if (isCombo) {
      const dishCount = comboCourses.reduce((sum, c) => sum + (c.items?.length || 0), 0);
      return dishCount + comboInclusionList.length;
    }
    return packageData?.inclusions?.length || 0;
  }, [isCombo, comboCourses, comboInclusionList, packageData]);

  // Streamlined eyebrow to avoid repetitive event category strings
  const eyebrowLabel = useMemo(() => {
    if (isCombo) return "SPECIAL OFFER";
    const nameLower = String(packageData?.name || "").toLowerCase();
    const eventLower = String(eventType || "").toLowerCase();
    // Only include eventType if it is not already in the package title
    if (eventLower && !nameLower.includes(eventLower)) {
      return `${serviceText} · ${eventType}`.toUpperCase();
    }
    return (serviceText || "CATERING PACKAGE").toUpperCase();
  }, [isCombo, packageData?.name, eventType, serviceText]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Package Details" onBack={handleGoBack} />
        <LoadingState message="Loading package details..." />
      </View>
    );
  }

  if (error || !packageData) {
    return (
      <View style={styles.container}>
        <Header title="Package Details" onBack={handleGoBack} />
        <ErrorState message={error} onRetry={handleGoBack} />
      </View>
    );
  }

  // Active pricing resolution
  const heroPriceAmount = isCombo
    ? formatCurrency(comboPerPax)
    : activeScaffold?.price
    ? formatCurrency(activeScaffold.price)
    : packageData.price_per_guest
    ? formatCurrency(packageData.price_per_guest)
    : packageData.setup_price
    ? formatCurrency(packageData.setup_price)
    : setupFrom
    ? formatCurrency(setupFrom)
    : null;

  const heroPriceUnit = isCombo
    ? " per plate / pax"
    : activeScaffold?.price
    ? " Base setup"
    : packageData.price_per_guest
    ? " per guest"
    : packageData.setup_price
    ? " Base setup"
    : setupFrom
    ? " starting setup"
    : "";

  // Dynamic bottom scroll inset to guarantee content scrolls completely above the sticky footer
  const scrollBottomInset = Math.max(insets.bottom, 16) + 140;

  return (
    <View style={styles.container}>
      <Header
        title={isCombo ? "Combo Pack Details" : "Package Details"}
        onBack={handleGoBack}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: scrollBottomInset },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Cover Photo */}
        {packageCover ? (
          <TouchableOpacity
            style={styles.heroMediaCard}
            onPress={() => setLightboxImage(packageCover)}
            activeOpacity={0.9}
            accessibilityLabel="View full photo"
          >
            <Image
              source={{ uri: packageCover }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            {/* Show badge on image only for Special Offer Combo packs to keep regular photos clean */}
            {isCombo ? (
              <View style={styles.coverBadgeRow}>
                <View style={styles.comboCoverBadge}>
                  <Sparkles size={11} color="#FFFFFF" />
                  <Text style={styles.comboCoverBadgeText}>Combo Pack</Text>
                </View>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {/* 2. Package Header & Pricing Hierarchy */}
        <View style={styles.titleSection}>
          <View style={styles.eyebrowRow}>
            <Text style={styles.eyebrowText}>{eyebrowLabel}</Text>

            {/* Backend promotional badge for special combos only */}
            {isCombo && packageData.badge_text ? (
              <View style={styles.offerBadge}>
                <Sparkles size={10} color={BRAND_BLUE} />
                <Text style={styles.offerBadgeText}>{packageData.badge_text}</Text>
              </View>
            ) : null}

            {/* Star rating indicator if verified reviews exist */}
            {ratingStats && (
              <View style={styles.ratingBadge}>
                <Star size={11} color={STAR_AMBER} fill={STAR_AMBER} />
                <Text style={styles.ratingBadgeText}>
                  {ratingStats.averageRating.toFixed(1)} ({ratingStats.reviewCount})
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.packageName} numberOfLines={2}>
            {packageData.name}
          </Text>

          <Text style={styles.packageCategory}>
            {isCombo
              ? "Curated Combo Meal · Food Only"
              : packageData.package_type || "Catering & Event Setup"}
          </Text>

          {/* Prominent, tasteful price display */}
          <View style={styles.priceHero}>
            {heroPriceAmount ? (
              <View style={styles.priceCompound}>
                {!isCombo && !activeScaffold?.price && !packageData.price_per_guest && setupFrom ? (
                  <Text style={styles.pricePrefix}>Setup from </Text>
                ) : null}
                <Text style={styles.priceHeroText}>{heroPriceAmount}</Text>
                <Text style={styles.priceHeroUnit}>{heroPriceUnit}</Text>
              </View>
            ) : (
              <Text style={styles.priceHeroText}>
                {packageData.package_type === "Food Only"
                  ? "Priced by menu selection"
                  : priceLabel(packageData)}
              </Text>
            )}
          </View>
        </View>

        {/* 3. Non-Redundant Key Specs Strip (Guest Capacity & Total Inclusions) */}
        <View style={styles.specsStrip}>
          <View style={styles.specColumn}>
            <View style={styles.specHeaderRow}>
              <Users size={14} color={BRAND_BLUE} strokeWidth={2.2} />
              <Text style={styles.specLabel}>EST. GUEST CAPACITY</Text>
            </View>
            <Text style={styles.specValue} numberOfLines={1}>
              {isCombo
                ? `${comboGuests} Pax Fixed`
                : activeScaffold?.guest_max
                ? `Up to ${activeScaffold.guest_max} Guests`
                : guestCap || "Flexible Capacity"}
            </Text>
          </View>

          <View style={styles.specDivider} />

          <View style={styles.specColumn}>
            <View style={styles.specHeaderRow}>
              <Layers size={14} color={BRAND_BLUE} strokeWidth={2.2} />
              <Text style={styles.specLabel}>INCLUDED INVENTORY</Text>
            </View>
            <Text style={styles.specValue} numberOfLines={1}>
              {totalInclusionsCount} {totalInclusionsCount === 1 ? "Item Included" : "Items Included"}
            </Text>
          </View>
        </View>

        {/* 4. Overview Section */}
        {Boolean(longDescription) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>
              {isCombo ? "About This Combo" : "Overview"}
            </Text>
            <Text style={styles.descriptionText}>{longDescription}</Text>
          </View>
        )}

        {/* 5. COMBO PACK: What this combo serves */}
        {isCombo && comboCourses.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Utensils size={16} color={BRAND_BLUE} />
                <Text style={styles.sectionHeading}>What This Combo Serves</Text>
              </View>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountPillText}>
                  {comboCourses.length} {comboCourses.length === 1 ? "Course" : "Courses"}
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Included dishes & choices organized by course category:
            </Text>

            {comboCourses.map((course, cIdx) => (
              <View key={course.category || cIdx} style={styles.categoryCard}>
                <View style={styles.categoryCardHeader}>
                  <Text style={styles.categoryTitle}>
                    {course.category || "Included Dishes"}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {course.items.length} {course.items.length === 1 ? "dish" : "dishes"}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {course.items.map((dishName, dIdx) => (
                    <View
                      key={dIdx}
                      style={[
                        styles.itemRow,
                        dIdx === course.items.length - 1 && styles.itemRowLast,
                      ]}
                    >
                      <View style={styles.checkCircle}>
                        <Check size={11} color={BRAND_BLUE} strokeWidth={2.5} />
                      </View>
                      <Text style={styles.itemNameText}>{dishName}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 6. COMBO PACK: What this combo includes */}
        {isCombo && comboInclusionList.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Layers size={16} color={BRAND_BLUE} />
                <Text style={styles.sectionHeading}>What This Combo Includes</Text>
              </View>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountPillText}>
                  {comboInclusionList.length} Items
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Included service equipment and dining essentials:
            </Text>

            <View style={styles.categoryCard}>
              <View style={styles.itemsList}>
                {comboInclusionList.map((inc, iIdx) => (
                  <View
                    key={iIdx}
                    style={[
                      styles.itemRow,
                      iIdx === comboInclusionList.length - 1 && styles.itemRowLast,
                    ]}
                  >
                    <View style={styles.checkCircle}>
                      <Check size={11} color={BRAND_BLUE} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.itemNameText}>{inc}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* 7. REGULAR PACKAGE: Included Inventory Grouped by Category */}
        {!isCombo && regularInclusionGroups.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Layers size={16} color={BRAND_BLUE} />
                <Text style={styles.sectionHeading}>Included In This Package</Text>
              </View>
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountPillText}>
                  {packageData.inclusions?.length || 0} Total Items
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Setup furniture and dining service inventory provided with this package:
            </Text>

            {regularInclusionGroups.map((group, gIdx) => (
              <View key={group.category || gIdx} style={styles.categoryCard}>
                <View style={styles.categoryCardHeader}>
                  <Text style={styles.categoryTitle}>
                    {group.category || "General Inclusions"}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {group.items.length} {group.items.length === 1 ? "item" : "items"}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsList}>
                  {group.items.map((item, itemIdx) => (
                    <View
                      key={itemIdx}
                      style={[
                        styles.itemRow,
                        itemIdx === group.items.length - 1 && styles.itemRowLast,
                      ]}
                    >
                      <View style={styles.checkCircle}>
                        <Check size={11} color={BRAND_BLUE} strokeWidth={2.5} />
                      </View>
                      <Text style={styles.itemNameText}>{item.name}</Text>
                      {item.qty ? (
                        <View style={styles.qtyPill}>
                          <Text style={styles.qtyPillText}>{item.qty}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 8. REGULAR PACKAGE: Available Space / Scaffold Footprints (Interactive Selector) */}
        {!isCombo && validScaffoldList.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>
                Available Space / Scaffold Footprints
              </Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Tap to select the venue footprint that best matches your space:
            </Text>

            <View style={styles.scaffoldList}>
              {validScaffoldList.map((opt, sIdx) => {
                const isSelected = String(opt._id) === String(activeScaffold?._id);
                const dims =
                  opt.width_ft && opt.length_ft
                    ? `${opt.width_ft} × ${opt.length_ft} ft`
                    : opt.label || "Standard Space";
                const area =
                  opt.area_ft2 ||
                  (opt.width_ft && opt.length_ft ? `${opt.width_ft * opt.length_ft} sq ft` : null);
                const guestMax = opt.guest_max ? `Up to ${opt.guest_max} guests` : null;
                const priceStr = opt.price
                  ? formatCurrency(opt.price)
                  : opt.free_setup
                  ? "Free with package"
                  : packageData.setup_price
                  ? formatCurrency(packageData.setup_price)
                  : "Included";

                return (
                  <TouchableOpacity
                    key={opt._id || sIdx}
                    style={[
                      styles.scaffoldOptionCard,
                      isSelected && styles.scaffoldOptionCardSelected,
                    ]}
                    onPress={() => setSelectedScaffoldId(String(opt._id))}
                    activeOpacity={0.75}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.scaffoldLeftCol}>
                      <View style={styles.scaffoldTitleRow}>
                        <Text
                          style={[
                            styles.scaffoldOptionTitle,
                            isSelected && styles.scaffoldOptionTitleSelected,
                          ]}
                          numberOfLines={1}
                        >
                          {opt.label || dims}
                        </Text>
                        {isSelected && (
                          <View style={styles.selectedPill}>
                            <Text style={styles.selectedPillText}>Selected</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.scaffoldMetaText} numberOfLines={1}>
                        {[area, guestMax].filter(Boolean).join(" · ")}
                      </Text>
                    </View>

                    <View style={styles.scaffoldRightCol}>
                      <Text
                        style={[
                          styles.scaffoldPriceText,
                          isSelected && styles.scaffoldPriceTextSelected,
                        ]}
                      >
                        {priceStr}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* 9. REGULAR PACKAGE: Optional Add-Ons */}
        {!isCombo && addOns.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Optional Add-Ons</Text>
            <Text style={styles.sectionSubtitle}>
              Selectable during booking inquiry (charged on top of package):
            </Text>
            <View style={styles.addOnsGrid}>
              {addOns.map((item, aIdx) => {
                const name = typeof item === "string" ? item : item?.name;
                const price = item?.price ? formatCurrency(item.price) : null;
                return (
                  <View key={aIdx} style={styles.addOnChip}>
                    <View style={styles.addOnIconBox}>
                      <Plus size={11} color={BRAND_BLUE} strokeWidth={2.5} />
                    </View>
                    <Text style={styles.addOnChipText}>{name}</Text>
                    {price ? <Text style={styles.addOnPriceText}>{price}</Text> : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 10. Customer Reviews Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Star size={16} color={STAR_AMBER} fill={STAR_AMBER} />
              <Text style={styles.sectionHeading}>Customer Reviews</Text>
            </View>
            {ratingStats && (
              <View style={styles.sectionCountPill}>
                <Text style={styles.sectionCountPillText}>
                  {ratingStats.reviewCount} {ratingStats.reviewCount === 1 ? "Review" : "Reviews"}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.sectionSubtitle}>
            {ratingStats && ratingStats.reviews.length > 0
              ? "Verified feedback from clients who booked this package:"
              : "Client ratings and feedback for this catering package:"}
          </Text>

          {ratingStats && ratingStats.reviews.length > 0 ? (
            <>
              {/* Trust Score Summary Card */}
              <View style={styles.trustSummaryCard}>
                <View style={styles.trustScoreBlock}>
                  <Text style={styles.trustScoreNumber}>
                    {ratingStats.averageRating.toFixed(1)}
                  </Text>
                  <Text style={styles.trustScoreDenominator}>/ 5</Text>
                </View>

                <View style={styles.trustStarsBlock}>
                  <View style={styles.trustStarRow}>
                    {[1, 2, 3, 4, 5].map((starIdx) => (
                      <Star
                        key={starIdx}
                        size={15}
                        color={STAR_AMBER}
                        fill={
                          starIdx <= Math.round(ratingStats.averageRating)
                            ? STAR_AMBER
                            : "transparent"
                        }
                      />
                    ))}
                  </View>
                  <Text style={styles.trustCountText}>
                    {ratingStats.reviewCount === 1
                      ? "Based on 1 verified client review"
                      : `Based on ${ratingStats.reviewCount} verified client reviews`}
                  </Text>
                </View>
              </View>

              {/* Individual Review Cards */}
              <View style={styles.reviewsList}>
                {(showAllReviews ? ratingStats.reviews : ratingStats.reviews.slice(0, 3)).map(
                  (rev, rIdx) => {
                    const stars = Math.max(1, Math.min(5, Number(rev.stars) || 5));
                    const customerName =
                      rev.customer_id?.full_name?.trim() ||
                      [rev.customer_id?.first_name, rev.customer_id?.last_name]
                        .filter(Boolean)
                        .join(" ")
                        .trim() ||
                      "Verified Client";
                    const initials = getCustomerInitials(customerName);
                    const dateFormatted = formatDate(rev.createdAt);
                    const eventDetails = getCustomerEventDetails(rev);

                    return (
                      <View key={rev._id || rIdx} style={styles.reviewCard}>
                        <View style={styles.reviewCardHeader}>
                          <View style={styles.reviewStarRow}>
                            {[1, 2, 3, 4, 5].map((starIdx) => (
                              <Star
                                key={starIdx}
                                size={13}
                                color={STAR_AMBER}
                                fill={starIdx <= stars ? STAR_AMBER : "transparent"}
                              />
                            ))}
                          </View>
                          {dateFormatted ? (
                            <Text style={styles.reviewDateText}>{dateFormatted}</Text>
                          ) : null}
                        </View>

                        <Text style={styles.reviewQuoteText}>
                          {rev.review?.trim()
                            ? `"${rev.review.trim()}"`
                            : "Rating submitted for completed event."}
                        </Text>

                        <View style={styles.reviewAuthorRow}>
                          <View style={styles.reviewAvatar}>
                            <Text style={styles.reviewAvatarText}>{initials}</Text>
                          </View>
                          <View style={styles.reviewIdentityCol}>
                            <Text style={styles.reviewAuthorName}>{customerName}</Text>
                            <View style={styles.reviewVerifiedBadgeRow}>
                              <CheckCircle2 size={11} color={BRAND_BLUE} />
                              <Text style={styles.reviewVerifiedBadgeText}>Verified Booking</Text>
                              {eventDetails ? (
                                <>
                                  <Text style={styles.reviewMetaDot}>•</Text>
                                  <Text style={styles.reviewEventDetailsText} numberOfLines={1}>
                                    {eventDetails}
                                  </Text>
                                </>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  }
                )}
              </View>

              {/* View More Reviews Toggle */}
              {ratingStats.reviews.length > 3 && (
                <TouchableOpacity
                  style={styles.seeAllReviewsBtn}
                  onPress={() => setShowAllReviews((prev) => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeAllReviewsBtnText}>
                    {showAllReviews
                      ? "Show Fewer Reviews"
                      : `See All ${ratingStats.reviewCount} Reviews`}
                  </Text>
                  {showAllReviews ? (
                    <ChevronUp size={14} color={BRAND_BLUE} />
                  ) : (
                    <ChevronDown size={14} color={BRAND_BLUE} />
                  )}
                </TouchableOpacity>
              )}
            </>
          ) : (
            /* Clean, Compact Empty State */
            <View style={styles.emptyReviewsCard}>
              <View style={styles.emptyReviewsIconCircle}>
                <Star size={18} color={SLATE_400} />
              </View>
              <Text style={styles.emptyReviewsTitle}>No Reviews for This Package Yet</Text>
              <Text style={styles.emptyReviewsDesc}>
                Verified client reviews will appear here once events for this package are completed.
              </Text>
            </View>
          )}
        </View>

        {/* 11. Package Gallery Photos */}
        {packageGallery.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Camera size={16} color={BRAND_BLUE} />
                <Text style={styles.sectionHeading}>
                  Photos from this package ({packageGallery.length})
                </Text>
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>
              Event setup and styling captures:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScroll}
            >
              {packageGallery.map((imgUrl, gIdx) => (
                <TouchableOpacity
                  key={gIdx}
                  style={styles.galleryThumb}
                  onPress={() => setLightboxImage(imgUrl)}
                  activeOpacity={0.8}
                  accessibilityLabel={`View photo ${gIdx + 1}`}
                >
                  <Image
                    source={{ uri: imgUrl }}
                    style={styles.galleryThumbImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* 12. Sticky Bottom Action Bar with Safe Area Clearance */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 14) },
        ]}
      >
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>
            {isCombo
              ? "Combo Rate"
              : activeScaffold?.price
              ? "Base Setup"
              : packageData.price_per_guest
              ? "Price per guest"
              : "Starting from"}
          </Text>
          <Text style={styles.bottomPriceValue} numberOfLines={1}>
            {isCombo
              ? `${formatCurrency(comboPerPax)}/pax`
              : activeScaffold?.price
              ? formatCurrency(activeScaffold.price)
              : packageData.price_per_guest
              ? `${formatCurrency(packageData.price_per_guest)}/pax`
              : packageData.setup_price
              ? formatCurrency(packageData.setup_price)
              : setupFrom
              ? `from ${formatCurrency(setupFrom)}`
              : "Quoted per event"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.inquireButton}
          onPress={() =>
            navigation.navigate("InquiryWizard", {
              selectedPackage: packageData,
              selectedScaffoldOptionId: activeScaffold?._id,
            })
          }
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Select and Inquire"
        >
          <Text style={styles.inquireButtonText}>Select & Inquire</Text>
        </TouchableOpacity>
      </View>

      {/* 13. Lightbox Preview Modal */}
      <Modal
        visible={Boolean(lightboxImage)}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxImage(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={[styles.modalCloseBtn, { top: insets.top + spacing.sm }]}
            onPress={() => setLightboxImage(null)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Close photo preview"
          >
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {lightboxImage && (
            <Image
              source={{ uri: lightboxImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Hero Media
  heroMediaCard: {
    width: "100%",
    height: 216,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 20,
    backgroundColor: SLATE_100,
    position: "relative",
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  coverBadgeRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 6,
  },
  comboCoverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  comboCoverBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },

  // Title Section
  titleSection: {
    marginBottom: 18,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 8,
  },
  eyebrowText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: BRAND_BLUE,
    letterSpacing: 0.6,
  },
  offerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: BRAND_BLUE_LIGHT,
    borderWidth: 1,
    borderColor: BRAND_BLUE_BORDER,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  offerBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  ratingBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#92400E",
  },
  packageName: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: SLATE_900,
    lineHeight: 28,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  packageCategory: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_500,
    marginTop: 4,
  },
  priceHero: {
    marginTop: 12,
  },
  priceCompound: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  pricePrefix: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_500,
  },
  priceHeroText: {
    fontSize: 21,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: BRAND_BLUE,
  },
  priceHeroUnit: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_500,
  },

  // Key Facts Strip (Spacious 2-column layout focused on Capacity & Inclusions)
  specsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 28,
    ...shadows.xs,
  },
  specColumn: {
    flex: 1,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  specHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  specLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_400,
    letterSpacing: 0.5,
  },
  specValue: {
    fontSize: 13.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_900,
  },
  specDivider: {
    width: 1,
    height: 32,
    backgroundColor: SLATE_200,
    marginHorizontal: 12,
  },

  // General Section Architecture
  sectionContainer: {
    marginBottom: 28,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: spacing.xs,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  sectionHeading: {
    fontSize: 16,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_900,
  },
  sectionCountPill: {
    backgroundColor: SLATE_100,
    borderWidth: 1,
    borderColor: SLATE_200,
    paddingHorizontal: 9,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  sectionCountPillText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_600,
  },
  sectionSubtitle: {
    fontSize: 12.5,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_500,
    marginBottom: 14,
    lineHeight: 18,
  },
  descriptionText: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_600,
    lineHeight: 22,
  },

  // Category & Inclusion Cards
  categoryCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    ...shadows.xs,
  },
  categoryCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: SLATE_100,
    paddingBottom: 10,
    marginBottom: 6,
  },
  categoryTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: SLATE_900,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: SLATE_100,
    borderWidth: 1,
    borderColor: SLATE_200,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_600,
  },
  itemsList: {
    gap: 0,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: BRAND_BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    flexShrink: 0,
  },
  itemNameText: {
    fontSize: 13.5,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_800,
    flex: 1,
    lineHeight: 20,
    marginRight: 8,
  },
  qtyPill: {
    backgroundColor: SLATE_100,
    borderWidth: 1,
    borderColor: SLATE_200,
    paddingHorizontal: 7.5,
    paddingVertical: 2.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  qtyPillText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_700,
  },

  // Available Space / Scaffold Options (Interactive Cards)
  scaffoldList: {
    gap: 10,
  },
  scaffoldOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: SLATE_200,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadows.xs,
  },
  scaffoldOptionCardSelected: {
    borderColor: BRAND_BLUE,
    backgroundColor: BRAND_BLUE_LIGHT,
    borderWidth: 1.5,
  },
  scaffoldLeftCol: {
    flex: 1,
    marginRight: 10,
  },
  scaffoldTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  scaffoldOptionTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_900,
  },
  scaffoldOptionTitleSelected: {
    color: BRAND_BLUE,
  },
  selectedPill: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 6.5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  selectedPillText: {
    fontSize: 9.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  scaffoldMetaText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_500,
    marginTop: 3,
  },
  scaffoldRightCol: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  scaffoldPriceText: {
    fontSize: 14.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_900,
  },
  scaffoldPriceTextSelected: {
    color: BRAND_BLUE,
  },

  // Add-Ons Chips
  addOnsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  addOnChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: SLATE_200,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: radius.pill,
    minHeight: 38,
    ...shadows.xs,
  },
  addOnIconBox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND_BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  addOnChipText: {
    fontSize: 12.5,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_800,
  },
  addOnPriceText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    color: BRAND_BLUE,
    marginLeft: 2,
  },

  // Customer Reviews
  trustSummaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SLATE_200,
    marginBottom: 14,
    gap: 16,
    ...shadows.xs,
  },
  trustScoreBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: SLATE_200,
  },
  trustScoreNumber: {
    fontSize: 28,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: SLATE_900,
  },
  trustScoreDenominator: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_500,
    marginLeft: 2,
  },
  trustStarsBlock: {
    flex: 1,
    gap: 4,
  },
  trustStarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  trustCountText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_500,
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SLATE_200,
    ...shadows.xs,
  },
  reviewCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  reviewStarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  reviewDateText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_400,
  },
  reviewQuoteText: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_700,
    lineHeight: 20,
    marginBottom: 10,
  },
  reviewAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: SLATE_100,
  },
  reviewAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: BRAND_BLUE_LIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewAvatarText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: BRAND_BLUE,
  },
  reviewIdentityCol: {
    flex: 1,
  },
  reviewAuthorName: {
    fontSize: 12.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_900,
  },
  reviewVerifiedBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    marginTop: 1,
    flexWrap: "wrap",
  },
  reviewVerifiedBadgeText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.medium,
    color: BRAND_BLUE,
  },
  reviewMetaDot: {
    fontSize: 9,
    color: SLATE_400,
  },
  reviewEventDetailsText: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_500,
    flexShrink: 1,
  },
  seeAllReviewsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  seeAllReviewsBtnText: {
    fontSize: 12.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: BRAND_BLUE,
  },

  // Simplified Compact Empty State
  emptyReviewsCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: SLATE_200,
    ...shadows.xs,
  },
  emptyReviewsIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SLATE_100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyReviewsTitle: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: SLATE_800,
    marginBottom: 4,
    textAlign: "center",
  },
  emptyReviewsDesc: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: SLATE_500,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 260,
  },

  // Gallery
  galleryScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  galleryThumb: {
    width: 110,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: SLATE_100,
    borderWidth: 1,
    borderColor: SLATE_200,
  },
  galleryThumbImage: {
    width: "100%",
    height: "100%",
  },

  // Bottom Action Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: SLATE_200,
    ...shadows.lg,
  },
  bottomPriceContainer: {
    flex: 1,
    marginRight: 14,
  },
  bottomPriceLabel: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.medium,
    color: SLATE_500,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  bottomPriceValue: {
    fontSize: 17,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: BRAND_BLUE,
  },
  inquireButton: {
    flex: 1.15,
    minHeight: 48,
    backgroundColor: BRAND_BLUE,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    ...shadows.sm,
  },
  inquireButtonText: {
    fontSize: 14.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Lightbox Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 15, 29, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      web: {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
      },
    }),
  },
  modalCloseBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: radius.pill,
  },
  modalImage: {
    width: "92%",
    height: "80%",
  },
});

export default PackageDetailScreen;
