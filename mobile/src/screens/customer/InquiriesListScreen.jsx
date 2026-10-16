import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import {
  Plus,
  Calendar,
  Clock,
  Users,
  MapPin,
  ChevronRight,
  Sparkles,
  FileText,
  FileCheck2,
  CreditCard,
  AlertCircle,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import useRealTimeRefresh from "../../utils/useRealTimeRefresh";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import LoadingState from "../../components/common/LoadingState";
import CustomerHeaderIcons from "../../components/customer/CustomerHeaderIcons";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import ProcessTimeline from "../../components/common/ProcessTimeline";
import FilterSortBar from "../../components/common/FilterSortBar";
import { formatDate, formatTime } from "../../utils/format";
import { isSpecialOffer } from "../../utils/packageDisplay";
import {
  inquiryStatusGroup,
  resolveServiceType,
  recordTitle,
  isCancelledInquiry,
  isPastDay,
} from "../../utils/statusMeta";
import { confirmAction, showAlertDialog } from "../../context/DialogContext";

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

export const InquiriesListScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [inquiries, setInquiries] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters, Search & Sort State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const loadData = useCallback(async () => {
    setError("");
    try {
      const [inqData, pkgData] = await Promise.all([
        customerApi.getInquiries(),
        customerApi.getPackages().catch(() => []),
      ]);
      setInquiries(Array.isArray(inqData) ? inqData : inqData?.data || []);
      setPackages(Array.isArray(pkgData) ? pkgData : pkgData?.data || []);
    } catch (err) {
      setError("Unable to load inquiries. Please check your connection.");
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

  const handleCancelInquiry = async (inquiryId) => {
    const shouldCancel = await confirmAction({
      title: "Cancel Event Inquiry?",
      message:
        "Are you sure you want to cancel this event request? This inquiry and its custom selections will be closed.",
      confirmText: "Cancel Inquiry",
      cancelText: "Keep Inquiry",
      tone: "destructive",
      icon: AlertCircle,
    });

    if (shouldCancel) {
      try {
        await customerApi.cancelInquiry(inquiryId);
        loadData();
      } catch (err) {
        showAlertDialog({
          title: "Cancellation Failed",
          message: err.response?.data?.message || "Failed to cancel inquiry.",
          tone: "destructive",
          confirmText: "Got It",
        });
      }
    }
  };

  // Derive configured Combo Pack names matching website
  const comboPackNames = useMemo(() => {
    const names = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type === "special" || isSpecialOffer(pkg)) {
        if (pkg.name) names.add(pkg.name);
      }
    });
    (inquiries || []).forEach((inq) => {
      const isSpecial =
        inq.booking_type === "special" ||
        inq.package_id?.offer_type === "special" ||
        inq.event_type === "Special Offer Catering" ||
        Boolean(inq.package_id?.is_special_offer) ||
        (Array.isArray(inq.offer_food_snapshot) && inq.offer_food_snapshot.length > 0);
      if (isSpecial) {
        const name = inq.package_name_snapshot || inq.package_id?.name;
        if (name) names.add(name);
      }
    });
    return Array.from(names);
  }, [packages, inquiries]);

  // Derive package service options matching website
  const packageServiceOptions = useMemo(() => {
    const options = new Set();
    (packages || []).forEach((pkg) => {
      if (pkg.offer_type !== "special" && !isSpecialOffer(pkg) && pkg.name) {
        options.add(pkg.name);
        options.add(`${pkg.name} + Menu`);
      }
    });
    (inquiries || []).forEach((inq) => {
      const st = resolveServiceType(inq);
      if (st && !st.startsWith("Custom Quote -") && !comboPackNames.includes(st)) {
        options.add(st);
      }
    });
    return Array.from(options);
  }, [packages, inquiries, comboPackNames]);

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

  // Active inquiries base list (exclude converted to bookings, identical to website)
  const baseInquiries = useMemo(() => {
    return inquiries.filter((inq) => inquiryStatusGroup(inq) !== "converted");
  }, [inquiries]);

  // Calculate status counts matching website status groups
  const filterCounts = useMemo(() => {
    const counts = {
      all: baseInquiries.length,
      pending_review: 0,
      quote_ready: 0,
      accepted: 0,
      cancelled: 0,
    };

    baseInquiries.forEach((item) => {
      const group = inquiryStatusGroup(item);
      if (group in counts) {
        counts[group] += 1;
      }
    });

    return counts;
  }, [baseInquiries]);

  // Status dropdown options matching website 1:1
  const statusOptions = [
    { key: "all", label: "All inquiries", count: filterCounts.all },
    { key: "pending_review", label: "Pending review", count: filterCounts.pending_review },
    { key: "quote_ready", label: "Quotation ready", count: filterCounts.quote_ready },
    { key: "accepted", label: "Accepted", count: filterCounts.accepted },
    { key: "cancelled", label: "Cancelled", count: filterCounts.cancelled },
  ];

  // Sorting function matching website exactly
  const sortInquiriesList = (list, sortOrder) => {
    return [...list].sort((a, b) => {
      if (sortOrder === "oldest") {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeA - timeB;
      }
      if (sortOrder === "date") {
        const timeA = new Date(a.event_date || 0).getTime();
        const timeB = new Date(b.event_date || 0).getTime();
        return timeA - timeB;
      }
      // Default: newest
      const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  };

  // Filtered and sorted inquiries list
  const filteredInquiries = useMemo(() => {
    const filtered = baseInquiries.filter((item) => {
      const group = inquiryStatusGroup(item);

      // Status filter
      if (statusFilter !== "all" && group !== statusFilter) {
        return false;
      }

      // Service filter
      if (selectedService !== "all") {
        const itemService = resolveServiceType(item);
        const rawService = String(item.service_type || "");
        const pkgName = String(item.package_name_snapshot || item.package_name || "");

        const matches =
          itemService === selectedService ||
          itemService === `Custom Quote - ${selectedService}` ||
          `Custom Quote - ${itemService}` === selectedService ||
          rawService.toLowerCase().includes(selectedService.toLowerCase()) ||
          pkgName.toLowerCase() === selectedService.toLowerCase();

        if (!matches) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const ref = String(item.reference || "").toLowerCase();
        const title = recordTitle(item).toLowerCase();
        const celebrant = String(item.celebrant_name || "").toLowerCase();
        const venue = String(
          item.venue_address || item.municipality || item.province || ""
        ).toLowerCase();
        const pkg = String(
          item.package_name_snapshot || item.package_name || ""
        ).toLowerCase();

        if (
          !ref.includes(query) &&
          !title.includes(query) &&
          !celebrant.includes(query) &&
          !venue.includes(query) &&
          !pkg.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });

    return sortInquiriesList(filtered, sortBy);
  }, [baseInquiries, statusFilter, selectedService, searchQuery, sortBy]);

  // Dynamic result count preview calculator for the bottom sheet
  const getPreviewCount = useCallback(
    ({ statusFilter: draftStatus, serviceFilter: draftService }) => {
      return baseInquiries.filter((item) => {
        const group = inquiryStatusGroup(item);
        if (draftStatus !== "all" && group !== draftStatus) return false;

        if (draftService !== "all") {
          const itemService = resolveServiceType(item);
          const rawService = String(item.service_type || "");
          const pkgName = String(item.package_name_snapshot || item.package_name || "");
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
          const ref = String(item.reference || "").toLowerCase();
          const title = recordTitle(item).toLowerCase();
          const celebrant = String(item.celebrant_name || "").toLowerCase();
          const venue = String(
            item.venue_address || item.municipality || item.province || ""
          ).toLowerCase();
          const pkg = String(
            item.package_name_snapshot || item.package_name || ""
          ).toLowerCase();
          if (
            !ref.includes(query) &&
            !title.includes(query) &&
            !celebrant.includes(query) &&
            !venue.includes(query) &&
            !pkg.includes(query)
          ) {
            return false;
          }
        }

        return true;
      }).length;
    },
    [baseInquiries, searchQuery]
  );

  const handleClearAllFilters = () => {
    setStatusFilter("all");
    setSelectedService("all");
    setSortBy("newest");
    setSearchQuery("");
  };

  const renderInquiryItem = ({ item }) => {
    const isQuoteReady =
      item.status === "Quotation Sent" ||
      String(item.status || "").toLowerCase().includes("quote");

    const isConverted =
      item.status === "Converted to Booking" || Boolean(item.converted_booking_id);
    const isDepositPaid =
      item.payment_status === "deposit_paid" ||
      item.payment_status === "fully_paid" ||
      item.is_deposit_paid === true;

    const isQuoteAcceptedAwaitingPayment =
      ["Quote Accepted", "Awaiting Final Confirmation"].includes(item.status) &&
      !isConverted &&
      !isDepositPaid;

    const canCancel = ["Pending Review", "Under Review", "draft"].includes(item.status);
    const eventTitle = recordTitle(item);
    const resolvedService = resolveServiceType(item);
    const isExpired = item.status === "Expired" || (item.event_date && isPastDay(item.event_date));

    // Contextual status guidance
    let statusNotice = null;
    if (isExpired) {
      statusNotice = "Requested event date has passed without confirmation.";
    } else if (isQuoteAcceptedAwaitingPayment) {
      statusNotice = "Quote accepted! Pay deposit to lock your event date.";
    } else if (isQuoteReady) {
      statusNotice = "Official proposal ready! Review itemized quote to confirm.";
    } else if (item.status === "Revision Requested") {
      statusNotice = "Our coordinators are revising your quotation specs.";
    }

    const venue = [item.municipality, item.province].filter(Boolean).join(", ") || item.venue_address;
    const packageName = item.package_name_snapshot || item.package_name;

    return (
      <Card
        style={styles.inquiryCard}
        onPress={() => navigation.navigate("InquiryDetail", { inquiryId: item._id })}
      >
        {/* Top Reference & Status Badge */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.refDateWrap}>
            <Text style={styles.inquiryRef} numberOfLines={1}>
              {item.reference || `INQ-${String(item._id).slice(-6).toUpperCase()}`}
            </Text>
            {item.createdAt || item.created_at ? (
              <Text style={styles.submitDate} numberOfLines={1}>
                • {formatDate(item.createdAt || item.created_at)}
              </Text>
            ) : null}
          </View>

          <StatusBadge status={item.status} size="sm" />
        </View>

        {/* Event Title */}
        <Text style={styles.eventTitle} numberOfLines={2}>
          {eventTitle}
        </Text>

        {/* Compact 4-Step Process Stepper */}
        <View style={styles.stepperContainer}>
          <ProcessTimeline status={item.status} compact />
        </View>

        {/* Compact Metadata Rows (No Truncation) */}
        <View style={styles.detailsBlock}>
          {/* Row 1: Date & Time */}
          <View style={styles.metaRow}>
            <Calendar size={13} color={colors.primary} style={styles.metaIcon} />
            <Text style={styles.metaHighlightText} numberOfLines={1}>
              {formatDate(item.event_date)}
              {item.start_time ? ` • ${formatTime(item.start_time)}` : ""}
            </Text>
          </View>

          {/* Row 2: Service Type, Package & Guests */}
          <View style={styles.metaRow}>
            <Sparkles size={13} color={colors.textSubtle} style={styles.metaIcon} />
            <Text style={styles.metaText} numberOfLines={1}>
              {resolvedService}
              {packageName ? ` • ${packageName}` : ""}
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
        </View>

        {/* Contextual Notice Callout (if active) */}
        {Boolean(statusNotice) && (
          <View
            style={[
              styles.noticeCallout,
              isExpired
                ? styles.noticeCalloutNeutral
                : isQuoteAcceptedAwaitingPayment
                ? styles.noticeCalloutSuccess
                : styles.noticeCalloutInfo,
            ]}
          >
            {isExpired ? (
              <AlertCircle size={13} color={colors.foregroundMuted} style={styles.noticeIcon} />
            ) : isQuoteAcceptedAwaitingPayment ? (
              <CreditCard size={13} color={colors.success} style={styles.noticeIcon} />
            ) : (
              <FileCheck2 size={13} color={colors.primary} style={styles.noticeIcon} />
            )}
            <Text
              style={[
                styles.noticeText,
                isExpired
                  ? styles.noticeTextNeutral
                  : isQuoteAcceptedAwaitingPayment
                  ? styles.noticeTextSuccess
                  : styles.noticeTextInfo,
              ]}
              numberOfLines={2}
            >
              {statusNotice}
            </Text>
          </View>
        )}

        {/* Footer Actions */}
        <View style={styles.cardFooter}>
          {canCancel ? (
            <TouchableOpacity
              onPress={() => handleCancelInquiry(item._id)}
              style={styles.cancelBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptySpacer} />
          )}

          <View style={styles.actionGroup}>
            {isQuoteAcceptedAwaitingPayment ? (
              <TouchableOpacity
                style={styles.payDepositBtn}
                onPress={() =>
                  navigation.navigate("QuotationDetail", { inquiryId: item._id })
                }
                activeOpacity={0.85}
              >
                <CreditCard size={14} color={colors.white} style={{ marginRight: 5 }} />
                <Text style={styles.payDepositBtnText}>Pay Deposit</Text>
                <ChevronRight size={14} color={colors.white} />
              </TouchableOpacity>
            ) : isQuoteReady ? (
              <TouchableOpacity
                style={styles.viewQuoteBtn}
                onPress={() =>
                  navigation.navigate("QuotationDetail", { inquiryId: item._id })
                }
                activeOpacity={0.85}
              >
                <FileCheck2 size={14} color={colors.white} style={{ marginRight: 5 }} />
                <Text style={styles.viewQuoteBtnText}>Review Quote</Text>
                <ChevronRight size={14} color={colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() =>
                  navigation.navigate("InquiryDetail", { inquiryId: item._id })
                }
                activeOpacity={0.7}
              >
                <Text style={styles.detailsBtnText}>Full Details</Text>
                <ChevronRight size={14} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  const headerPaddingTop =
    Math.max(insets.top, Platform.OS === "ios" ? 44 : 24) +
    (Platform.OS === "ios" ? 6 : 10);

  return (
    <View style={styles.container}>
      {/* Screen Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleGroup}>
            <Text style={styles.screenTitle}>My Inquiries</Text>
            {baseInquiries.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{baseInquiries.length}</Text>
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
            Track event requests and quotes.
          </Text>

          <TouchableOpacity
            style={styles.newRequestBtn}
            onPress={() => navigation.navigate("InquiryWizard")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="New Request"
          >
            <Plus size={14} color={colors.white} style={{ marginRight: 4 }} />
            <Text style={styles.newRequestBtnText}>New Request</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 1-Row Combined Search and Filter with Bottom Sheet */}
      <FilterSortBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by event, reference, venue..."
        sortBy={sortBy}
        onSortChange={setSortBy}
        sortOptions={SORT_OPTIONS}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        statusOptions={statusOptions}
        serviceFilter={selectedService}
        onServiceChange={setSelectedService}
        serviceGroups={serviceGroups}
        onClearAll={handleClearAllFilters}
        getPreviewCount={getPreviewCount}
      />

      {/* Main List */}
      {loading ? (
        <LoadingState message="Loading your inquiries..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : filteredInquiries.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            searchQuery || statusFilter !== "all" || selectedService !== "all" || sortBy !== "newest"
              ? "No matching inquiries"
              : "No inquiries yet"
          }
          description={
            searchQuery || statusFilter !== "all" || selectedService !== "all" || sortBy !== "newest"
              ? "Try adjusting your search criteria or resetting filters."
              : "Create an inquiry to request quotation and menu proposals tailored for your event."
          }
          actionLabel="Submit New Request"
          onAction={() => navigation.navigate("InquiryWizard")}
        />
      ) : (
        <FlatList
          data={filteredInquiries}
          renderItem={renderInquiryItem}
          keyExtractor={(item) => item._id}
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
  countBadge: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexShrink: 0,
  },
  countBadgeText: {
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
  newRequestBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    minHeight: 34,
    borderRadius: radius.pill,
    flexShrink: 0,
  },
  newRequestBtnText: {
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
  inquiryCard: {
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
  refDateWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    flexWrap: "wrap",
  },
  inquiryRef: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
    letterSpacing: 0.2,
  },
  submitDate: {
    fontSize: 11,
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
  /* Stepper */
  stepperContainer: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  /* Structured Details Block */
  detailsBlock: {
    gap: 3,
    marginBottom: spacing.xs + 2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaIcon: {
    marginRight: 6,
    flexShrink: 0,
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
  /* Contextual Notice */
  noticeCallout: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: spacing.xs + 2,
    borderWidth: 1,
  },
  noticeIcon: {
    marginRight: 5,
    flexShrink: 0,
  },
  noticeText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    lineHeight: 15,
    flex: 1,
  },
  noticeCalloutInfo: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.powderBlue,
  },
  noticeTextInfo: {
    color: colors.primaryDark,
  },
  noticeCalloutSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder,
  },
  noticeTextSuccess: {
    color: colors.successText,
    fontFamily: typography.fontFamilies.bold,
  },
  noticeCalloutNeutral: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.cardBorder,
  },
  noticeTextNeutral: {
    color: colors.foregroundMuted,
  },
  /* Footer */
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  emptySpacer: {
    flex: 1,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.xs,
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.error,
  },
  actionGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
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
  viewQuoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.pill,
    minHeight: 34,
  },
  viewQuoteBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
    marginRight: 2,
  },
  payDepositBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: radius.pill,
    minHeight: 34,
  },
  payDepositBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
    marginRight: 2,
  },
});

export default InquiriesListScreen;
