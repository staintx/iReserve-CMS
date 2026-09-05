import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Sparkles, Utensils, Users, ChevronRight } from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import Card from "../../components/common/Card";
import Header from "../../components/common/Header";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatCurrency } from "../../utils/format";

export const PackagesScreen = ({ navigation }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all"); // all | regular | special

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

  const filteredPackages = packages.filter((pkg) => {
    const isCombo = pkg.is_combo || pkg.package_type === "Special Offer" || pkg.combo_guest_count;
    if (selectedFilter === "special") return isCombo;
    if (selectedFilter === "regular") return !isCombo;
    return true;
  });

  const renderPackageItem = ({ item }) => {
    const isCombo = item.is_combo || item.package_type === "Special Offer" || item.combo_guest_count;

    return (
      <Card
        style={styles.packageCard}
        onPress={() => navigation.navigate("PackageDetail", { id: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            {isCombo && (
              <View style={styles.specialBadge}>
                <Sparkles size={12} color={colors.accentDark} />
                <Text style={styles.specialBadgeText}>Special Offer</Text>
              </View>
            )}
            <Text style={styles.packageName}>{item.name}</Text>
            <Text style={styles.packageCategory}>{item.package_type || "Event Setup & Catering"}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>
              {item.price_per_guest
                ? formatCurrency(item.price_per_guest)
                : formatCurrency(item.setup_price || item.price || 0)}
            </Text>
            <Text style={styles.priceUnit}>{item.price_per_guest ? "per guest" : "base rate"}</Text>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {item.description || "Complete catering solution with tables, chairs, centerpieces, and customizable menu choices."}
        </Text>

        <View style={styles.inclusionsRow}>
          {item.min_guests ? (
            <View style={styles.tag}>
              <Users size={12} color={colors.foregroundMuted} />
              <Text style={styles.tagText}>Min: {item.min_guests} pax</Text>
            </View>
          ) : item.combo_guest_count ? (
            <View style={styles.tag}>
              <Users size={12} color={colors.foregroundMuted} />
              <Text style={styles.tagText}>{item.combo_guest_count} pax fixed</Text>
            </View>
          ) : null}

          {Array.isArray(item.inclusions) && item.inclusions.length > 0 && (
            <View style={styles.tag}>
              <Utensils size={12} color={colors.foregroundMuted} />
              <Text style={styles.tagText}>{item.inclusions.length} Inclusions</Text>
            </View>
          )}

          <View style={styles.learnMore}>
            <Text style={styles.learnMoreText}>View Details</Text>
            <ChevronRight size={14} color={colors.primary} />
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Catering Packages" showBack={false} />

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
            Regular Packages
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === "special" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("special")}
          activeOpacity={0.7}
        >
          <Sparkles size={13} color={selectedFilter === "special" ? colors.white : colors.accentDark} style={{ marginRight: 4 }} />
          <Text style={[styles.filterText, selectedFilter === "special" && styles.filterTextActive]}>
            Special Offers
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState message="Loading catering packages..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadPackages} />
      ) : filteredPackages.length === 0 ? (
        <EmptyState title="No packages found" description="No packages match your current filter." />
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={renderPackageItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
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
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.xl,
  },
  packageCard: {
    padding: spacing.base,
    marginBottom: spacing.base,
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
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  specialBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.accentDark,
    marginLeft: 3,
  },
  packageName: {
    fontSize: typography.sizes.base,
    fontWeight: "700",
    color: colors.foreground,
  },
  packageCategory: {
    fontSize: typography.sizes.xs,
    color: colors.secondary,
    fontWeight: "600",
    marginTop: 2,
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.primary,
  },
  priceUnit: {
    fontSize: 10,
    color: colors.foregroundMuted,
  },
  description: {
    fontSize: typography.sizes.xs,
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
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  tagText: {
    fontSize: 11,
    color: colors.foregroundMuted,
    fontWeight: "600",
    marginLeft: 4,
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
  },
  learnMoreText: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "700",
    marginRight: 2,
  },
});

export default PackagesScreen;
