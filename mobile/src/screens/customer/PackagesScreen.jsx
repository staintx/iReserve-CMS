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
import { Sparkles, Utensils, Users, ChevronRight, Layers } from "lucide-react-native";
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
  packagePriceParts,
  capacityLabel,
} from "../../utils/packageDisplay";

export const PackagesScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // all | regular | combo

  const loadPackages = async () => {
    setError("");
    try {
      const data = await customerApi.getPackages();
      const list = Array.isArray(data) ? data : [];
      setPackages(list);
      if (list.length > 0) {
        cacheData(CACHE_KEYS.PACKAGES, list);
      }
    } catch (err) {
      const cached = await getCachedData(CACHE_KEYS.PACKAGES);
      if (Array.isArray(cached) && cached.length > 0) {
        setPackages(cached);
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
    const priceInfo = packagePriceParts(item);
    const paxCount = offerGuestCount(item);
    const guestCapacity = capacityLabel(item);

    return (
      <Card
        style={styles.packageCard}
        onPress={() => navigation.navigate("PackageDetail", { id: item._id })}
      >
        {coverUrl ? (
          <View style={styles.cardCoverContainer}>
            <Image source={{ uri: coverUrl }} style={styles.cardCoverImage} resizeMode="cover" />
            <View style={styles.coverBadgeRow}>
              {item.event_type ? (
                <View style={styles.eventBadge}>
                  <Text style={styles.eventBadgeText}>{item.event_type}</Text>
                </View>
              ) : null}
              {isCombo ? (
                <View style={styles.comboCoverBadge}>
                  <Sparkles size={11} color={colors.white} />
                  <Text style={styles.comboCoverBadgeText}>Combo Pack</Text>
                </View>
              ) : item.badge_text ? (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>{item.badge_text}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={styles.cardBody}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              {isCombo && !coverUrl && (
                <View style={styles.specialBadge}>
                  <Sparkles size={12} color={colors.accentDark} />
                  <Text style={styles.specialBadgeText}>
                    {item.badge_text || "Combo Pack"}
                  </Text>
                </View>
              )}
              <Text style={styles.packageName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.packageCategory}>
                {isCombo
                  ? "Curated Combo Meal · Food Only"
                  : item.package_type || "Event Setup & Catering"}
              </Text>
            </View>

            <View style={styles.priceContainer}>
              {isCombo ? (
                <>
                  <Text style={styles.price}>
                    {formatCurrency(offerPricePerPax(item))}
                  </Text>
                  <Text style={styles.priceUnit}>per pax</Text>
                </>
              ) : priceInfo.amount ? (
                <>
                  <Text style={styles.price}>{priceInfo.amount}</Text>
                  <Text style={styles.priceUnit}>
                    {priceInfo.suffix || (priceInfo.prefix ? priceInfo.prefix.toLowerCase() : "base rate")}
                  </Text>
                </>
              ) : (
                <Text style={styles.priceQuoted}>{priceInfo.text}</Text>
              )}
            </View>
          </View>

          <Text style={styles.description} numberOfLines={2}>
            {item.description ||
              "Complete catering solution with tables, chairs, centerpieces, and customizable menu choices."}
          </Text>

          <View style={styles.inclusionsRow}>
            {isCombo ? (
              <>
                {paxCount > 0 && (
                  <View style={styles.tag}>
                    <Users size={12} color={colors.primary} />
                    <Text style={styles.tagText}>{paxCount} pax fixed</Text>
                  </View>
                )}
                {Array.isArray(item.offer_food_items) && item.offer_food_items.length > 0 && (
                  <View style={styles.tag}>
                    <Utensils size={12} color={colors.primary} />
                    <Text style={styles.tagText}>
                      {item.offer_food_items.length} Course Items
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <>
                {guestCapacity ? (
                  <View style={styles.tag}>
                    <Users size={12} color={colors.primary} />
                    <Text style={styles.tagText}>{guestCapacity}</Text>
                  </View>
                ) : null}

                {Array.isArray(item.inclusions) && item.inclusions.length > 0 && (
                  <View style={styles.tag}>
                    <Layers size={12} color={colors.primary} />
                    <Text style={styles.tagText}>{item.inclusions.length} Inclusions</Text>
                  </View>
                )}
              </>
            )}

            <View style={styles.actionChevron}>
              <ChevronRight size={16} color={colors.primary} />
            </View>
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
    padding: spacing.base,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.sm,
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
    marginBottom: 6,
  },
  specialBadgeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
    marginLeft: 3,
  },
  packageName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    lineHeight: 20,
  },
  packageCategory: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginTop: 3,
  },
  priceContainer: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  price: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.extraBold,
    fontWeight: "800",
    color: colors.primary,
  },
  priceQuoted: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
    textAlign: "right",
  },
  priceUnit: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 1,
  },
  description: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 18,
    marginVertical: spacing.xs,
  },
  inclusionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    marginRight: spacing.xs,
  },
  tagText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
    fontWeight: "700",
    marginLeft: 4,
  },
  actionChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "auto",
  },
});

export default PackagesScreen;
