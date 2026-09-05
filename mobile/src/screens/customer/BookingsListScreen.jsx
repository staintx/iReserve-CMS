import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState("All services");

  const loadBookings = async () => {
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
  };

  useEffect(() => {
    loadBookings();
  }, []);

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
    const paid = Number(item.deposit_paid || item.amount_paid || 0);
    const balanceDue = Math.max(0, total - paid);
    const isPaidInFull = balanceDue === 0 && total > 0;

    const eventTitle =
      item.event_name ||
      `${item.customer_name || "Special Offer"}'s ${item.event_type || "Catering"}`;

    return (
      <Card
        style={styles.bookingCard}
        onPress={() => navigation.navigate("BookingDetail", { id: item._id })}
      >
        {/* Header Row: Title + Status + Financial info matching Screenshots 4 & 5 */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.titleCol}>
            <View style={styles.iconAndTitle}>
              <UtensilsCrossed size={18} color={colors.foregroundMuted} style={styles.eventIcon} />
              <Text style={styles.eventTitle} numberOfLines={1}>
                {eventTitle}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <StatusBadge status={item.status || "Confirmed & Reserved"} size="sm" />
            </View>

            <Text style={styles.eventMetaText}>
              {formatDate(item.event_date)} • {formatTime(item.start_time)} •{" "}
              {item.service_type || "Food and Event Setup"}
              {item.version ? ` • Revised • v${item.version}` : ""}
            </Text>
          </View>

          {/* Right-aligned Financial Block */}
          <View style={styles.financialCol}>
            {isPaidInFull ? (
              <>
                <Text style={styles.paidStatusLabel}>PAID IN FULL</Text>
                <Text style={styles.paidFullAmount}>{formatCurrency(total)}</Text>
              </>
            ) : balanceDue > 0 ? (
              <>
                <Text style={styles.amountDueLabel}>AMOUNT DUE</Text>
                <Text style={styles.amountDueValue}>{formatCurrency(balanceDue)}</Text>
                {paid > 0 && (
                  <Text style={styles.paidSubtext}>
                    {formatCurrency(paid)} paid so far
                  </Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.totalCostLabel}>TOTAL</Text>
                <Text style={styles.totalCostValue}>{formatCurrency(total)}</Text>
              </>
            )}

            <View style={styles.detailsToggle}>
              <Text style={styles.detailsToggleText}>Details</Text>
              <ChevronRight size={14} color={colors.foregroundMuted} />
            </View>
          </View>
        </View>

        {/* Status Callout Banner matching Screenshots 4 & 5 */}
        {isPaidInFull ? (
          <View style={styles.readyCallout}>
            <CheckCircle2 size={16} color={colors.success} style={{ marginRight: 6 }} />
            <Text style={styles.readyCalloutText}>
              You're all set. Everything is prepared and ready for your event.
            </Text>
          </View>
        ) : balanceDue > 0 ? (
          <View style={styles.balanceCallout}>
            <AlertCircle size={16} color={colors.foregroundMuted} style={{ marginRight: 6 }} />
            <Text style={styles.balanceCalloutText}>
              Your date is reserved. The remaining balance is due before your event setup.
            </Text>
          </View>
        ) : null}

        {/* CTA: Pay Remaining Balance in Emerald Green matching Screenshot 5 */}
        {balanceDue > 0 && (
          <View style={styles.actionRow}>
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
          </View>
        )}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching Screenshots 4 & 5 */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.screenTitle}>My Bookings</Text>
          <Text style={styles.screenSubtitle}>
            Track your reserved events, payments, and what to do next.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookEventBtn}
          onPress={() => navigation.navigate("InquiryWizard")}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.bookEventBtnText}>Book an event</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Reminder Amber Banner matching Screenshots 4 & 5 */}
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
          contentContainerStyle={styles.listContent}
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
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerTextGroup: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.serifBold,
    color: colors.foreground,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  screenSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  bookEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  bookEventBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
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
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  bookingCard: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  titleCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  iconAndTitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  eventIcon: {
    marginRight: 6,
  },
  eventTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.serifBold,
    color: colors.foreground,
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  eventMetaText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 15,
  },
  financialCol: {
    alignItems: "flex-end",
    minWidth: 100,
  },
  paidStatusLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    letterSpacing: 0.5,
  },
  paidFullAmount: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.success,
    marginTop: 1,
  },
  amountDueLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    letterSpacing: 0.5,
  },
  amountDueValue: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: 1,
  },
  paidSubtext: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  totalCostLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  totalCostValue: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
  },
  detailsToggle: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs,
  },
  detailsToggleText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginRight: 2,
  },
  /* Inner Callout Banners */
  readyCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  readyCalloutText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.successText,
    flex: 1,
    lineHeight: 16,
  },
  balanceCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
  },
  balanceCalloutText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    flex: 1,
    lineHeight: 16,
  },
  /* Pay Action Row */
  actionRow: {
    marginTop: spacing.md,
    alignItems: "flex-end",
  },
  payBalanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: spacing.base,
    paddingVertical: 9,
    borderRadius: radius.md,
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
