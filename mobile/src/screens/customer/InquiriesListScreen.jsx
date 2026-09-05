import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Search,
  X,
  Plus,
  Calendar,
  Clock,
  Users,
  MapPin,
  ChevronRight,
  Sparkles,
  FileText,
  SlidersHorizontal,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import PillFilter from "../../components/common/PillFilter";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import ProcessTimeline from "../../components/common/ProcessTimeline";
import { formatDate, formatTime } from "../../utils/format";

const SERVICE_OPTIONS = [
  "All Services",
  "Food Only",
  "Event Setup Only",
  "Food and Event Setup",
];

export const InquiriesListScreen = ({ navigation }) => {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedService, setSelectedService] = useState("All Services");

  const loadInquiries = async () => {
    setError("");
    try {
      const data = await customerApi.getInquiries();
      setInquiries(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Unable to load inquiries. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInquiries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadInquiries();
  };

  const handleCancelInquiry = (inquiryId) => {
    Alert.alert(
      "Cancel Inquiry",
      "Are you sure you want to cancel this event inquiry?",
      [
        { text: "No, Keep It", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await customerApi.cancelInquiry(inquiryId);
              loadInquiries();
            } catch (err) {
              Alert.alert("Error", err.response?.data?.message || "Failed to cancel inquiry.");
            }
          },
        },
      ]
    );
  };

  // Compute count badges for filter tabs matching Screenshot 3
  const filterCounts = useMemo(() => {
    const counts = {
      all: inquiries.length,
      quote_ready: 0,
      under_review: 0,
      accepted: 0,
      closed: 0,
    };

    inquiries.forEach((item) => {
      const st = String(item.status || "").toLowerCase();
      if (st.includes("sent") || st.includes("ready") || st.includes("quotation")) {
        counts.quote_ready += 1;
      } else if (st.includes("review") || st.includes("pending") || st === "draft") {
        counts.under_review += 1;
      } else if (st.includes("accepted") || st.includes("converted") || st.includes("booked")) {
        counts.accepted += 1;
      } else if (st.includes("cancel") || st.includes("reject") || st.includes("closed")) {
        counts.closed += 1;
      }
    });

    return counts;
  }, [inquiries]);

  const filterTabs = [
    { key: "all", label: "All", count: filterCounts.all },
    { key: "quote_ready", label: "Quote Ready", count: filterCounts.quote_ready },
    { key: "under_review", label: "Under Review", count: filterCounts.under_review },
    { key: "accepted", label: "Accepted", count: filterCounts.accepted },
    { key: "closed", label: "Closed", count: filterCounts.closed },
  ];

  // Filtered inquiries list based on tab, service, and search query
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((item) => {
      const st = String(item.status || "").toLowerCase();

      // Tab filter
      if (statusFilter === "quote_ready") {
        if (!st.includes("sent") && !st.includes("ready") && !st.includes("quotation")) return false;
      } else if (statusFilter === "under_review") {
        if (!st.includes("review") && !st.includes("pending") && st !== "draft") return false;
      } else if (statusFilter === "accepted") {
        if (!st.includes("accepted") && !st.includes("converted") && !st.includes("booked")) return false;
      } else if (statusFilter === "closed") {
        if (!st.includes("cancel") && !st.includes("reject") && !st.includes("closed")) return false;
      }

      // Service filter
      if (selectedService !== "All Services") {
        const itemService = String(item.service_type || "").toLowerCase();
        if (!itemService.includes(selectedService.toLowerCase())) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const ref = String(item.reference || "").toLowerCase();
        const eventName = String(item.event_name || item.event_type || "").toLowerCase();
        const celebrant = String(item.celebrant_name || "").toLowerCase();
        const venue = String(item.venue_address || item.municipality || "").toLowerCase();
        if (
          !ref.includes(query) &&
          !eventName.includes(query) &&
          !celebrant.includes(query) &&
          !venue.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [inquiries, statusFilter, selectedService, searchQuery]);

  const renderInquiryItem = ({ item }) => {
    const isQuoteReady =
      item.status === "Quotation Sent" ||
      String(item.status || "").toLowerCase().includes("quote");
    const canCancel = ["Pending Review", "Under Review", "draft"].includes(item.status);

    const eventTitle =
      item.event_name ||
      `${item.celebrant_name || "Special Party"}'s ${item.event_type || "Event"}`;

    return (
      <Card style={styles.inquiryCard}>
        {/* Header: Reference + Submission Date + Actions */}
        <View style={styles.cardHeader}>
          <View>
            <View style={styles.refRow}>
              <Text style={styles.inquiryRef}>
                {item.reference || `INQ-${String(item._id).slice(-6).toUpperCase()}`}
              </Text>
              {item.created_at || item.createdAt ? (
                <Text style={styles.submitDate}>
                  • Submitted {formatDate(item.created_at || item.createdAt)}
                </Text>
              ) : null}
            </View>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {eventTitle}
            </Text>
            <Text style={styles.serviceSubtitle}>
              {item.service_type || "Food and Event Setup"} • {item.guest_count || 50} guests
            </Text>
          </View>

          <StatusBadge status={item.status} />
        </View>

        {/* 4-Step Process Stepper matching Screenshot 3 */}
        <View style={styles.processBox}>
          <ProcessTimeline status={item.status} />
        </View>

        {/* Event Specifications Card */}
        <View style={styles.specsBox}>
          <Text style={styles.specsHeaderTitle}>EVENT SPECIFICATIONS</Text>

          <View style={styles.specsGrid}>
            <View style={styles.specCell}>
              <Text style={styles.specCellLabel}>Celebrant / Honoree</Text>
              <Text style={styles.specCellValue} numberOfLines={1}>
                {item.celebrant_name || item.honoree || "Customer Event"}
              </Text>
            </View>

            <View style={styles.specCell}>
              <Text style={styles.specCellLabel}>Date & Time</Text>
              <Text style={styles.specCellValue}>
                {formatDate(item.event_date)} • {formatTime(item.start_time)}
              </Text>
            </View>

            <View style={styles.specCell}>
              <Text style={styles.specCellLabel}>Guest Count</Text>
              <Text style={styles.specCellValue}>{item.guest_count || 50} pax</Text>
            </View>

            <View style={styles.specCell}>
              <Text style={styles.specCellLabel}>Package</Text>
              <Text style={styles.specCellValue} numberOfLines={1}>
                {item.package_name_snapshot || item.package_name || "Custom Selection"}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer Actions matching Screenshot 3 */}
        <View style={styles.cardFooter}>
          {canCancel ? (
            <TouchableOpacity
              onPress={() => handleCancelInquiry(item._id)}
              style={styles.cancelBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}

          <View style={styles.rightActionsRow}>
            {isQuoteReady ? (
              <TouchableOpacity
                style={styles.viewQuoteBtn}
                onPress={() =>
                  navigation.navigate("QuotationDetail", { inquiryId: item._id })
                }
                activeOpacity={0.8}
              >
                <FileText size={15} color={colors.white} style={{ marginRight: 6 }} />
                <Text style={styles.viewQuoteBtnText}>View Quotation</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.fullDetailsBtn}
                onPress={() =>
                  navigation.navigate("QuotationDetail", { inquiryId: item._id })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.fullDetailsBtnText}>Full Details</Text>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header matching Screenshot 3 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.screenTitle}>My Inquiries</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{inquiries.length}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.newRequestBtn}
          onPress={() => navigation.navigate("InquiryWizard")}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.white} style={{ marginRight: 4 }} />
          <Text style={styles.newRequestBtnText}>New Request</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={colors.foregroundMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by event, reference, venue..."
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

      {/* Filter Tabs matching Screenshot 3 */}
      <PillFilter
        items={filterTabs}
        selectedKey={statusFilter}
        onSelect={setStatusFilter}
        style={styles.filterTabsWrapper}
      />

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
                style={[
                  styles.serviceChip,
                  isSelected && styles.serviceChipActive,
                ]}
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

      {/* Main Content List */}
      {loading ? (
        <LoadingState message="Loading your inquiries..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadInquiries} />
      ) : filteredInquiries.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={searchQuery ? "No matching inquiries" : "No inquiries yet"}
          description={
            searchQuery
              ? "Try adjusting your search terms or filters."
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  screenTitle: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.serifBold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  countBadge: {
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  countBadgeText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  newRequestBtn: {
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
  newRequestBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
  /* Search */
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 42,
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
  /* Filter Tabs */
  filterTabsWrapper: {
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  /* Service Chips */
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
    backgroundColor: colors.primaryLight,
    borderColor: colors.powderBlue,
  },
  serviceChipText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  serviceChipTextActive: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
  },
  /* List Content */
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  inquiryCard: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  refRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xxs,
  },
  inquiryRef: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    letterSpacing: 0.2,
  },
  submitDate: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
    marginLeft: 4,
  },
  eventTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.serifBold,
    color: colors.foreground,
    letterSpacing: -0.2,
    marginTop: 2,
    marginBottom: 2,
  },
  serviceSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  /* 4-Step Process Box */
  processBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  /* Specifications Box matching Screenshot 3 */
  specsBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  specsHeaderTitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.sm,
    justifyContent: "space-between",
  },
  specCell: {
    width: "48%",
  },
  specCellLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: colors.textSubtle,
    marginBottom: 2,
  },
  specCellValue: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  /* Card Footer Actions */
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.xs,
  },
  cancelBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
  },
  cancelBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.error,
  },
  rightActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fullDetailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.surfaceAlt,
  },
  fullDetailsBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
    marginRight: 2,
  },
  viewQuoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  viewQuoteBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
});

export default InquiriesListScreen;
