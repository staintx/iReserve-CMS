import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Check,
  Sparkles,
  Users,
  Utensils,
  ChevronRight,
  Shield,
  Clock,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import Header from "../../components/common/Header";
import AppButton from "../../components/common/AppButton";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Card from "../../components/common/Card";
import { formatCurrency } from "../../utils/format";

export const PackageDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { id } = route.params;

  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

  const isCombo =
    packageData.is_combo ||
    packageData.package_type === "Special Offer" ||
    packageData.combo_guest_count;

  return (
    <View style={styles.container}>
      <Header title="Package Details" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={styles.titleSection}>
          {isCombo && (
            <View style={styles.specialBadge}>
              <Sparkles size={13} color={colors.accentDark} />
              <Text style={styles.specialBadgeText}>Special Offer Combo Pack</Text>
            </View>
          )}

          <Text style={styles.packageName}>{packageData.name}</Text>
          <Text style={styles.packageCategory}>{packageData.package_type || "Catering & Event Setup"}</Text>

          <View style={styles.priceHero}>
            <Text style={styles.priceHeroText}>
              {packageData.price_per_guest
                ? `${formatCurrency(packageData.price_per_guest)}`
                : formatCurrency(packageData.setup_price || packageData.price || 0)}
            </Text>
            <Text style={styles.priceHeroUnit}>
              {packageData.price_per_guest ? " per guest" : " base setup package"}
            </Text>
          </View>
        </View>

        {/* Description */}
        {Boolean(packageData.description) && (
          <Card style={styles.sectionCard} variant="flat">
            <Text style={styles.sectionTitle}>Overview</Text>
            <Text style={styles.descriptionText}>{packageData.description}</Text>
          </Card>
        )}

        {/* Quick Facts */}
        <View style={styles.factsRow}>
          {packageData.min_guests ? (
            <Card style={styles.factCard}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.factValue}>{packageData.min_guests} Guests</Text>
              <Text style={styles.factLabel}>Minimum Count</Text>
            </Card>
          ) : packageData.combo_guest_count ? (
            <Card style={styles.factCard}>
              <Users size={20} color={colors.primary} />
              <Text style={styles.factValue}>{packageData.combo_guest_count} Guests</Text>
              <Text style={styles.factLabel}>Fixed Combo Capacity</Text>
            </Card>
          ) : null}

          <Card style={styles.factCard}>
            <Clock size={20} color={colors.secondary} />
            <Text style={styles.factValue}>4 Hours</Text>
            <Text style={styles.factLabel}>Standard Service</Text>
          </Card>

          <Card style={styles.factCard}>
            <Shield size={20} color={colors.accentDark} />
            <Text style={styles.factValue}>Batangas</Text>
            <Text style={styles.factLabel}>Delivery Area</Text>
          </Card>
        </View>

        {/* Inclusions */}
        {Array.isArray(packageData.inclusions) && packageData.inclusions.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Included In This Package</Text>
            {packageData.inclusions.map((inclusion, index) => (
              <View key={index} style={styles.inclusionItem}>
                <View style={styles.checkCircle}>
                  <Check size={14} color={colors.success} />
                </View>
                <Text style={styles.inclusionText}>{inclusion}</Text>
              </View>
            ))}
          </Card>
        )}

        {/* Scaffold Sizes (if applicable) */}
        {Array.isArray(packageData.scaffold_size_options) && packageData.scaffold_size_options.length > 0 && (
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Available Space / Scaffold Footprints</Text>
            <Text style={styles.sectionSubtitle}>
              Selectable during the booking inquiry step:
            </Text>
            {packageData.scaffold_size_options.map((opt, index) => (
              <View key={index} style={styles.scaffoldRow}>
                <Text style={styles.scaffoldLabel}>
                  {opt.width}ft × {opt.length}ft
                </Text>
                <Text style={styles.scaffoldPrice}>
                  {formatCurrency(opt.price)}
                </Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Sticky Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.sm }]}>
        <View style={styles.bottomPriceContainer}>
          <Text style={styles.bottomPriceLabel}>Starting from</Text>
          <Text style={styles.bottomPriceValue}>
            {packageData.price_per_guest
              ? `${formatCurrency(packageData.price_per_guest)}/pax`
              : formatCurrency(packageData.setup_price || packageData.price || 0)}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  titleSection: {
    marginBottom: spacing.base,
  },
  specialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: spacing.xs,
  },
  specialBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.accentDark,
    marginLeft: 4,
  },
  packageName: {
    fontSize: typography.sizes.title,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: -0.4,
  },
  packageCategory: {
    fontSize: typography.sizes.sm,
    color: colors.secondary,
    fontWeight: "600",
    marginTop: 2,
  },
  priceHero: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: spacing.md,
  },
  priceHeroText: {
    fontSize: typography.sizes.title,
    fontWeight: "900",
    color: colors.primary,
  },
  priceHeroUnit: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    fontWeight: "600",
  },
  sectionCard: {
    padding: spacing.lg,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginBottom: spacing.md,
  },
  descriptionText: {
    fontSize: typography.sizes.sm,
    color: colors.foregroundMuted,
    lineHeight: 22,
  },
  factsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  factCard: {
    flex: 1,
    padding: spacing.md,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  factValue: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: 6,
    textAlign: "center",
  },
  factLabel: {
    fontSize: 10,
    color: colors.foregroundMuted,
    marginTop: 2,
    textAlign: "center",
  },
  inclusionItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm + 2,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm + 2,
  },
  inclusionText: {
    fontSize: typography.sizes.sm,
    color: colors.foreground,
    flex: 1,
    lineHeight: 20,
  },
  scaffoldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  scaffoldLabel: {
    fontSize: typography.sizes.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  scaffoldPrice: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.primary,
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomPriceContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: colors.foregroundMuted,
  },
  bottomPriceValue: {
    fontSize: typography.sizes.md,
    fontWeight: "800",
    color: colors.primary,
  },
  inquireBtn: {
    flex: 1.2,
  },
});

export default PackageDetailScreen;
