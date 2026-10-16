import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Users,
  Plus,
  Eye,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import useRealTimeRefresh from "../../utils/useRealTimeRefresh";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import CustomerHeaderIcons from "../../components/customer/CustomerHeaderIcons";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import FilterSortBar from "../../components/common/FilterSortBar";
import { formatDate, formatTime, formatCurrency } from "../../utils/format";
import { isSpecialOffer } from "../../utils/packageDisplay";
import {
  bookingStatusGroup,
  resolveServiceType,
  recordTitle,
} from "../../utils/statusMeta";

const CUSTOM_QUOTE_OPTIONS = [
  "Custom Quote - Food Only",
  "Custom Quote - Event Setup Only",
  "Custom Quote - Food and Event Setup",
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "date", label: "Event date" },
];

export const BookingsListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [bookings, setBookings] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters, Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isPaymentDueOnly, setIsPaymentDueOnly] = useState(false);

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [bookData, pkgData] = await Promise.all([
        customerApi.getBookings(),
        customerApi.getPackages().catch(() => []),
      ]);
      const list = Array.isArray(bookData) ? bookData : bookData?.data || [];
      setBookings(list);
      setPackages(Array.isArray(pkgData) ? pkgData : pkgData?.data || []);
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
    loadData();
  }, [loadData]);

  useRealTimeRefresh(loadData);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Derive configured Combo Pack names matching website
  const comboPackNames = useMemo(() => {
    const names = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type === "special" || isSpecialOffer(pkg)) {
        if (pkg.name) names.add(pkg.name);
      }
    });
    (bookings || []).forEach((bkg) => {
      const isSpecial =
        bkg.booking_type === "special" ||
        bkg.package_id?.offer_type === "special" ||
        bkg.event_type === "Special Offer Catering" ||
        Boolean(bkg.package_id?.is_special_offer) ||
        (Array.isArray(bkg.offer_food_snapshot) && bkg.offer_food_snapshot.length > 0);
      if (isSpecial) {
        const name = bkg.package_name_snapshot || bkg.package_id?.name || bkg.package_name;
        if (name) names.add(name);
      }
    });
    return Array.from(names);
  }, [packages, bookings]);

  // Derive package service options matching website
  const packageServiceOptions = useMemo(() => {
    const options = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type !== "special" && !isSpecialOffer(pkg) && pkg.name) {
        options.add(pkg.name);
        options.add(`${pkg.name} + Menu`);
      }
    });
    (bookings || []).forEach((bkg) => {
      const st = resolveServiceType(bkg);
      if (st && !st.startsWith("Custom Quote -") && !comboPackNames.includes(st)) {
        options.add(st);
      }
    });
    return Array.from(options);
  }, [packages, bookings, comboPackNames]);

  // Grouped service options for the Service Type picker (matching website 1:1)
  const serviceGroups = useMemo(() => {
    const groups = [];

    // Custom Quotes
    groups.push({
      title: "Custom Quotes",
      options: CUSTOM_QUOTE_OPTIONS.map((opt) => ({
        key: opt,
        label: opt,
      })),
    });

    // Packages
    if (packageServiceOptions.length > 0) {
      groups.push({
        title: "Packages",
        options: packageServiceOptions.map((opt) => ({
          key: opt,
          label: opt,
        })),
      });
    }

    // Combo Packs
    if (comboPackNames.length > 0) {
      groups.push({
        title: "Combo Packs",
        options: comboPackNames.map((opt) => ({
          key: opt,
          label: opt,
        })),
      });
    }

    return groups;
  }, [packageServiceOptions, comboPackNames]);

  // Compute status counts for filter dropdown (exact website categories only)
  const filterCounts = useMemo(() => {
    const counts = {
      all: bookings.length,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    };

    bookings.forEach((b) => {
      const group = bookingStatusGroup(b);
      if (group === "confirmed") counts.confirmed += 1;
      if (group === "completed") counts.completed += 1;
      if (group === "cancelled") counts.cancelled += 1;
    });

    return counts;
  }, [bookings]);

  // Status dropdown options matching website 1:1 (NO "Needs payment" in status options)
  const statusOptions = [
    { key: "all", label: "All Bookings", count: filterCounts.all },
    { key: "confirmed", label: "Confirmed & Reserved", count: filterCounts.confirmed },
    { key: "completed", label: "Completed", count: filterCounts.completed },
    { key: "cancelled", label: "Cancelled", count: filterCounts.cancelled },
  ];

  // Filtered and sorted bookings list
  const filteredBookings = useMemo(() => {
    const filtered = bookings.filter((b) => {
      const group = bookingStatusGroup(b);
      const statusLower = String(b.status || "").toLowerCase();
      const total = Number(b.total_price || b.total_amount || 0);
      const paid = Number(b.deposit_paid || b.amount_paid || 0);
      const hasDue =
        total - paid > 0 &&
        !["completed", "event completed", "cancelled", "canceled", "rejected", "refunded"].includes(statusLower);

      // Payment-due filter (if activated via payment reminder banner)
      if (isPaymentDueOnly && !hasDue) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all" && group !== statusFilter) {
        return false;
      }

      // Service filter
      if (selectedService !== "all") {
        const itemService = resolveServiceType(b);
        const rawService = String(b.service_type || "");
        const pkgName = String(b.package_name_snapshot || b.package_name || "");

        const matches =
          itemService === selectedService ||
          itemService === `Custom Quote - ${selectedService}` ||
          `Custom Quote - ${itemService}` === selectedService ||
          rawService.toLowerCase().includes(selectedService.toLowerCase()) ||
          pkgName.toLowerCase() === selectedService.toLowerCase();

        if (!matches) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const ref = String(b.reference || "").toLowerCase();
        const title = recordTitle(b).toLowerCase();
        const venue = String(
          b.municipality || b.venue_address || b.province || ""
        ).toLowerCase();
        const pkg = String(
          b.package_name_snapshot || b.package_name || ""
        ).toLowerCase();

        if (
          !ref.includes(query) &&
          !title.includes(query) &&
          !venue.includes(query) &&
          !pkg.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });

    // Sort order matching website exactly
    return [...filtered].sort((a, b) => {
      const totalA = Number(a.total_price || a.total_amount || 0);
      const paidA = Number(a.deposit_paid || a.amount_paid || 0);
      const totalB = Number(b.total_price || b.total_amount || 0);
      const paidB = Number(b.deposit_paid || b.amount_paid || 0);

      const statusLowerA = String(a.status || "").toLowerCase();
      const statusLowerB = String(b.status || "").toLowerCase();

      const isOverdueA =
        totalA - paidA > 0 &&
        !["completed", "event completed", "cancelled", "canceled", "rejected", "refunded"].includes(statusLowerA);
      const isOverdueB =
        totalB - paidB > 0 &&
        !["completed", "event completed", "cancelled", "canceled", "rejected", "refunded"].includes(statusLowerB);

      // Overdue bookings always stay at top
      if (isOverdueA && !isOverdueB) return -1;
      if (!isOverdueA && isOverdueB) return 1;

      // If both are overdue, sort oldest event date first
      if (isOverdueA && isOverdueB) {
        const dateA = new Date(a.event_date || 0).getTime();
        const dateB = new Date(b.event_date || 0).getTime();
        return dateA - dateB;
      }

      // Otherwise follow selected sortBy
      if (sortBy === "oldest") {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortBy === "date") {
        const timeA = new Date(a.event_date || 0).getTime();
        const timeB = new Date(b.event_date || 0).getTime();
        return timeA - timeB;
      }
      // Default: newest
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [bookings, statusFilter, selectedService, searchQuery, sortBy, isPaymentDueOnly]);

  // Dynamic result count preview calculator for the bottom sheet
  const getPreviewCount = useCallback(
    ({ statusFilter: draftStatus, serviceFilter: draftService }) => {
      return bookings.filter((b) => {
        const group = bookingStatusGroup(b);
        const statusLower = String(b.status || "").toLowerCase();
        const total = Number(b.total_price || b.total_amount || 0);
        const paid = Number(b.deposit_paid || b.amount_paid || 0);
        const hasDue =
          total - paid > 0 &&
          !["completed", "event completed", "cancelled", "canceled", "rejected", "refunded"].includes(statusLower);

        if (isPaymentDueOnly && !hasDue) return false;
        if (draftStatus !== "all" && group !== draftStatus) return false;

        if (draftService !== "all") {
          const itemService = resolveServiceType(b);
          const rawService = String(b.service_type || "");
          const pkgName = String(b.package_name_snapshot || b.package_name || "");
          const matches =
            itemService === draftService ||
            itemService === `Custom Quote - ${draftService}` ||
            `Custom Quote - ${itemService}` === draftService ||
            rawService.toLowerCase().includes(draftService.toLowerCase()) ||
            pkgName.toLowerCase() === draftService.toLowerCase();
          if (!matches) return false;
        }

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          const ref = String(b.reference || "").toLowerCase();
          const title = recordTitle(b).toLowerCase();
          const venue = String(
            b.municipality || b.venue_address || b.province || ""
          ).toLowerCase();
          const pkg = String(
            b.package_name_snapshot || b.package_name || ""
          ).toLowerCase();
          if (
            !ref.includes(query) &&
            !title.includes(query) &&
            !venue.includes(query) &&
            !pkg.includes(query)
          ) {
            return false;
          }
        }

        return true;
      }).length;
    },
    [bookings, searchQuery, isPaymentDueOnly]
  );

  const handleClearAllFilters = () => {
    setStatusFilter("all");
    setSelectedService("all");
    setSortBy("newest");
    setSearchQuery("");
    setIsPaymentDueOnly(false);
  };

  const renderBookingItem = ({ item }) => {
    const total = Number(item.total_price || item.total_amount || 0);
    const statusLower = String(item.status || "").toLowerCase();
    const paymentStatusLower = String(item.payment_status || "").toLowerCase();

    const isCompleted = statusLower.includes("complete");
    const isCancelled =
      statusLower.includes("cancel") || statusLower.includes("refund");
    const isFullyPaid =
      paymentStatusLower === "fully_paid" ||
      (total > 0 && Number(item.deposit_paid || item.amount_paid || 0) >= total);

    const paid =
      isFullyPaid || isCompleted
        ? total
        : Number(item.deposit_paid || item.amount_paid || 0);

    const balanceDue =
      isCompleted || isCancelled || isFullyPaid
        ? 0
        : Math.max(0, total - paid);

    const hasBalanceDue = balanceDue > 0;
    const isPaidInFull = !hasBalanceDue && total > 0 && !isCancelled;

    const eventTitle = recordTitle(item);
    const resolvedService = resolveServiceType(item);
    const venue =
      [item.municipality, item.province].filter(Boolean).join(", ") ||
      item.venue_address;

    return (
      <Card
        style={styles.bookingCard}
        onPress={() => navigation.navigate("BookingDetail", { id: item._id })}
      >
        {/* Top Reference & Status Row */}
        <View style={styles.cardHeaderRow}>
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
        <Text style={styles.eventTitle} numberOfLines={2}>
          {eventTitle}
        </Text>

        {/* Event Meta Details (Compact & Clear) */}
        <View style={styles.detailsBlock}>
          {/* Row 1: Date & Time */}
          <View style={styles.metaRow}>
            <Clock size={13} color={colors.primary} style={styles.metaIcon} />
            <Text style={styles.metaHighlightText} numberOfLines={1}>
              {formatDate(item.event_date)}
              {item.start_time ? ` • ${formatTime(item.start_time)}` : ""}
            </Text>
          </View>

          {/* Row 2: Service Type & Guests */}
          <View style={styles.metaRow}>
            <Sparkles size={13} color={colors.textSubtle} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {resolvedService}
              {item.guest_count ? ` • ${item.guest_count} guests` : ""}
            </Text>
          </View>

          {/* Row 3: Venue / Location (if provided) */}
          {Boolean(venue) && (
            <View style={styles.metaRow}>
              <MapPin size={13} color={colors.textSubtle} style={styles.metaIcon} />
              <Text style={styles.metaText} numberOfLines={1}>
                {venue}
              </Text>
            </View>
          )}

          {/* Row 4: Site Visit / Ocular (if scheduled or requested) */}
          {item.ocular_visit?.status === "scheduled" && item.ocular_visit?.scheduled_date && (
            <View style={styles.metaRow}>
              <Eye size={13} color={colors.primary} style={styles.metaIcon} />
              <Text style={[styles.metaText, { color: colors.primary, fontWeight: "600" }]} numberOfLines={1}>
                Site Visit: {formatDate(item.ocular_visit.scheduled_date)}
                {item.ocular_visit.scheduled_time ? ` • ${item.ocular_visit.scheduled_time}` : ""}
              </Text>
            </View>
          )}

          {item.ocular_visit?.status === "requested" && item.ocular_visit?.scheduled_date && (
            <View style={styles.metaRow}>
              <Clock size={13} color={colors.warningDark || "#B45309"} style={styles.metaIcon} />
              <Text style={[styles.metaText, { color: colors.warningDark || "#B45309", fontWeight: "600" }]} numberOfLines={1}>
                Site Visit Requested: {formatDate(item.ocular_visit.scheduled_date)} (Review)
              </Text>
            </View>
          )}
        </View>

        {/* Financial Information Box (Space-Efficient) */}
        <View style={styles.financialRow}>
          <View style={styles.financialLeft}>
            <Text style={styles.finLabel}>TOTAL BOOKING</Text>
            <Text style={styles.finTotalAmount}>{formatCurrency(total)}</Text>
            {paid > 0 && hasBalanceDue ? (
              <Text style={styles.finPaidSubtext}>
                {formatCurrency(paid)} paid so far
              </Text>
            ) : null}
          </View>

          <View style={styles.financialRight}>
            {hasBalanceDue ? (
              <View style={styles.dueContainer}>
                <Text style={styles.amountDueLabel}>AMOUNT DUE</Text>
                <Text style={styles.amountDueValue}>{formatCurrency(balanceDue)}</Text>
              </View>
            ) : isPaidInFull || isCompleted ? (
              <View style={styles.paidInFullBadge}>
                <CheckCircle2 size={12} color={colors.success} style={{ marginRight: 4 }} />
                <Text style={styles.paidInFullText}>
                  {isCompleted ? "COMPLETED" : "PAID IN FULL"}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Compact Status Callout Banner */}
        {item.ocular_visit?.status === "requested" ? (
          <View style={styles.ocularCallout}>
            <Clock size={13} color={colors.warningDark || "#B45309"} style={styles.calloutIcon} />
            <Text style={styles.ocularCalloutText} numberOfLines={1}>
              Site visit requested for {formatDate(item.ocular_visit.scheduled_date)} • Awaiting confirmation
            </Text>
          </View>
        ) : isCompleted ? (
          <View style={styles.completedCallout}>
            <CheckCircle2 size={13} color={colors.primary} style={styles.calloutIcon} />
            <Text style={styles.completedCalloutText} numberOfLines={1}>
              Event completed. Thank you for celebrating with us!
            </Text>
          </View>
        ) : isPaidInFull ? (
          <View style={styles.readyCallout}>
            <CheckCircle2 size={13} color={colors.success} style={styles.calloutIcon} />
            <Text style={styles.readyCalloutText} numberOfLines={1}>
              You're all set! Everything is prepared for your event.
            </Text>
          </View>
        ) : hasBalanceDue ? (
          <View style={styles.balanceCallout}>
            <AlertCircle size={13} color={colors.warning} style={styles.calloutIcon} />
            <Text style={styles.balanceCalloutText} numberOfLines={1}>
              Your date is reserved. Balance is due before event setup.
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
              <CreditCard size={14} color={colors.white} style={{ marginRight: 5 }} />
              <Text style={styles.payBalanceBtnText}>Pay Balance</Text>
              <ChevronRight size={14} color={colors.white} />
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

          <CustomerHeaderIcons navigation={navigation} />
        </View>

        <View style={styles.headerSubRow}>
          <Text
            style={styles.screenSubtitle}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Track reserved events and payments.
          </Text>

          <TouchableOpacity
            style={styles.bookEventBtn}
            onPress={() => navigation.navigate("InquiryWizard")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Book an event"
          >
            <Plus size={14} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.bookEventBtnText}>Book an event</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1-Row Combined Search and Filter with Bottom Sheet */}
      <FilterSortBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by event or reference..."
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={SORT_OPTIONS}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={statusOptions}
        serviceFilter={selectedService}
        onServiceChange={setSelectedService}
        serviceGroups={serviceGroups}
        isPaymentDueActive={isPaymentDueOnly}
        onClearPaymentDue={() => setIsPaymentDueOnly(false)}
        onClearAll={handleClearAllFilters}
        getPreviewCount={getPreviewCount}
      />

      {/* Main List */}
      {loading ? (
        <LoadingState message="Loading your bookings..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={
            searchQuery || statusFilter !== "all" || selectedService !== "all" || sortBy !== "newest" || isPaymentDueOnly
              ? "No matching bookings"
              : "No bookings found"
          }
          description={
            searchQuery || statusFilter !== "all" || selectedService !== "all" || sortBy !== "newest" || isPaymentDueOnly
              ? "Try adjusting your search criteria or resetting filters."
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
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 100 },
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
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 6,
  },
  headerTitleGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
    minWidth: 0,
    gap: spacing.xs + 2,
  },
  screenTitle: {
    fontSize: 21,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  headerCountBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexShrink: 0,
  },
  headerCountBadgeText: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  headerSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  bookEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    minHeight: 34,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  bookEventBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
  screenSubtitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
  /* List Content */
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  bookingCard: {
    padding: spacing.base - 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
    marginBottom: 4,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  metaIcon: {
    marginRight: 5,
    flexShrink: 0,
  },
  bookingRef: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
    letterSpacing: 0.2,
  },
  versionTag: {
    fontSize: typography.sizes.micro,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginLeft: 3,
  },
  eventTitle: {
    fontSize: 15.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.2,
    marginBottom: spacing.xs + 2,
    lineHeight: 21,
  },
  detailsBlock: {
    gap: 3,
    marginBottom: spacing.xs + 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaHighlightText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    flexShrink: 1,
  },
  metaText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    flexShrink: 1,
  },
  /* Financial Box */
  financialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    marginBottom: spacing.xs + 2,
  },
  financialLeft: {
    flex: 1,
  },
  finLabel: {
    fontSize: 9.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  finTotalAmount: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: 1,
  },
  finPaidSubtext: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginTop: 1,
  },
  financialRight: {
    alignItems: "flex-end",
  },
  dueContainer: {
    alignItems: "flex-end",
  },
  amountDueLabel: {
    fontSize: 9.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.warningDark,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  amountDueValue: {
    fontSize: typography.sizes.sm + 1,
    fontFamily: typography.fontFamilies.bold,
    color: colors.warningDark,
    marginTop: 1,
  },
  paidInFullBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  paidInFullText: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.successText,
    letterSpacing: 0.3,
  },
  /* Callouts */
  calloutIcon: {
    marginRight: 5,
    flexShrink: 0,
  },
  ocularCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: spacing.xs + 2,
  },
  ocularCalloutText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.warningDark,
    flex: 1,
  },
  readyCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: spacing.xs + 2,
  },
  readyCalloutText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.successText,
    flex: 1,
  },
  completedCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.powderBlue,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: spacing.xs + 2,
  },
  completedCalloutText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.primaryDark,
    flex: 1,
  },
  balanceCallout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    paddingVertical: 4,
    paddingHorizontal: 7,
    marginBottom: spacing.xs + 2,
  },
  balanceCalloutText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.warningText,
    flex: 1,
  },
  /* Footer Actions */
  cardActionFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 34,
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
  },
  detailsBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
    marginRight: 2,
  },
  payBalanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.pill,
    minHeight: 34,
  },
  payBalanceBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
    marginRight: 2,
  },
});

export default BookingsListScreen;
