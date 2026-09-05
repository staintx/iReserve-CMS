import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Sparkles,
  FileText,
  Clock,
  ChevronRight,
  ArrowUpRight,
  PlusCircle,
  MessageSquare,
  Bell,
  MapPin,
  Users,
  CreditCard,
  UtensilsCrossed,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import customerApi from "../../api/customer";
import AppButton from "../../components/common/AppButton";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import ProcessTimeline from "../../components/common/ProcessTimeline";
import NotificationBadge from "../../components/common/NotificationBadge";
import { cacheData, getCachedData, CACHE_KEYS } from "../../utils/offlineStorage";
import { formatCurrency, formatDate, formatTime } from "../../utils/format";

export const CustomerHomeScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount } = useSocket();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeBooking, setActiveBooking] = useState(null);
  const [activeInquiry, setActiveInquiry] = useState(null);
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({
    activeBookingsCount: 0,
    openInquiriesCount: 0,
    balanceDue: 0,
    messagesCount: 0,
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const [bookingsData, inquiriesData, packagesData] = await Promise.all([
        customerApi.getBookings().catch(() => null),
        customerApi.getInquiries().catch(() => null),
        customerApi.getPackages().catch(() => null),
      ]);

      let bookings = Array.isArray(bookingsData) ? bookingsData : null;
      let inquiries = Array.isArray(inquiriesData) ? inquiriesData : null;
      let packagesList = Array.isArray(packagesData) ? packagesData : null;

      // Cache fresh data locally
      if (bookings) cacheData(CACHE_KEYS.BOOKINGS, bookings);
      if (inquiries) cacheData(CACHE_KEYS.INQUIRIES, inquiries);
      if (packagesList) cacheData(CACHE_KEYS.PACKAGES, packagesList);

      // Offline fallback if fetch failed
      if (!bookings) {
        bookings = (await getCachedData(CACHE_KEYS.BOOKINGS)) || [];
      }
      if (!inquiries) {
        inquiries = (await getCachedData(CACHE_KEYS.INQUIRIES)) || [];
      }
      if (!packagesList) {
        packagesList = (await getCachedData(CACHE_KEYS.PACKAGES)) || [];
      }

      // Find upcoming or active booking
      const upcoming = bookings.find(
        (b) => !["Completed", "completed", "Cancelled", "cancelled"].includes(b.status)
      );
      setActiveBooking(upcoming || null);

      // Find active inquiry (latest pending/quotation)
      const pendingInquiry = inquiries.find(
        (i) => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status)
      );
      setActiveInquiry(pendingInquiry || null);

      // Calculate Stat Overview numbers
      const activeBookingsList = bookings.filter(
        (b) => !["Cancelled", "cancelled"].includes(b.status)
      );
      const openInquiriesList = inquiries.filter(
        (i) => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status)
      );

      // Total balance due calculation across active bookings
      const totalBalance = activeBookingsList.reduce((acc, b) => {
        const total = Number(b.total_price || b.total_amount || 0);
        const paid = Number(b.deposit_paid || b.amount_paid || 0);
        const due = total - paid;
        return acc + (due > 0 ? due : 0);
      }, 0);

      setStats({
        activeBookingsCount: activeBookingsList.length,
        openInquiriesCount: openInquiriesList.length,
        balanceDue: totalBalance,
        messagesCount: 0,
      });

      setPackages(packagesList);
    } catch (err) {
      console.warn("Failed to load customer dashboard", err);
      // Try loading from offline cache
      const [cachedB, cachedI, cachedP] = await Promise.all([
        getCachedData(CACHE_KEYS.BOOKINGS),
        getCachedData(CACHE_KEYS.INQUIRIES),
        getCachedData(CACHE_KEYS.PACKAGES),
      ]);
      if (cachedB) {
        const upcoming = cachedB.find(
          (b) => !["Completed", "completed", "Cancelled", "cancelled"].includes(b.status)
        );
        setActiveBooking(upcoming || null);
      }
      if (cachedP) setPackages(cachedP);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const firstName = user?.first_name || user?.full_name?.split(" ")[0] || "there";

  return (
    <View style={styles.container}>
      {/* Top Header with Portal Branding & Quick Icons */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brandContainer}>
          <Text style={styles.brandTitle}>CAEZELLE'S CATERING</Text>
          <Text style={styles.brandSubtitle}>CUSTOMER PORTAL</Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <Bell size={20} color={colors.foreground} />
            <NotificationBadge count={unreadCount} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerIconBtn, styles.zelleBtn]}
            onPress={() => navigation.navigate("ZelleChat")}
            activeOpacity={0.7}
          >
            <Sparkles size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}</Text>
          <Text style={styles.welcomeDesc}>
            Overview of your catering bookings, quote requests, and payments.
          </Text>
        </View>

        {/* 4 Stat Overview Cards (2x2 Grid) matching Screenshot 1 */}
        <View style={styles.statsGrid}>
          {/* Card 1: Active Bookings */}
          <Card
            style={styles.statCard}
            variant="default"
            onPress={() => navigation.navigate("BookingsList")}
          >
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>Active Bookings</Text>
              <Calendar size={18} color={colors.foregroundMuted} />
            </View>
            <Text style={styles.statValue}>{stats.activeBookingsCount}</Text>
            <Text style={styles.statSubtext} numberOfLines={1}>
              {activeBooking
                ? `Next: ${formatDate(activeBooking.event_date)}`
                : "No upcoming events"}
            </Text>
          </Card>

          {/* Card 2: Open Inquiries */}
          <Card
            style={styles.statCard}
            variant="default"
            onPress={() => navigation.navigate("InquiriesList")}
          >
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>Open Inquiries</Text>
              <FileText size={18} color={colors.foregroundMuted} />
            </View>
            <Text style={styles.statValue}>{stats.openInquiriesCount}</Text>
            <Text style={styles.statSubtext} numberOfLines={1}>
              {stats.openInquiriesCount > 0 ? "Pending quote review" : "No open requests"}
            </Text>
          </Card>

          {/* Card 3: Balance Due */}
          <Card
            style={styles.statCard}
            variant="default"
            onPress={() => navigation.navigate("BookingsList")}
          >
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>Balance Due</Text>
              <CreditCard size={18} color={colors.foregroundMuted} />
            </View>
            <Text style={[styles.statValue, stats.balanceDue > 0 && styles.statValueDue]}>
              {formatCurrency(stats.balanceDue)}
            </Text>
            <Text style={styles.statSubtext} numberOfLines={1}>
              {stats.balanceDue > 0 ? "Pending payment" : "All accounts cleared"}
            </Text>
          </Card>

          {/* Card 4: Messages */}
          <Card
            style={styles.statCard}
            variant="default"
            onPress={() => navigation.navigate("CustomerMessages")}
          >
            <View style={styles.statTopRow}>
              <Text style={styles.statLabel}>Messages</Text>
              <MessageSquare size={18} color={colors.foregroundMuted} />
            </View>
            <Text style={styles.statValue}>{stats.messagesCount}</Text>
            <Text style={styles.statSubtext} numberOfLines={1}>
              {stats.messagesCount > 0 ? "Unread messages" : "All caught up"}
            </Text>
          </Card>
        </View>

        {/* Hero "Your Next Event" Card matching Screenshot 1 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Next Event</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("BookingsList")}
              style={styles.linkRow}
            >
              <Text style={styles.sectionLink}>All bookings</Text>
              <ChevronRight size={15} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <SkeletonLoader height={220} borderRadius={radius.lg} />
          ) : activeBooking ? (
            <Card
              style={styles.eventHeroCard}
              onPress={() => navigation.navigate("BookingDetail", { id: activeBooking._id })}
            >
              {/* Event Title & Confirmed Badge */}
              <View style={styles.eventHeroHeader}>
                <Text style={styles.eventHeroTitle} numberOfLines={2}>
                  {activeBooking.event_name ||
                    `${activeBooking.customer_name || user?.full_name || "Special Offer"}'s ${
                      activeBooking.event_type || "Catering"
                    }`}
                </Text>
                <StatusBadge status={activeBooking.status || "Confirmed & Reserved"} />
              </View>

              {/* 2x3 Specification Grid matching Screenshot 1 */}
              <View style={styles.specsGrid}>
                {/* Col 1 */}
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Date & Time</Text>
                  <Text style={styles.specValue}>
                    {formatDate(activeBooking.event_date)} •{" "}
                    {formatTime(activeBooking.start_time)}
                  </Text>
                </View>

                {/* Col 2 */}
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Location</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {activeBooking.municipality ||
                      activeBooking.venue_type ||
                      activeBooking.venue_address ||
                      "Batangas"}
                  </Text>
                </View>

                {/* Col 3 */}
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Service</Text>
                  <Text style={styles.specValue} numberOfLines={1}>
                    {activeBooking.service_type || "Food and Event Setup"}
                  </Text>
                </View>

                {/* Col 4 */}
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Guests</Text>
                  <Text style={styles.specValue}>
                    {activeBooking.guest_count || 50} guests
                  </Text>
                </View>

                {/* Col 5 */}
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Reference</Text>
                  <Text style={styles.specValue}>
                    {activeBooking.reference ||
                      `CAZ-${String(activeBooking._id).slice(-6).toUpperCase()}`}
                  </Text>
                </View>

                {/* Col 6 */}
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Total Cost</Text>
                  <Text style={[styles.specValue, styles.specCost]}>
                    {formatCurrency(activeBooking.total_price || 0)}
                  </Text>
                </View>
              </View>

              {/* Action Button: View Event Workspace */}
              <AppButton
                title="View event workspace"
                onPress={() => navigation.navigate("BookingDetail", { id: activeBooking._id })}
                icon={ChevronRight}
                size="md"
                style={styles.workspaceButton}
              />
            </Card>
          ) : activeInquiry ? (
            /* If no confirmed booking yet, show latest inquiry with Process Timeline */
            <Card
              style={styles.eventHeroCard}
              onPress={() =>
                navigation.navigate("QuotationDetail", { inquiryId: activeInquiry._id })
              }
            >
              <View style={styles.eventHeroHeader}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.inquiryRefBadge}>
                    {activeInquiry.reference ||
                      `INQ-${String(activeInquiry._id).slice(-6).toUpperCase()}`}
                  </Text>
                  <Text style={styles.eventHeroTitle} numberOfLines={2}>
                    {activeInquiry.event_name ||
                      `${activeInquiry.celebrant_name || "Special"}'s ${
                        activeInquiry.event_type || "Catering Inquiry"
                      }`}
                  </Text>
                </View>
                <StatusBadge status={activeInquiry.status} />
              </View>

              {/* 4-Step Process Timeline */}
              <ProcessTimeline
                status={activeInquiry.status}
                style={{ marginVertical: spacing.sm }}
              />

              <View style={styles.specsGrid}>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Event Date</Text>
                  <Text style={styles.specValue}>
                    {formatDate(activeInquiry.event_date)}
                  </Text>
                </View>
                <View style={styles.specItem}>
                  <Text style={styles.specLabel}>Service Type</Text>
                  <Text style={styles.specValue}>
                    {activeInquiry.service_type || "Event Catering"}
                  </Text>
                </View>
              </View>

              <AppButton
                title="View Inquiry Details"
                onPress={() =>
                  navigation.navigate("QuotationDetail", { inquiryId: activeInquiry._id })
                }
                icon={ChevronRight}
                size="md"
                style={styles.workspaceButton}
              />
            </Card>
          ) : (
            /* Empty banner to get started */
            <Card style={styles.emptyHeroCard} variant="flat">
              <Sparkles size={28} color={colors.primary} style={{ marginBottom: spacing.sm }} />
              <Text style={styles.emptyHeroTitle}>Ready to plan your next event?</Text>
              <Text style={styles.emptyHeroDesc}>
                Submit an inquiry or explore curated packages for banquets, weddings, and parties.
              </Text>
              <AppButton
                title="Start Event Quote"
                onPress={() => navigation.navigate("InquiryWizard")}
                icon={PlusCircle}
                size="md"
                style={{ marginTop: spacing.md }}
              />
            </Card>
          )}
        </View>

        {/* Quick Action Cards matching Screenshot 1 */}
        <View style={styles.section}>
          <View style={styles.quickGrid}>
            {/* Action 1: Custom Event Quote */}
            <Card
              style={styles.quickCard}
              onPress={() => navigation.navigate("InquiryWizard")}
            >
              <View style={styles.quickCardTop}>
                <Text style={styles.quickCardTitle}>Custom Event Quote</Text>
                <ArrowUpRight size={18} color={colors.primary} />
              </View>
              <Text style={styles.quickCardDesc}>
                Customize catering menu, guest count, and event setup details.
              </Text>
            </Card>

            {/* Action 2: Browse Menu Packages */}
            <Card
              style={styles.quickCard}
              onPress={() => navigation.navigate("Packages")}
            >
              <View style={styles.quickCardTop}>
                <Text style={styles.quickCardTitle}>Browse Menu Packages</Text>
                <ArrowUpRight size={18} color={colors.primary} />
              </View>
              <Text style={styles.quickCardDesc}>
                Explore curated all-inclusive packages and dishes.
              </Text>
            </Card>
          </View>
        </View>

        {/* Featured Packages Carousel */}
        {packages.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Packages</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Packages")}>
                <Text style={styles.sectionLink}>View all</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.packagesScroll}
            >
              {packages.slice(0, 5).map((pkg) => (
                <Card
                  key={pkg._id}
                  style={styles.packageCard}
                  onPress={() => navigation.navigate("PackageDetail", { id: pkg._id })}
                >
                  <View style={styles.packageCardBody}>
                    <Text style={styles.packageName} numberOfLines={1}>
                      {pkg.name}
                    </Text>
                    <Text style={styles.packageType} numberOfLines={1}>
                      {pkg.package_type || "Banquet & Setup"}
                    </Text>
                    <Text style={styles.packagePrice}>
                      {pkg.price_per_guest
                        ? `${formatCurrency(pkg.price_per_guest)} / pax`
                        : formatCurrency(pkg.setup_price || pkg.price || 0)}
                    </Text>
                    <Text style={styles.packageDesc} numberOfLines={2}>
                      {pkg.description ||
                        "Curated dishes, linens, table arrangements, and professional staffing."}
                    </Text>
                  </View>
                </Card>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  brandContainer: {},
  brandTitle: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "800",
    color: colors.foreground,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.medium,
    color: colors.accentDark,
    letterSpacing: 0.5,
    marginTop: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  zelleBtn: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.powderBlue,
  },
  scrollContent: {
    paddingTop: spacing.base,
    paddingHorizontal: spacing.lg,
  },
  welcomeSection: {
    marginBottom: spacing.lg,
  },
  welcomeTitle: {
    fontSize: 26,
    fontFamily: typography.fontFamilies.serifBold,
    color: colors.foreground,
    letterSpacing: -0.5,
    marginBottom: spacing.xxs,
  },
  welcomeDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 20,
  },
  /* 4 Stat Overview Grid (2x2) */
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    width: "48.5%",
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  statTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
  },
  statValue: {
    fontSize: 22,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  statValueDue: {
    color: colors.foreground,
  },
  statSubtext: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.textSubtle,
  },
  /* Sections */
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    letterSpacing: -0.2,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionLink: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.primary,
  },
  /* Hero "Your Next Event" Card */
  eventHeroCard: {
    padding: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
  },
  eventHeroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  eventHeroTitle: {
    fontSize: 20,
    fontFamily: typography.fontFamilies.serifBold,
    color: colors.foreground,
    flex: 1,
    paddingRight: spacing.sm,
    letterSpacing: -0.3,
  },
  inquiryRefBadge: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.semiBold,
    color: colors.foregroundMuted,
    marginBottom: 2,
  },
  specsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    rowGap: spacing.md,
  },
  specItem: {
    width: "48%",
  },
  specLabel: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  specValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "600",
    color: colors.foreground,
  },
  specCost: {
    color: colors.primary,
    fontFamily: typography.fontFamilies.bold,
  },
  workspaceButton: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
  },
  emptyHeroCard: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyHeroTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  emptyHeroDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  /* Quick Action Cards */
  quickGrid: {
    gap: spacing.md,
  },
  quickCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  quickCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  quickCardTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  quickCardDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 18,
  },
  /* Packages Carousel */
  packagesScroll: {
    paddingRight: spacing.lg,
    gap: spacing.md,
  },
  packageCard: {
    width: 240,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
  },
  packageCardBody: {
    padding: spacing.base,
  },
  packageName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 2,
  },
  packageType: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.medium,
    color: colors.accentDark,
    marginBottom: spacing.xs,
  },
  packagePrice: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  packageDesc: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    lineHeight: 16,
  },
});

export default CustomerHomeScreen;
