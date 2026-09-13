import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  CalendarCheck,
  FileText,
  CreditCard,
  MessageSquare,
  Sparkles,
  Utensils,
  ChevronRight,
  ArrowRight,
  Clock,
  MapPin,
  Users,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  ChevronLeft,
  CalendarClock,
  Eye,
  ShieldCheck,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import customerApi from "../../api/customer";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import AppButton from "../../components/common/AppButton";
import useRealTimeRefresh from "../../utils/useRealTimeRefresh";
import { formatCurrency, formatDate, formatShortDate, formatTime } from "../../utils/format";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const recordTitle = (record) => {
  if (!record) return "Catering Reservation";
  if (record.celebrant_name) {
    return `${record.celebrant_name}'s ${record.event_type || "Celebration"}`;
  }
  return (
    record.event_type ||
    record.package_name_snapshot ||
    record.package_name ||
    "Catering Reservation"
  );
};

const resolveServiceType = (record) => {
  if (!record) return "Full-Service Catering";
  if (record.service_type) return record.service_type;
  if (record.include_food && record.selected_scaffold_option_id) return "Food & Event Setup";
  if (record.include_food) return "Food Only";
  return "Event Setup Only";
};

export const CustomerDashboardScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { unreadCount: socketUnread } = useSocket();

  const [inquiries, setInquiries] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const firstName = useMemo(() => {
    if (user?.first_name) return user.first_name;
    if (user?.full_name) return user.full_name.split(" ")[0];
    return "Customer";
  }, [user]);

  const loadData = useCallback(async () => {
    try {
      const [inqRes, bookRes, payRes] = await Promise.all([
        customerApi.getInquiries().catch(() => []),
        customerApi.getBookings().catch(() => []),
        customerApi.getPayments().catch(() => []),
      ]);

      setInquiries(Array.isArray(inqRes) ? inqRes : inqRes?.data || []);
      setBookings(Array.isArray(bookRes) ? bookRes : bookRes?.data || []);
      setPayments(Array.isArray(payRes) ? payRes : payRes?.data || []);
    } catch (err) {
      console.warn("Failed to load customer dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealTimeRefresh(loadData);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const now = useMemo(() => new Date(), []);

  // 1. Telemetry Calculations
  const activeBookings = useMemo(() => {
    return bookings.filter(
      (b) => !["cancelled", "completed"].includes(String(b.status).toLowerCase())
    );
  }, [bookings]);

  const activeInquiries = useMemo(() => {
    return inquiries.filter(
      (i) => !["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status)
    );
  }, [inquiries]);

  const upcomingEvents = useMemo(() => {
    return bookings.filter(
      (b) =>
        ["confirmed", "preparing", "ongoing"].includes(String(b.status).toLowerCase()) &&
        new Date(b.event_date) >= now
    );
  }, [bookings, now]);

  const totalBalanceDue = useMemo(() => {
    return bookings.reduce((sum, b) => {
      if (["cancelled"].includes(String(b.status).toLowerCase())) return sum;
      const total = Number(b.total_price || 0);
      const paid = payments
        .filter(
          (p) =>
            String(p.booking_id?._id || p.booking_id) === String(b._id) &&
            p.status === "approved"
        )
        .reduce((pSum, p) => pSum + (Number(p.amount) || 0), 0);
      return sum + Math.max(0, total - paid);
    }, 0);
  }, [bookings, payments]);

  // 2. Action Required Items (Quotes sent or pending deposit)
  const actionRequiredItems = useMemo(() => {
    const quoteSentInquiries = inquiries
      .filter((i) => i.status === "Quotation Sent")
      .map((i) => ({
        type: "inquiry",
        id: i._id,
        title: recordTitle(i),
        date: i.event_date,
        startTime: i.start_time,
        status: "Quotation Sent",
        description: "Official quotation ready for your review and approval.",
        actionText: "Review Quote",
        onAction: () => navigation.navigate("InquiriesList"),
      }));

    const depositNeededBookings = bookings
      .filter(
        (b) =>
          String(b.status).toLowerCase() === "pending deposit" ||
          String(b.status).toLowerCase() === "customer_accepted"
      )
      .map((b) => ({
        type: "booking",
        id: b._id,
        title: recordTitle(b),
        date: b.event_date,
        startTime: b.start_time,
        status: "Deposit Required",
        description: "Secure and lock your event date by submitting your deposit.",
        actionText: "Pay Deposit",
        isPayment: true,
        onAction: () => navigation.navigate("PaymentCheckout", { bookingId: b._id }),
      }));

    return [...quoteSentInquiries, ...depositNeededBookings];
  }, [inquiries, bookings, navigation]);

  // 3. Next Upcoming Event Hero
  const nextEvent = useMemo(() => {
    if (upcomingEvents.length > 0) return upcomingEvents[0];
    return bookings.find(
      (b) => String(b.status).toLowerCase() === "confirmed"
    );
  }, [upcomingEvents, bookings]);

  // 4. Upcoming Schedule Milestones
  const scheduleMilestones = useMemo(() => {
    const list = [];

    // Add upcoming bookings
    bookings.forEach((b) => {
      const statusLower = String(b.status).toLowerCase();
      if (statusLower === "cancelled") return;
      list.push({
        id: `book-${b._id}`,
        type: "booking",
        date: b.event_date,
        time: b.start_time,
        title: recordTitle(b),
        subtitle: b.package_name || resolveServiceType(b),
        venue: b.municipality || b.venue_type || "Batangas Venue",
        status: b.status,
        onPress: () => navigation.navigate("BookingDetail", { id: b._id }),
      });
    });

    // Add active inquiries
    inquiries.forEach((i) => {
      if (["Converted to Booking", "Cancelled", "Quote Rejected"].includes(i.status)) return;
      list.push({
        id: `inq-${i._id}`,
        type: "inquiry",
        date: i.event_date,
        time: i.start_time,
        title: recordTitle(i),
        subtitle: i.package_name_snapshot || resolveServiceType(i),
        venue: i.municipality || i.venue_type || "Batangas Location",
        status: i.status,
        onPress: () => navigation.navigate("InquiriesList"),
      });
    });

    // Sort by event_date ascending
    return list.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);
  }, [bookings, inquiries, navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />

      {/* Royal Blue Top Bar Header */}
      <View
        style={[
          styles.headerBanner,
          { paddingTop: insets.top + (Platform.OS === "ios" ? 10 : 16) },
        ]}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ChevronLeft size={24} color={colors.white} />
          </TouchableOpacity>

          <View style={styles.brandTitleWrap}>
            <View style={styles.goldBrandDot} />
            <Text style={styles.headerBrandText}>Customer Dashboard</Text>
          </View>

          <View style={{ width: 36 }} />
        </View>

        {/* Welcome Text in Banner */}
        <View style={styles.welcomeWrap}>
          <Text style={styles.welcomeTitle}>Welcome back, {firstName}!</Text>
          <Text style={styles.welcomeSubtitle}>
            Live overview of your catering reservations, quote requests & payments.
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <SkeletonLoader width="100%" height={160} style={{ borderRadius: radius.xl, marginBottom: spacing.md }} />
            <View style={styles.metricsGrid}>
              <SkeletonLoader width="48%" height={90} style={{ borderRadius: radius.lg }} />
              <SkeletonLoader width="48%" height={90} style={{ borderRadius: radius.lg }} />
              <SkeletonLoader width="48%" height={90} style={{ borderRadius: radius.lg, marginTop: spacing.md }} />
              <SkeletonLoader width="48%" height={90} style={{ borderRadius: radius.lg, marginTop: spacing.md }} />
            </View>
          </View>
        ) : (
          <>
            {/* 1. Telemetry Metrics 2x2 Grid */}
            <View style={styles.metricsGrid}>
              {/* Tile 1: Active Bookings */}
              <TouchableOpacity
                style={styles.statTile}
                onPress={() => navigation.navigate("BookingsList")}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
                  <CalendarCheck size={18} color={colors.primary} />
                </View>
                <Text style={styles.statNumber}>{activeBookings.length}</Text>
                <Text style={styles.statLabel}>Active Bookings</Text>
                <Text style={styles.statHint} numberOfLines={1}>
                  {upcomingEvents.length > 0 ? `${upcomingEvents.length} upcoming` : "All on schedule"}
                </Text>
              </TouchableOpacity>

              {/* Tile 2: Open Inquiries */}
              <TouchableOpacity
                style={styles.statTile}
                onPress={() => navigation.navigate("InquiriesList")}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.warningLight }]}>
                  <FileText size={18} color={colors.warning} />
                </View>
                <Text style={styles.statNumber}>{activeInquiries.length}</Text>
                <Text style={styles.statLabel}>Open Inquiries</Text>
                <Text style={styles.statHint} numberOfLines={1}>
                  {activeInquiries.length > 0 ? "In review / quoted" : "All converted"}
                </Text>
              </TouchableOpacity>

              {/* Tile 3: Balance Due */}
              <TouchableOpacity
                style={styles.statTile}
                onPress={() => navigation.navigate("BookingsList")}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.successLight }]}>
                  <CreditCard size={18} color={colors.success} />
                </View>
                <Text style={[styles.statNumber, { fontSize: typography.sizes.sm }]} numberOfLines={1}>
                  {formatCurrency(totalBalanceDue)}
                </Text>
                <Text style={styles.statLabel}>Balance Due</Text>
                <Text style={styles.statHint} numberOfLines={1}>
                  {totalBalanceDue > 0 ? "Pending payment" : "All settled"}
                </Text>
              </TouchableOpacity>

              {/* Tile 4: Inbox Messages */}
              <TouchableOpacity
                style={styles.statTile}
                onPress={() => navigation.navigate("CustomerMessages")}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconWrap, { backgroundColor: colors.accentLight }]}>
                  <MessageSquare size={18} color={colors.accentDark} />
                </View>
                <Text style={styles.statNumber}>{socketUnread || 0}</Text>
                <Text style={styles.statLabel}>Messages</Text>
                <Text style={styles.statHint} numberOfLines={1}>
                  {socketUnread > 0 ? `${socketUnread} unread` : "All caught up"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Needs Your Attention (Action Required) */}
            {actionRequiredItems.length > 0 && (
              <View style={styles.attentionSection}>
                <View style={styles.sectionHeaderRow}>
                  <AlertCircle size={18} color={colors.warning} />
                  <Text style={styles.attentionSectionTitle}>
                    Needs Your Attention ({actionRequiredItems.length})
                  </Text>
                </View>

                {actionRequiredItems.map((item) => (
                  <Card key={item.id} style={styles.attentionCard}>
                    <View style={styles.attentionCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.attentionTitle}>{item.title}</Text>
                        <Text style={styles.attentionDateTime}>
                          {formatDate(item.date)} {item.startTime ? `at ${formatTime(item.startTime)}` : ""}
                        </Text>
                        <Text style={styles.attentionDesc}>{item.description}</Text>
                      </View>
                      <StatusBadge status={item.status} size="sm" />
                    </View>

                    <AppButton
                      title={item.actionText}
                      size="sm"
                      variant={item.isPayment ? "primary" : "outline"}
                      onPress={item.onAction}
                      style={styles.attentionBtn}
                    />
                  </Card>
                ))}
              </View>
            )}

            {/* 3. Your Next Event Section */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <CalendarClock size={18} color={colors.primary} />
                <Text style={styles.sectionTitle}>Your Next Event</Text>
              </View>

              {nextEvent ? (
                <Card style={styles.nextEventCard}>
                  <View style={styles.nextEventTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.nextEventHeading}>{recordTitle(nextEvent)}</Text>
                      <Text style={styles.nextEventSub}>
                        {nextEvent.package_name || resolveServiceType(nextEvent)}
                      </Text>
                    </View>
                    <StatusBadge status={nextEvent.status} />
                  </View>

                  {/* Detail Grid */}
                  <View style={styles.eventDetailsGrid}>
                    <View style={styles.eventDetailRow}>
                      <Calendar size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.eventDetailText}>
                        {formatDate(nextEvent.event_date)} {nextEvent.start_time ? `· ${formatTime(nextEvent.start_time)}` : ""}
                      </Text>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <MapPin size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.eventDetailText} numberOfLines={1}>
                        {nextEvent.municipality || nextEvent.venue_type || "Batangas Location"}
                      </Text>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <Users size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.eventDetailText}>
                        {nextEvent.guest_count ? `${nextEvent.guest_count} Guests` : "Guest count set"}
                      </Text>
                    </View>

                    <View style={styles.eventDetailRow}>
                      <CreditCard size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.eventDetailText}>
                        Total: {formatCurrency(nextEvent.total_price)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.workspaceBtn}
                    onPress={() => navigation.navigate("BookingDetail", { id: nextEvent._id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.workspaceBtnText}>View Event Workspace</Text>
                    <ChevronRight size={16} color={colors.white} />
                  </TouchableOpacity>
                </Card>
              ) : (
                <Card style={styles.emptyNextEventCard}>
                  <CalendarClock size={32} color={colors.textDisabled} />
                  <Text style={styles.emptyNextEventTitle}>No upcoming events scheduled</Text>
                  <Text style={styles.emptyNextEventSub}>
                    Your confirmed celebration preparations and details will appear here.
                  </Text>
                  <AppButton
                    title="Plan An Event"
                    size="sm"
                    onPress={() => navigation.navigate("InquiryWizard")}
                    style={{ marginTop: spacing.md }}
                  />
                </Card>
              )}
            </View>

            {/* 4. Two Stacked Action Cards */}
            <View style={styles.actionsSection}>
              {/* Card 1: Custom Event Quote */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate("InquiryWizard")}
                activeOpacity={0.75}
              >
                <View style={styles.actionCardLeft}>
                  <View style={[styles.actionIconWrap, { backgroundColor: "#FEF3C7" }]}>
                    <Sparkles size={22} color="#D97706" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionCardTitle}>Custom Event Quote</Text>
                    <Text style={styles.actionCardDesc}>
                      Customize your catering menu, guest count, and styling details.
                    </Text>
                  </View>
                </View>
                <View style={styles.actionCardBottom}>
                  <Text style={styles.actionCardLinkText}>Request a Quote</Text>
                  <ArrowRight size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Card 2: Browse Menu Packages */}
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => navigation.navigate("Packages")}
                activeOpacity={0.75}
              >
                <View style={styles.actionCardLeft}>
                  <View style={[styles.actionIconWrap, { backgroundColor: colors.primaryLight }]}>
                    <Utensils size={22} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actionCardTitle}>Browse Menu Packages</Text>
                    <Text style={styles.actionCardDesc}>
                      Explore curated all-inclusive packages, special offers, and dishes.
                    </Text>
                  </View>
                </View>
                <View style={styles.actionCardBottom}>
                  <Text style={styles.actionCardLinkText}>Explore Packages</Text>
                  <ArrowRight size={14} color={colors.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* 5. Upcoming Event Schedule / Milestones */}
            {scheduleMilestones.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Calendar size={18} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Event Schedule & Activity</Text>
                </View>

                <View style={styles.timelineList}>
                  {scheduleMilestones.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.timelineItem}
                      onPress={item.onPress}
                      activeOpacity={0.7}
                    >
                      <View style={styles.timelineDateBadge}>
                        <Text style={styles.timelineMonth}>
                          {formatShortDate(item.date).split(" ")[0]}
                        </Text>
                        <Text style={styles.timelineDay}>
                          {formatShortDate(item.date).split(" ")[1] || ""}
                        </Text>
                      </View>

                      <View style={styles.timelineInfo}>
                        <View style={styles.timelineTitleRow}>
                          <Text style={styles.timelineTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <StatusBadge status={item.status} size="sm" />
                        </View>
                        <Text style={styles.timelineSub} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                        <View style={styles.timelineVenueRow}>
                          <MapPin size={11} color={colors.foregroundMuted} style={{ marginRight: 4 }} />
                          <Text style={styles.timelineVenueText} numberOfLines={1}>
                            {item.venue}
                          </Text>
                        </View>
                      </View>

                      <ChevronRight size={16} color={colors.textDisabled} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </>
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
  headerBanner: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  goldBrandDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentGold,
    marginRight: 6,
  },
  headerBrandText: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.white,
    letterSpacing: 0.3,
  },
  welcomeWrap: {
    marginTop: spacing.xs,
  },
  welcomeTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: "800",
    color: colors.white,
  },
  welcomeSubtitle: {
    fontSize: typography.sizes.xs,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    lineHeight: 18,
  },
  scrollContent: {
    padding: spacing.base,
  },
  loadingWrap: {
    paddingVertical: spacing.md,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statTile: {
    width: "48%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.xs,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statNumber: {
    fontSize: typography.sizes.lg,
    fontWeight: "800",
    color: colors.foreground,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  statHint: {
    fontSize: 10,
    color: colors.textSubtle,
    marginTop: 2,
  },
  attentionSection: {
    marginBottom: spacing.lg,
  },
  attentionSectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.warningDark,
    marginLeft: 6,
  },
  attentionCard: {
    marginTop: spacing.sm,
    backgroundColor: "#FFFDF5",
    borderColor: colors.warningBorder,
    borderWidth: 1.5,
  },
  attentionCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  attentionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  attentionDateTime: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  attentionDesc: {
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 4,
    lineHeight: 16,
  },
  attentionBtn: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  sectionWrap: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginLeft: 6,
  },
  nextEventCard: {
    backgroundColor: colors.white,
    borderColor: colors.primaryBorder,
    borderWidth: 1.5,
    borderRadius: radius.xl,
    padding: spacing.base,
    ...shadows.sm,
  },
  nextEventTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  nextEventHeading: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.foreground,
  },
  nextEventSub: {
    fontSize: typography.sizes.xs,
    color: colors.primary,
    fontWeight: "600",
    marginTop: 2,
  },
  eventDetailsGrid: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  eventDetailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventDetailText: {
    fontSize: typography.sizes.xs,
    color: colors.foreground,
    fontWeight: "500",
    flex: 1,
  },
  workspaceBtn: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    gap: 6,
  },
  workspaceBtnText: {
    color: colors.white,
    fontSize: typography.sizes.xs,
    fontWeight: "700",
  },
  emptyNextEventCard: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
  },
  emptyNextEventTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptyNextEventSub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    textAlign: "center",
    marginTop: 4,
  },
  actionsSection: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  actionCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    ...shadows.xs,
  },
  actionCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionCardTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  actionCardDesc: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  actionCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm + 2,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  actionCardLinkText: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.primary,
  },
  timelineList: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: "hidden",
    ...shadows.xs,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  timelineDateBadge: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  timelineMonth: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.primary,
    textTransform: "uppercase",
  },
  timelineDay: {
    fontSize: typography.sizes.base,
    fontWeight: "800",
    color: colors.primary,
    marginTop: -2,
  },
  timelineInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  timelineTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  timelineTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
  },
  timelineSub: {
    fontSize: 11,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  timelineVenueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  timelineVenueText: {
    fontSize: 10,
    color: colors.textSubtle,
  },
});

export default CustomerDashboardScreen;
