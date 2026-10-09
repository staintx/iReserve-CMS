import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  Sparkles,
  Users,
  Utensils,
  Layers,
  Shield,
  Clock,
  Camera,
  X,
  Plus,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import { resolvePackageCover } from "../../constants/cateringData";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Card from "../../components/common/Card";
import { formatCurrency } from "../../utils/format";
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
} from "../../utils/packageDisplay";

export const PackageDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route?.params || {};

  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    if (!id) {
      setError("Package reference is missing.");
      setLoading(false);
      return;
    }

    const fetchPackage = async () => {
      try {
        const data = await customerApi.getPackageById(id);
        setPackageData(data);
      } catch (err) {
        setError("Unable to load package details.");
      } finally {
        setLoading(false);
      }
    };

    fetchPackage();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Package Details" onBack={() => navigation.goBack()} />
        <LoadingState message="Loading package details..." />
      </View>
    );
  }

  if (error || !packageData) {
    return (
      <View style={styles.container}>
        <Header title="Package Details" onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={() => navigation.goBack()} />
      </View>
    );
  }

  const isCombo = isSpecialOffer(packageData);
  const packageCover = resolvePackageCover(packageData);
  const packageGallery = Array.isArray(packageData.gallery)
    ? packageData.gallery.filter(Boolean)
    : [];

  const comboPerPax = isCombo ? offerPricePerPax(packageData) : 0;
  const comboGuests = isCombo ? offerGuestCount(packageData) : 0;
  const comboCourses = isCombo ? offerFoodByCategory(packageData) : [];
  const comboInclusionList = isCombo ? offerInclusions(packageData) : [];

  const regularInclusionGroups = !isCombo ? groupInclusions(packageData.inclusions) : [];
  const validScaffoldList = !isCombo ? scaffoldOptions(packageData) : [];
  const setupFrom = !isCombo ? setupFromPrice(packageData) : null;
  const guestCap = capacityLabel(packageData);
  const eventType = eventTypeForPackage(packageData);
  const serviceText = serviceLabel(packageData);

  const addOns =
    !isCombo && Array.isArray(packageData.add_ons)
      ? packageData.add_ons.filter((item) => item?.name || typeof item === "string")
      : [];

  return (
    <View style={styles.container}>
      <Header
        title={isCombo ? "Combo Pack Details" : "Package Details"}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.base) + 110 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Photo */}
        {packageCover ? (
          <TouchableOpacity
            style={styles.heroMediaCard}
            onPress={() => setLightboxImage(packageCover)}
            activeOpacity={0.9}
          >
            <Image
              source={{ uri: packageCover }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <View style={styles.coverBadgeRow}>
              {eventType ? (
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>{eventType}</Text>
                </View>
              ) : null}
              {isCombo ? (
                <View style={styles.comboCoverBadge}>
                  <Sparkles size={11} color={colors.white} />
                  <Text style={styles.comboCoverBadgeText}>Combo Pack</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        ) : null}

        {/* Title Header Section */}
        <View style={styles.titleSection}>
          <View style={styles.eyebrowRow}>
            {isCombo ? (
              <View style={styles.specialBadge}>
                <Sparkles size={11} color={colors.primaryDark} />
                <Text style={styles.specialBadgeText}>
                  {packageData.badge_text || "Special Offer Combo Pack"}
                </Text>
              </View>
            ) : (
              <Text style={styles.eyebrowText}>
                {[serviceText, eventType].filter(Boolean).join(" · ").toUpperCase()}
              </Text>
            )}
            {!isCombo && packageData.badge_text ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>{packageData.badge_text}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.packageName}>{packageData.name}</Text>

          <Text style={styles.packageCategory}>
            {isCombo
              ? "Curated Combo Meal · Food Only"
              : packageData.package_type || "Catering & Event Setup"}
          </Text>

          {/* Pricing Highlight */}
          <View style={styles.priceHero}>
            {isCombo ? (
              <>
                <Text style={styles.priceHeroText}>
                  {formatCurrency(comboPerPax)}
                </Text>
                <Text style={styles.priceHeroUnit}> per plate / pax</Text>
              </>
            ) : packageData.price_per_guest ? (
              <>
                <Text style={styles.priceHeroText}>
                  {formatCurrency(packageData.price_per_guest)}
                </Text>
                <Text style={styles.priceHeroUnit}> per guest</Text>
              </>
            ) : packageData.setup_price ? (
              <>
                <Text style={styles.priceHeroText}>
                  {formatCurrency(packageData.setup_price)}
                </Text>
                <Text style={styles.priceHeroUnit}> base setup package</Text>
              </>
            ) : setupFrom ? (
              <>
                <Text style={styles.priceHeroPrefix}>Setup from </Text>
                <Text style={styles.priceHeroText}>
                  {formatCurrency(setupFrom)}
                </Text>
              </>
            ) : (
              <Text style={styles.priceHeroText}>
                {packageData.package_type === "Food Only"
                  ? "Priced by menu selection"
                  : "Quoted per event"}
              </Text>
            )}
          </View>
        </View>

        {/* Quick Facts Grid */}
        <View style={styles.factsGrid}>
          {isCombo ? (
            <Card style={styles.factCard}>
              <Users size={18} color={colors.primary} />
              <Text style={styles.factValue}>{comboGuests} Guests</Text>
              <Text style={styles.factLabel}>Fixed Combo Pax</Text>
            </Card>
          ) : (
            <Card style={styles.factCard}>
              <Users size={18} color={colors.primary} />
              <Text style={styles.factValue} numberOfLines={1}>
                {guestCap || "Per Request"}
              </Text>
              <Text style={styles.factLabel}>Estimated Guests</Text>
            </Card>
          )}

          <Card style={styles.factCard}>
            <Clock size={18} color={colors.secondary} />
            <Text style={styles.factValue}>4 Hours</Text>
            <Text style={styles.factLabel}>Standard Service</Text>
          </Card>

          <Card style={styles.factCard}>
            <Shield size={18} color={colors.accentDark} />
            <Text style={styles.factValue}>Batangas</Text>
            <Text style={styles.factLabel}>Delivery Area</Text>
          </Card>
        </View>

        {/* Overview / Description */}
        {Boolean(packageData.description || packageData.fullDescription) && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.descriptionText}>
              {packageData.description || packageData.fullDescription}
            </Text>
            {packageData.fullDescription &&
            packageData.description &&
            packageData.fullDescription !== packageData.description ? (
              <Text style={[styles.descriptionText, { marginTop: spacing.sm }]}>
                {packageData.fullDescription}
              </Text>
            ) : null}
          </Card>
        )}

        {/* Key Features Highlights */}
        {Array.isArray(packageData.features) && packageData.features.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Package Highlights</Text>
            <View style={styles.featuresList}>
              {packageData.features.map((feat, fIdx) => (
                <View key={fIdx} style={styles.featureItem}>
                  <View style={styles.featureDot}>
                    <Check size={12} color={colors.primary} />
                  </View>
                  <Text style={styles.featureText}>{feat}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {/* COMBO PACK: What this combo serves */}
        {isCombo && comboCourses.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleRow}>
                <Utensils size={18} color={colors.primary} />
                <Text style={styles.sectionHeaderTitle}>What This Combo Serves</Text>
              </View>
              <Text style={styles.sectionHeaderBadge}>
                {comboCourses.length} {comboCourses.length === 1 ? "Course" : "Courses"}
              </Text>
            </View>
            <Text style={styles.sectionHeaderSubtitle}>
              Included dishes & choices organized by course category:
            </Text>

            {comboCourses.map((course, cIdx) => (
              <Card key={course.category || cIdx} style={styles.courseCard}>
                <View style={styles.groupCardHeader}>
                  <Text style={styles.groupCategoryName}>
                    {course.category || "Included Dishes"}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {course.items.length} {course.items.length === 1 ? "dish" : "dishes"}
                    </Text>
                  </View>
                </View>

                <View style={styles.itemsGrid}>
                  {course.items.map((dishName, dIdx) => (
                    <View key={dIdx} style={styles.dishItemRow}>
                      <View style={styles.dishCheckCircle}>
                        <Check size={11} color={colors.primary} />
                      </View>
                      <Text style={styles.dishNameText}>{dishName}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* COMBO PACK: What this combo includes */}
        {isCombo && comboInclusionList.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>What This Combo Includes</Text>
            <Text style={styles.sectionSubtitle}>
              Included service equipment and dining essentials:
            </Text>
            {comboInclusionList.map((inc, iIdx) => (
              <View key={iIdx} style={styles.inclusionItem}>
                <View style={styles.checkCircle}>
                  <Check size={12} color={colors.success} />
                </View>
                <Text style={styles.inclusionText}>{inc}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* REGULAR PACKAGE: Grouped Inclusions */}
        {!isCombo && regularInclusionGroups.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderTitleRow}>
                <Layers size={18} color={colors.primary} />
                <Text style={styles.sectionHeaderTitle}>Included In This Package</Text>
              </View>
              <Text style={styles.sectionHeaderBadge}>
                {packageData.inclusions?.length || 0} Total Items
              </Text>
            </View>
            <Text style={styles.sectionHeaderSubtitle}>
              Organized by setup furniture and dining service inventory:
            </Text>

            {regularInclusionGroups.map((group, gIdx) => (
              <Card key={group.category || gIdx} style={styles.inclusionGroupCard}>
                <View style={styles.groupCardHeader}>
                  <Text style={styles.groupCategoryName}>
                    {group.category || "General Inclusions"}
                  </Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {group.items.length} {group.items.length === 1 ? "item" : "items"}
                    </Text>
                  </View>
                </View>

                <View style={styles.inclusionGroupList}>
                  {group.items.map((item, itemIdx) => (
                    <View key={itemIdx} style={styles.inclusionItemRow}>
                      <View style={styles.checkCircleSmall}>
                        <Check size={11} color={colors.success} />
                      </View>
                      <Text style={styles.inclusionNameText}>{item.name}</Text>
                      {item.qty ? (
                        <View style={styles.qtyPill}>
                          <Text style={styles.qtyPillText}>{item.qty}</Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* REGULAR PACKAGE: Scaffold Footprints */}
        {!isCombo && validScaffoldList.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Available Space / Scaffold Footprints</Text>
            <Text style={styles.sectionSubtitle}>
              Selectable footprint dimensions for your event venue:
            </Text>
            {validScaffoldList.map((opt, sIdx) => {
              const dims =
                opt.width_ft && opt.length_ft
                  ? `${opt.width_ft} × ${opt.length_ft} ft`
                  : opt.label || "Standard Space";
              const area =
                opt.area_ft2 || (opt.width_ft && opt.length_ft ? opt.width_ft * opt.length_ft : null);
              const guestMax = opt.guest_max ? `Up to ${opt.guest_max} guests` : null;

              return (
                <View key={opt._id || sIdx} style={styles.scaffoldRow}>
                  <View style={styles.scaffoldInfo}>
                    <Text style={styles.scaffoldLabel}>{opt.label || dims}</Text>
                    <Text style={styles.scaffoldDetails}>
                      {[area ? `${area} sq ft` : null, guestMax].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <View style={styles.scaffoldPriceCol}>
                    <Text style={styles.scaffoldPrice}>
                      {opt.price
                        ? formatCurrency(opt.price)
                        : opt.free_setup
                        ? "Free with package"
                        : packageData.setup_price
                        ? formatCurrency(packageData.setup_price)
                        : "Included"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        )}

        {/* REGULAR PACKAGE: Optional Add-Ons */}
        {!isCombo && addOns.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Optional Add-Ons</Text>
            <Text style={styles.sectionSubtitle}>
              Selectable during the booking inquiry step (quoted on request):
            </Text>
            <View style={styles.addOnsGrid}>
              {addOns.map((item, aIdx) => {
                const name = typeof item === "string" ? item : item?.name;
                return (
                  <View key={aIdx} style={styles.addOnChip}>
                    <Plus size={11} color={colors.primary} />
                    <Text style={styles.addOnChipText}>{name}</Text>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Package Gallery Photos */}
        {packageGallery.length > 0 && (
          <Card style={styles.sectionCard}>
            <View style={styles.galleryHeaderRow}>
              <Camera size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Photos from this package ({packageGallery.length})</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Actual event setup and styling captures:
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
                >
                  <Image source={{ uri: imgUrl }} style={styles.galleryThumbImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar with Proper Safe Area Clearance */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>
            {isCombo
              ? "Combo Rate"
              : packageData.price_per_guest
              ? "Price per guest"
              : "Starting from"}
          </Text>
          <Text style={styles.bottomPriceValue} numberOfLines={1}>
            {isCombo
              ? `${formatCurrency(comboPerPax)}/pax`
              : packageData.price_per_guest
              ? `${formatCurrency(packageData.price_per_guest)}/pax`
              : packageData.setup_price
              ? formatCurrency(packageData.setup_price)
              : setupFrom
              ? `from ${formatCurrency(setupFrom)}`
              : "Quoted per event"}
          </Text>
        </View>

        <AppButton
          title="Select & Inquire"
          onPress={() =>
            navigation.navigate("InquiryWizard", {
              selectedPackage: packageData,
            })
          }
          style={styles.inquireBtn}
          size="md"
        />
      </View>

      {/* Lightbox Preview Modal */}
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
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={colors.white} />
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
    padding: spacing.base,
  },
  heroMediaCard: {
    width: "100%",
    height: 210,
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing.base,
    backgroundColor: colors.surfaceAlt,
    position: "relative",
    ...shadows.sm,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  coverBadgeRow: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
  },
  eventBadge: {
    backgroundColor: "rgba(10, 15, 29, 0.8)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  eventBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  comboCoverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  comboCoverBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  titleSection: {
    marginBottom: spacing.base,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  eyebrowText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.5,
  },
  specialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  specialBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primaryDark,
    marginLeft: 3,
  },
  featuredBadge: {
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  featuredBadgeText: {
    color: colors.warningDark,
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  packageName: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.foreground,
    lineHeight: 28,
    letterSpacing: -0.3,
    marginTop: 2,
  },
  packageCategory: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  priceHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.sm + 2,
  },
  priceHeroPrefix: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  priceHeroText: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.primary,
  },
  priceHeroUnit: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  factsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.base,
    gap: spacing.xs,
  },
  factCard: {
    flex: 1,
    padding: spacing.sm + 2,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    ...shadows.xs,
  },
  factValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 4,
    textAlign: "center",
  },
  factLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
    textAlign: "center",
  },
  sectionContainer: {
    marginBottom: spacing.base,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  sectionHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionHeaderTitle: {
    fontSize: typography.sizes.sm + 1,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  sectionHeaderBadge: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  sectionHeaderSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
    borderRadius: radius.lg,
    ...shadows.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm + 1,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 20,
  },
  featuresList: {
    gap: spacing.xs + 2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
    flex: 1,
  },
  courseCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    ...shadows.xs,
  },
  inclusionGroupCard: {
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    ...shadows.xs,
  },
  groupCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingBottom: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  groupCategoryName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  countBadge: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: radius.pill,
  },
  countBadgeText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
  },
  itemsGrid: {
    gap: spacing.xs + 2,
  },
  dishItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  dishCheckCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  dishNameText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
    flex: 1,
  },
  inclusionGroupList: {
    gap: spacing.xs,
  },
  inclusionItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
  },
  checkCircleSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  inclusionNameText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
    flex: 1,
  },
  qtyPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    marginLeft: spacing.xs,
  },
  qtyPillText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primaryDark,
  },
  inclusionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs + 2,
  },
  checkCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  inclusionText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
    flex: 1,
  },
  scaffoldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  scaffoldInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  scaffoldLabel: {
    fontSize: typography.sizes.xs + 1,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  scaffoldDetails: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  scaffoldPriceCol: {
    alignItems: "flex-end",
  },
  scaffoldPrice: {
    fontSize: typography.sizes.xs + 1,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  addOnsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  addOnChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  addOnChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
  },
  galleryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: 4,
  },
  galleryScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  galleryThumb: {
    width: 110,
    height: 80,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  galleryThumbImage: {
    width: "100%",
    height: "100%",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseBtn: {
    position: "absolute",
    right: spacing.lg,
    zIndex: 10,
    padding: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: radius.pill,
  },
  modalImage: {
    width: "92%",
    height: "80%",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
  },
  bottomPriceContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  bottomPriceLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  bottomPriceValue: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.primary,
  },
  inquireBtn: {
    flex: 1.2,
    minHeight: 44,
  },
});

export default PackageDetailScreen;
