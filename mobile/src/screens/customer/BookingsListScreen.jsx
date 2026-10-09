import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Search,
  X,
  Plus,
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import useRealTimeRefresh from "../../utils/useRealTimeRefresh";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import PillFilter from "../../components/common/PillFilter";
import AlertBanner from "../../components/common/AlertBanner";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import { formatDate, formatTime, formatCurrency } from "../../utils/format";

const SERVICE_OPTIONS = [
  "All services",
  "Food Only",
  "Event Setup Only",
  "Food and Event Setup",
];

export const BookingsListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState("All services");

  const loadBookings = useCallback(async () => {
    setError("");
    try {
      const data = await customerApi.getBookings();
      const list = Array.isArray(data) ? data : [];
      setBookings(list);
      if (list.length > 0) {
        cacheData(CACHE_KEYS.BOOKINGS, list);
      }
    } catch (err) {
      const cached = await getCachedData(CACHE_KEYS.BOOKINGS);
      if (Array.isArray(cached) && cached.length > 0) {
        setBookings(cached);
      } else {
        setError("Unable to load your bookings. Please check your connection.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useRealTimeRefresh(loadBookings);

  useFocusEffect(
    useCallback(() => {
      loadBookings();
    }, [loadBookings])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  // Calculate balance due across bookings
  const { totalBalanceDue, dueBooking } = useMemo(() => {
    let sum = 0;
    let firstDue = null;

    bookings.forEach((b) => {
      const total = Number(b.total_price || b.total_amount || 0);
      const paid = Number(b.deposit_paid || b.amount_paid || 0);
      const remaining = total - paid;
      if (
        remaining > 0 &&
        !["Completed", "completed", "Cancelled", "cancelled"].includes(b.status)
      ) {
        sum += remaining;
        if (!firstDue) firstDue = b;
      }
    });

    return { totalBalanceDue: sum, dueBooking: firstDue };
  }, [bookings]);

  // Compute status counts for filter tabs matching Screenshots 4 & 5
  const filterCounts = useMemo(() => {
    const counts = {
      all: bookings.length,
      needs_payment: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    bookings.forEach((b) => {
      const st = String(b.status || "").toLowerCase();
      const total = Number(b.total_price || b.total_amount || 0);
      const paid = Number(b.deposit_paid || b.amount_paid || 0);
      const hasDue =
        total - paid > 0 && !["completed", "cancelled"].includes(st);

      if (hasDue) counts.needs_payment += 1;
      if (st.includes("confirm") || st.includes("reserve") || st.includes("ready")) counts.confirmed += 1;
      if (st.includes("complete")) counts.completed += 1;
      if (st.includes("cancel") || st.includes("refund")) counts.cancelled += 1;
    });

    return counts;
  }, [bookings]);

  const filterTabs = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "needs_payment", label: "Needs payment", count: filterCounts.needs_payment },
    { key: "confirmed", label: "Confirmed", count: filterCounts.confirmed },
    { key: "completed", label: "Completed", count: filterCounts.completed },
    { key: "cancelled", label: "Cancelled", count: filterCounts.cancelled },
  ];

  // Filtered bookings based on tab, service, and search
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const st = String(b.status || "").toLowerCase();
      const total = Number(b.total_price || b.total_amount || 0);
      const paid = Number(b.deposit_paid || b.amount_paid || 0);
      const hasDue = total - paid > 0 && !["completed", "cancelled"].includes(st);

      // Status filter
      if (statusFilter === "needs_payment") {
        if (!hasDue) return false;
      } else if (statusFilter === "confirmed") {
        if (!st.includes("confirm") && !st.includes("reserve") && !st.includes("ready")) return false;
      } else if (statusFilter === "completed") {
        if (!st.includes("complete")) return false;
      } else if (statusFilter === "cancelled") {
        if (!st.includes("cancel") && !st.includes("refund")) return false;
      }

      // Service filter
      if (selectedService !== "All services") {
        const itemService = String(b.service_type || "").toLowerCase();
        if (!itemService.includes(selectedService.toLowerCase())) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const ref = String(b.reference || "").toLowerCase();
        const title = String(b.event_name || b.event_type || "").toLowerCase();
        const venue = String(b.municipality || b.venue_address || "").toLowerCase();
        if (!ref.includes(query) && !title.includes(query) && !venue.includes(query)) {
          return false;
        }
      }

      return true;
    });
  }, [bookings, statusFilter, selectedService, searchQuery]);

  const renderBookingItem = ({ item }) => {
    const total = Number(item.total_price || item.total_amount || 0);
    const statusLower = String(item.status || "").toLowerCase();
    const paymentStatusLower = String(item.payment_status || "").toLowerCase();

    const isCompleted = statusLower.includes("complete");
    const isCancelled = statusLower.includes("cancel") || statusLower.includes("refund");
    const isFullyPaid =
      paymentStatusLower === "fully_paid" ||
      (total > 0 && Number(item.deposit_paid || item.amount_paid || 0) >= total);

    const paid = (isFullyPaid || isCompleted)
      ? total
      : Number(item.deposit_paid || item.amount_paid || 0);

    const balanceDue = (isCompleted || isCancelled || isFullyPaid)
      ? 0
      : Math.max(0, total - paid);

    const hasBalanceDue = balanceDue > 0;
    const isPaidInFull = !hasBalanceDue && total > 0 && !isCancelled;

    const eventTitle =
      item.event_name ||
      `${item.customer_name || "Special Offer"}'s ${item.event_type || "Catering"}`;

    return (
      <Card
        style={styles.bookingCard}
        onPress={() => navigation.navigate("BookingDetail", { id: item._id })}
      >
        {/* Top Reference & Status Row */}
        <View style={styles.cardTopRow}>
          <View style={styles.refRow}>
            <Calendar size={13} color={colors.foregroundMuted} style={styles.metaIcon} />
            <Text style={styles.bookingRef} numberOfLines={1}>
              {item.reference || `BK-${String(item._id).slice(-6).toUpperCase()}`}
            </Text>
            {item.version ? (
              <Text style={styles.versionTag}>• v{item.version}</Text>
            ) : null}
          </View>

          <StatusBadge status={item.status || "Confirmed & Reserved"} size="sm" />
        </View>

        {/* Event Title Row */}
        <View style={styles.titleRow}>
          <UtensilsCrossed size={16} color={colors.primary} style={styles.eventIcon} />
          <Text style={styles.eventTitle} numberOfLines={2}>
            {eventTitle}
          </Text>
        </View>

        {/* Event Meta Details */}
        <View style={styles.eventMetaContainer}>
          <View style={styles.metaItem}>
            <Clock size={13} color={colors.textSubtle} style={styles.metaIcon} />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {formatDate(item.event_date)} • {formatTime(item.start_time)}
            </Text>
          </View>

          <View style={styles.metaItem}>
            <Sparkles size={13} color={colors.textSubtle} style={styles.metaIcon} />
            <Text style={styles.eventMetaText} numberOfLines={1}>
              {item.service_type || "Food and Event Setup"}
            </Text>
          </View>

          {(item.municipality || item.venue_address) ? (
            <View style={styles.metaItem}>
              <MapPin size={13} color={colors.textSubtle} style={styles.metaIcon} />
              <Text style={styles.eventMetaText} numberOfLines={1}>
                {item.municipality || item.venue_address}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Financial Information Box */}
        <View style={styles.financialContainer}>
          <View style={styles.financialLeft}>
            <Text style={styles.finLabel}>TOTAL BOOKING</Text>
            <Text style={styles.finTotalAmount}>{formatCurrency(total)}</Text>
            {paid > 0 && hasBalanceDue && (
              <Text style={styles.finPaidSubtext}>
                {formatCurrency(paid)} paid so far
              </Text>
            )}
          </View>

          <View style={styles.financialRight}>
            {hasBalanceDue ? (
              <>
                <Text style={styles.amountDueLabel}>AMOUNT DUE</Text>
                <Text style={styles.amountDueValue}>{formatCurrency(balanceDue)}</Text>
              </>
            ) : isPaidInFull || isCompleted ? (
              <View style={styles.paidInFullBadge}>
                <CheckCircle2 size={13} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.paidInFullText}>
                  {isCompleted ? "COMPLETED" : "PAID IN FULL"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Status Callout Banner */}
        {isCompleted ? (
          <View style={styles.completedCallout}>
            <CheckCircle2 size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.completedCalloutText}>
              Event successfully completed. Thank you for celebrating with us!
            </Text>
          </View>
        ) : isPaidInFull ? (
          <View style={styles.readyCallout}>
            <CheckCircle2 size={15} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={styles.readyCalloutText}>
              You're all set. Everything is prepared and ready for your event.
            </Text>
          </View>
        ) : hasBalanceDue ? (
          <View style={styles.balanceCallout}>
            <AlertCircle size={15} color={colors.warning} style={{ marginRight: 6 }} />
            <Text style={styles.balanceCalloutText}>
              Your date is reserved. The remaining balance is due before your event setup.
            </Text>
          </View>
        ) : null}

        {/* Action Row */}
        <View style={styles.cardActionFooter}>
          <TouchableOpacity
            style={styles.detailsBtn}
            onPress={() => navigation.navigate("BookingDetail", { id: item._id })}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
            <ChevronRight size={14} color={colors.primary} />
          </TouchableOpacity>

          {hasBalanceDue && (
            <TouchableOpacity
              style={styles.payBalanceBtn}
              onPress={() =>
                navigation.navigate("PaymentCheckout", {
                  bookingId: item._id,
                  amount: balanceDue,
                })
              }
              activeOpacity={0.85}
            >
              <CreditCard size={15} color={colors.white} style={{ marginRight: 6 }} />
              <Text style={styles.payBalanceBtnText}>Pay Remaining Balance</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    );
  };

  const headerPaddingTop =
    Math.max(insets.top, Platform.OS === "ios" ? 44 : 24) +
    (Platform.OS === "ios" ? 6 : 10);

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.screenTitle}>My Bookings</Text>
            {bookings.length > 0 && (
              <View style={styles.headerCountBadge}>
                <Text style={styles.headerCountBadgeText}>{bookings.length}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.bookEventBtn}
            onPress={() => navigation.navigate("InquiryWizard")}
            activeOpacity={0.8}
          >
            <Plus size={15} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.bookEventBtnText}>Book an event</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.screenSubtitle}>
          Track your reserved events, payments, and what to do next.
        </Text>
      </View>

      {/* Payment Reminder Amber Banner */}
      {totalBalanceDue > 0 && (
        <View style={styles.bannerWrapper}>
          <AlertBanner
            message={`Payment needed. One booking has ${formatCurrency(
              totalBalanceDue
            )} still to pay.`}
            actionLabel="Show them"
            onPress={() => setStatusFilter("needs_payment")}
          />
        </View>
      )}

      {/* Status Filter Tabs */}
      <PillFilter
        items={filterTabs}
        selectedKey={statusFilter}
        onSelect={setStatusFilter}
        style={styles.filterTabsWrapper}
      />

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.foregroundMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by event or reference"
            placeholderTextColor={colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={styles.clearSearchBtn}>
              <X size={16} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Service Type Sub-Filter */}
      <View style={styles.serviceFilterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SERVICE_OPTIONS}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.serviceFilterContent}
          renderItem={({ item }) => {
            const isSelected = selectedService === item;
            return (
              <TouchableOpacity
                onPress={() => setSelectedService(item)}
                style={[styles.serviceChip, isSelected && styles.serviceChipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.serviceChipText,
                    isSelected && styles.serviceChipTextActive,
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <LoadingState message="Loading your bookings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadBookings} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={searchQuery ? "No matching bookings" : "No bookings found"}
          description={
            searchQuery
              ? "Try adjusting your search criteria."
              : "When your quotation is accepted and initial deposit is confirmed, it will appear here."
          }
          actionLabel="Browse Packages"
          onAction={() => navigation.navigate("Packages")}
        />
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 120 },
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
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 4,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.xs,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  headerCountBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexShrink: 0,
  },
  headerCountBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  bookEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    minHeight: 38,
    borderRadius: radius.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    flexShrink: 0,
  },
  bookEventBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
  screenSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  bannerWrapper: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  filterTabsWrapper: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  /* Search */
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 4,
  },
  /* Service Filter Row */
  serviceFilterRow: {
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  serviceFilterContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  serviceChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  serviceChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  serviceChipText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  serviceChipTextActive: {
    color: colors.white,
    fontFamily: typography.fontFamilies.bold,
  },
  /* List Content */
  listContent: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  bookingCard: {
    padding: spacing.base + 2,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  metaIcon: {
    marginRight: 4,
  },
  bookingRef: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    letterSpacing: 0.2,
  },
  versionTag: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginLeft: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  eventIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  eventTitle: {
    fontSize: typography.sizes.base + 1,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    flex: 1,
    lineHeight: 22,
  },
  eventMetaContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 4,
    columnGap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventMetaText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  financialContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  financialLeft: {
    flex: 1,
  },
  finLabel: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  finTotalAmount: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: 1,
  },
  finPaidSubtext: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  financialRight: {
    alignItems: "flex-end",
  },
  amountDueLabel: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.bold,
    color: colors.warningDark,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  amountDueValue: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: 1,
  },
  paidInFullBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  paidInFullText: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.bold,
    color: colors.successText,
    letterSpacing: 0.4,
  },
  /* Inner Callout Banners */
  readyCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  readyCalloutText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.successText,
    flex: 1,
    lineHeight: 16,
  },
  completedCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.powderBlue,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  completedCalloutText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 16,
  },
  balanceCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  balanceCalloutText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.warningText,
    flex: 1,
    lineHeight: 16,
  },
  /* Card Action Footer */
  cardActionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
    gap: spacing.sm,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingVertical: 8,
    paddingHorizontal: spacing.xs,
  },
  detailsBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.primary,
    marginRight: 2,
  },
  payBalanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.base,
    paddingVertical: 8,
    borderRadius: radius.pill,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  payBalanceBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
});

export default BookingsListScreen;
