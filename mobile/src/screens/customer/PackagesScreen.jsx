import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, Utensils, Users, ChevronRight, Layers, Star, CheckCircle2 } from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import customerApi from "../../api/customer";
import { resolvePackageCover } from "../../constants/cateringData";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import Card from "../../components/common/Card";
import Header from "../../components/common/Header";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatCurrency } from "../../utils/format";
import {
  isSpecialOffer,
  offerPricePerPax,
  offerGuestCount,
  offerInclusions,
  packagePriceParts,
  capacityLabel,
  eventTypeForPackage,
  serviceLabel,
  inclusionDisplayName,
  getPackageRatingStats,
} from "../../utils/packageDisplay";

export const PackagesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // all | regular | combo

  const loadPackages = async () => {
    setError("");
    try {
      const [data, ratingsData] = await Promise.all([
        customerApi.getPackages(),
        customerApi.getRatings().catch(() => []),
      ]);
      const list = Array.isArray(data) ? data : [];
      setPackages(list);
      if (list.length > 0) {
        cacheData(CACHE_KEYS.PACKAGES, list);
      }
      if (Array.isArray(ratingsData)) {
        setRatings(ratingsData);
        cacheData(CACHE_KEYS.RATINGS, ratingsData);
      }
    } catch (err) {
      const cached = await getCachedData(CACHE_KEYS.PACKAGES);
      const cachedRatings = await getCachedData(CACHE_KEYS.RATINGS);
      if (Array.isArray(cached) && cached.length > 0) {
        setPackages(cached);
        if (Array.isArray(cachedRatings)) setRatings(cachedRatings);
      } else {
        setError("Unable to load packages. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadPackages();
  };

  const regularCount = useMemo(
    () => packages.filter((pkg) => !isSpecialOffer(pkg)).length,
    [packages]
  );

  const comboCount = useMemo(
    () => packages.filter((pkg) => isSpecialOffer(pkg)).length,
    [packages]
  );

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const isCombo = isSpecialOffer(pkg);
      if (selectedFilter === "combo" || selectedFilter === "special") return isCombo;
      if (selectedFilter === "regular") return !isCombo;
      return true;
    });
  }, [packages, selectedFilter]);

  const renderPackageItem = ({ item }) => {
    const isCombo = isSpecialOffer(item);
    const coverUrl = resolvePackageCover(item);
    const priceParts = packagePriceParts(item);
    const ratingStats = getPackageRatingStats(item, ratings);

    const priceLabel = isCombo
      ? (offerPricePerPax(item) > 0 ? `${formatCurrency(offerPricePerPax(item))} / pax` : "Custom Quote")
      : (priceParts.amount
          ? `${priceParts.prefix ? priceParts.prefix + " " : ""}${priceParts.amount}${priceParts.suffix ? " " + priceParts.suffix : ""}`.trim()
          : (priceParts.text || "Quoted per event"));

    const guestLabel = isCombo
      ? `Fixed ${offerGuestCount(item) || item.guest_count || 10} Pax`
      : capacityLabel(item) || (item.guest_max ? `Up to ${item.guest_max} Pax` : "Flexible Pax");

    const categoryTag = isCombo
      ? "Combo Pack"
      : eventTypeForPackage(item) || item.event_type || serviceLabel(item) || "Package";

    const displayInclusions = isCombo
      ? (offerInclusions(item).length > 0
          ? offerInclusions(item).slice(0, 3)
          : ["Fixed Multi-Course Meal", "Buffet Setup", "Serving Utensils"])
      : (Array.isArray(item.inclusions) && item.inclusions.length > 0
          ? item.inclusions.slice(0, 3).map((inc) => inclusionDisplayName(inc))
          : ["Full Table Setup", "Uniformed Waitstaff", "Chafing Dishes"]);

    return (
      <Card
        style={styles.packageCard}
        onPress={() => navigation.navigate("PackageDetail", { id: item._id })}
      >
        {coverUrl ? (
          <View style={styles.cardCoverContainer}>
            <Image source={{ uri: coverUrl }} style={styles.cardCoverImage} resizeMode="cover" />
            <View style={styles.coverBadgeRow}>
              {isCombo ? (
                <View style={styles.comboCoverBadge}>
                  <Sparkles size={11} color={colors.white} />
                  <Text style={styles.comboCoverBadgeText}>Combo Pack</Text>
                </View>
              ) : (
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>{categoryTag}</Text>
                </View>
              )}
              {!isCombo && item.badge_text ? (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>{item.badge_text}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.cardBody}>
          <View style={styles.packageTitleRow}>
            <Text style={styles.packageName} numberOfLines={1}>
              {item.name}
            </Text>
            {ratingStats && (
              <View style={styles.packageTitleRatingBadge}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.packageTitleRatingText}>
                  {ratingStats.averageRating.toFixed(1)} ({ratingStats.reviewCount})
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.packageDesc} numberOfLines={2}>
            {item.description ||
              (isCombo
                ? "Curated multi-course celebration meal prepared fresh and delivered hot."
                : "Includes multi-course buffet dining, professional uniformed waitstaff, full banquet tables and floral styling.")}
          </Text>

          {/* Badges & Meta Row */}
          <View style={styles.packageMetaRow}>
            <View style={styles.metaChip}>
              <Users size={12} color={colors.primary} />
              <Text style={styles.metaChipText}>{guestLabel}</Text>
            </View>

            <View style={styles.metaChipPrice}>
              <Text style={styles.metaPriceText}>{priceLabel}</Text>
            </View>
          </View>

          {/* Inclusions Vertical Strip (Matches Reference) */}
          <View style={styles.inclusionsList}>
            {displayInclusions.map((inc, iIdx) => (
              <View key={iIdx} style={styles.inclusionItem}>
                <CheckCircle2 size={13} color={colors.success} />
                <Text style={styles.inclusionText} numberOfLines={1}>
                  {inc}
                </Text>
              </View>
            ))}
          </View>

          {/* Full-width Pill View CTA */}
          <View style={styles.packageActionBtn}>
            <Text style={styles.packageActionText}>
              {isCombo ? "View Combo Details & Gallery" : "View Package Details & Gallery"}
            </Text>
            <ChevronRight size={15} color={colors.white} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header
        title="Catering Packages"
        subtitle="All curated event packages & inclusions"
        showBack={navigation?.canGoBack ? navigation.canGoBack() : true}
        onBack={() => navigation.goBack()}
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === "all" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("all")}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, selectedFilter === "all" && styles.filterTextActive]}>
            All ({packages.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === "regular" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("regular")}
          activeOpacity={0.7}
        >
          <Text style={[styles.filterText, selectedFilter === "regular" && styles.filterTextActive]}>
            Regular Packages ({regularCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            (selectedFilter === "combo" || selectedFilter === "special") && styles.filterChipActive,
          ]}
          onPress={() => setSelectedFilter("combo")}
          activeOpacity={0.7}
        >
          <Sparkles
            size={13}
            color={
              selectedFilter === "combo" || selectedFilter === "special"
                ? colors.white
                : colors.accentDark
            }
            style={{ marginRight: 5 }}
          />
          <Text
            style={[
              styles.filterText,
              (selectedFilter === "combo" || selectedFilter === "special") && styles.filterTextActive,
            ]}
          >
            Combo Packs ({comboCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState message="Loading catering packages..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPackages} />
      ) : filteredPackages.length === 0 ? (
        <EmptyState
          title={
            selectedFilter === "combo"
              ? "No combo packs found"
              : selectedFilter === "regular"
              ? "No regular packages found"
              : "No packages found"
          }
          description="No packages match your current filter."
        />
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={renderPackageItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, spacing.base) + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.2,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.base,
  },
  packageCard: {
    padding: 0,
    overflow: "hidden",
    marginBottom: spacing.base,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  cardCoverContainer: {
    width: "100%",
    height: 160,
    backgroundColor: colors.surfaceAlt,
    position: "relative",
  },
  cardCoverImage: {
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
  featuredBadge: {
    backgroundColor: "rgba(217, 119, 6, 0.9)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  featuredBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  cardBody: {
    padding: spacing.md,
  },
  packageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    gap: spacing.xs,
  },
  packageName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
  },
  packageTitleRatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  packageTitleRatingText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  packageDesc: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
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
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5.5,
    borderRadius: radius.pill,
  },
  metaChipText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
  },
  metaChipPrice: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5.5,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  metaPriceText: {
    fontSize: 12.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  inclusionsList: {
    gap: 7,
    marginVertical: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
  },
  inclusionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  inclusionText: {
    fontSize: 11.5,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
    flex: 1,
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
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.white,
  },
});

export default PackagesScreen;
