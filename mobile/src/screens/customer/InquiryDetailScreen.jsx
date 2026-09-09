import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Utensils,
  Sparkles,
  CheckCircle2,
  MessageSquare,
  ChevronRight,
  FileText,
  ShieldCheck,
  Layers,
  AlertCircle,
  Package,
  Check,
  ChevronLeft,
} from "lucide-react-native";
import { colors, radius, spacing, typography, shadows } from "../../constants/theme";
import customerApi from "../../api/customer";
import messagesApi from "../../api/messages";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import StatusBadge from "../../components/common/StatusBadge";
import ProcessTimeline from "../../components/common/ProcessTimeline";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import { formatDate, formatTime } from "../../utils/format";

import useRealTimeRefresh from "../../utils/useRealTimeRefresh";

export const InquiryDetailScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { inquiryId, isNewSubmission = false } = route.params || {};

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadInquiry = async () => {
    if (!inquiryId) {
      setError("Inquiry identifier is missing.");
      setLoading(false);
      return;
    }
    setError("");
    try {
      const data = await customerApi.getInquiryById(inquiryId);
      setInquiry(data);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load inquiry details. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInquiry();
  }, [inquiryId]);

  useRealTimeRefresh(loadInquiry);

  const onRefresh = () => {
    setRefreshing(true);
    loadInquiry();
  };

  const handleOpenChat = async () => {
    if (!inquiry) return;
    setChatLoading(true);
    try {
      const convList = await messagesApi.listConversations();
      const existing = Array.isArray(convList)
        ? convList.find((c) => {
            const inq = c.inquiry_id?._id || c.inquiry_id;
            return String(inq) === String(inquiry._id);
          })
        : null;

      if (existing) {
        navigation.navigate("CustomerChatThread", {
          conversationId: existing._id,
          title: inquiry.event_type
            ? `Inquiry: ${inquiry.event_type}`
            : "Caezelle's Event Support",
          conversation: existing,
        });
      } else {
        Alert.alert(
          "Chat with Banquet Team",
          "You can connect directly with our banquet manager regarding this inquiry.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Messages",
              onPress: () =>
                navigation.navigate("CustomerMessages", { initialTab: "messages" }),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        "Direct Support",
        "Please visit the Messages tab to start a conversation with our banquet team."
      );
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header
          title={isNewSubmission ? "Inquiry Confirmation" : "Inquiry Details"}
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("InquiriesList");
            }
          }}
        />
        <LoadingState message="Loading your event details..." />
      </View>
    );
  }

  if (error || !inquiry) {
    return (
      <View style={styles.container}>
        <Header
          title="Inquiry Details"
          onBack={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate("InquiriesList");
            }
          }}
        />
        <ErrorState
          message={error || "Inquiry record could not be found."}
          onRetry={loadInquiry}
        />
      </View>
    );
  }

  const isQuoteReady =
    Boolean(inquiry.quotation_status) ||
    String(inquiry.status || "").toLowerCase().includes("quote");

  const venueAddress = [
    inquiry.street,
    inquiry.barangay,
    inquiry.municipality,
    inquiry.province,
  ]
    .filter(Boolean)
    .join(", ");

  const hasFood = inquiry.include_food !== false;
  const menuItems = Array.isArray(inquiry.selected_menu) ? inquiry.selected_menu : [];
  const serviceItems = Array.isArray(inquiry.service_items) ? inquiry.service_items : [];

  return (
    <View style={styles.container}>
      <Header
        title={isNewSubmission ? "Inquiry Confirmation" : "Inquiry Details"}
        subtitle={inquiry.reference || "Event Request"}
        showBack={true}
        onBack={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate("InquiriesList");
          }
        }}
        rightElement={
          <TouchableOpacity
            style={styles.headerChatBtn}
            onPress={handleOpenChat}
            activeOpacity={0.7}
            disabled={chatLoading}
          >
            <MessageSquare size={18} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 24) + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Celebration Banner for New Submissions */}
        {isNewSubmission && (
          <View style={styles.celebrationCard}>
            <View style={styles.celebrationIconCircle}>
              <Check size={28} color={colors.white} strokeWidth={3} />
            </View>
            <Text style={styles.celebrationTitle}>Inquiry Submitted Successfully!</Text>
            <Text style={styles.celebrationDesc}>
              Thank you! Your event request is now registered with Caezelle's Catering.
              Our banquet manager will review your date and logistics.
            </Text>
            <View style={styles.refPill}>
              <Sparkles size={13} color={colors.primary} />
              <Text style={styles.refPillText}>
                Reference Number: {inquiry.reference || "INQ"}
              </Text>
            </View>
          </View>
        )}

        {/* Status Header Card */}
        <View style={styles.docHeaderCard}>
          <View style={styles.docTopRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.brandRow}>
                <View style={styles.brandDot} />
                <Text style={styles.brandText}>Caezelle's Catering</Text>
              </View>
              <Text style={styles.inquiryTitle}>
                {inquiry.event_type || "Event Request"}
              </Text>
              {inquiry.celebrant_name ? (
                <Text style={styles.celebrantSubtitle}>
                  For {inquiry.celebrant_name}
                </Text>
              ) : null}
            </View>
            <StatusBadge status={inquiry.status} />
          </View>

          {/* Stepper Timeline */}
          <View style={styles.stepperContainer}>
            <ProcessTimeline status={inquiry.status} />
          </View>
        </View>

        {/* Pricing Policy Guarantee Notice */}
        <View style={styles.quotationNoticeCard}>
          <ShieldCheck size={22} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={styles.quotationNoticeTitle}>Official Quotation & Pricing</Text>
            <Text style={styles.quotationNoticeDesc}>
              Pricing is introduced once our banquet manager reviews your requirements and converts this inquiry into an official quotation. Your quote will specify the complete package price, total event cost, deposit amount, and remaining balance.
            </Text>
          </View>
        </View>

        {/* Quotation Ready Action Banner (when ready) */}
        {isQuoteReady && (
          <TouchableOpacity
            style={styles.quoteReadyBanner}
            onPress={() =>
              navigation.navigate("QuotationDetail", { inquiryId: inquiry._id })
            }
            activeOpacity={0.85}
          >
            <View style={styles.quoteReadyIconWrap}>
              <FileText size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1, marginHorizontal: spacing.sm }}>
              <Text style={styles.quoteReadyTitle}>Official Quotation Ready!</Text>
              <Text style={styles.quoteReadySub}>
                Tap to view itemized pricing, deposit requirements, and reserve your date.
              </Text>
            </View>
            <ChevronRight size={18} color={colors.white} />
          </TouchableOpacity>
        )}

        {/* Event Schedule & Logistics Overview */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Event Information</Text>
          <View style={styles.cardBox}>
            <View style={styles.gridRow}>
              <View style={styles.gridItem}>
                <View style={styles.gridIconWrap}>
                  <Calendar size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gridItemLabel}>Event Date & Time</Text>
                  <Text style={styles.gridItemValue}>
                    {formatDate(inquiry.event_date)}
                  </Text>
                  <Text style={styles.gridItemSub}>
                    {formatTime(inquiry.start_time)} • {inquiry.duration_hours || 4} Hours
                  </Text>
                </View>
              </View>

              <View style={styles.gridItem}>
                <View style={styles.gridIconWrap}>
                  <Users size={15} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gridItemLabel}>Guest Count & Scope</Text>
                  <Text style={styles.gridItemValue}>
                    {inquiry.guest_count || 50} Guests
                  </Text>
                  <Text style={styles.gridItemSub}>
                    {inquiry.service_type || "Food and Event Setup"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.gridDivider} />

            <View style={styles.venueRow}>
              <View style={styles.gridIconWrap}>
                <MapPin size={15} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.gridItemLabel}>Venue & Location</Text>
                <Text style={styles.gridItemValue}>
                  {venueAddress || inquiry.municipality || "Batangas Location"}
                </Text>
                <Text style={styles.gridItemSub}>
                  {inquiry.venue_type || "Private Venue"} • Delivery: {inquiry.delivery_method || "Setup Service"}
                </Text>
                {inquiry.landmark ? (
                  <Text style={styles.landmarkText}>Landmark: {inquiry.landmark}</Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>

        {/* Catering & Menu Selections */}
        {hasFood && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Catering & Menu Selections</Text>
            <View style={styles.cardBox}>
              <View style={styles.packageBannerRow}>
                <Package size={16} color={colors.primary} />
                <Text style={styles.packageNameText}>
                  {inquiry.package_name_snapshot || inquiry.package_name || "Custom Catering Selection"}
                </Text>
              </View>

              {menuItems.length > 0 ? (
                menuItems.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.menuRow,
                      idx === menuItems.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={styles.menuCourseBadge}>
                      <Utensils size={13} color={colors.secondary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuItemName}>{item.name || item.item_name}</Text>
                      <Text style={styles.menuItemCategory}>
                        {item.category || item.menu_category || "Course"}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyItemsNotice}>
                  <Text style={styles.emptyItemsText}>
                    Dishes and culinary inclusions will be confirmed on your official quotation.
                  </Text>
                </View>
              )}

              {/* Dietary & Culinary Notes */}
              {(inquiry.allergies || inquiry.special_requests) && (
                <View style={styles.dietaryNotesBox}>
                  {inquiry.allergies ? (
                    <Text style={styles.dietaryNoteText}>
                      <Text style={{ fontWeight: "700" }}>Allergies / Dietary: </Text>
                      {inquiry.allergies}
                    </Text>
                  ) : null}
                  {inquiry.special_requests ? (
                    <Text style={[styles.dietaryNoteText, { marginTop: 4 }]}>
                      <Text style={{ fontWeight: "700" }}>Special Requests: </Text>
                      {inquiry.special_requests}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Setup & Add-ons (if any) */}
        {(serviceItems.length > 0 || inquiry.selected_scaffold_option_id) && (
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionHeading}>Event Setup & Equipment Add-ons</Text>
            <View style={styles.cardBox}>
              {inquiry.scaffold_width && inquiry.scaffold_length ? (
                <View style={styles.addonLine}>
                  <Layers size={15} color={colors.primary} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addonTitle}>
                      Event Space Canopy ({inquiry.scaffold_width}ft × {inquiry.scaffold_length}ft)
                    </Text>
                    <Text style={styles.addonSub}>Heavy duty galvanized truss setup</Text>
                  </View>
                </View>
              ) : null}

              {serviceItems.map((addon, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.addonLine,
                    idx === serviceItems.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addonTitle}>
                      {addon.name}
                      <Text style={styles.addonQty}> (×{addon.quantity || 1})</Text>
                    </Text>
                    {addon.description ? (
                      <Text style={styles.addonSub}>{addon.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Banquet Team Direct Chat Card */}
        <TouchableOpacity
          style={styles.chatHelperCard}
          onPress={handleOpenChat}
          activeOpacity={0.8}
        >
          <View style={styles.chatHelperIconWrap}>
            <MessageSquare size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.chatHelperTitle}>Questions about your event?</Text>
            <Text style={styles.chatHelperSubtitle}>
              Message our banquet manager directly regarding schedules, guest changes, or special requests.
            </Text>
          </View>
          <ChevronRight size={16} color={colors.foregroundMuted} />
        </TouchableOpacity>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={styles.allInquiriesBtn}
            onPress={() => navigation.navigate("InquiriesList")}
            activeOpacity={0.8}
          >
            <FileText size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.allInquiriesBtnText}>View All My Inquiries</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerChatBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.base,
  },

  // Celebration Card for New Submissions
  celebrationCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    marginBottom: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.md,
  },
  celebrationIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  celebrationTitle: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
    textAlign: "center",
    marginBottom: spacing.xs,
  },
  celebrationDesc: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.md,
    maxWidth: 320,
  },
  refPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  refPillText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
  },

  // Document Header Card
  docHeaderCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  docTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  brandDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.primary,
  },
  brandText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inquiryTitle: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.fontFamilies.extraBold,
    color: colors.foreground,
    letterSpacing: -0.3,
  },
  celebrantSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  stepperContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.md,
  },

  // Quotation Policy Notice Card
  quotationNoticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    marginBottom: spacing.base,
  },
  quotationNoticeTitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primaryDark,
    marginBottom: 2,
  },
  quotationNoticeDesc: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    lineHeight: 18,
  },

  // Quote Ready Banner
  quoteReadyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadows.md,
  },
  quoteReadyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  quoteReadyTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    color: colors.white,
  },
  quoteReadySub: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.powderBlue,
    marginTop: 2,
  },

  // Sections & Card Box
  sectionContainer: {
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: spacing.xs + 2,
    marginLeft: spacing.xs,
  },
  cardBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    ...shadows.sm,
  },

  // Event Grid
  gridRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  gridIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  gridItemLabel: {
    fontSize: 10,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gridItemValue: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
    marginTop: 2,
  },
  gridItemSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  gridDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: spacing.md,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  landmarkText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.primary,
    marginTop: 2,
  },

  // Catering & Menu
  packageBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  packageNameText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  menuCourseBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.secondaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemName: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
  },
  menuItemCategory: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
  },
  emptyItemsNotice: {
    paddingVertical: spacing.sm,
  },
  emptyItemsText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    fontStyle: "italic",
  },
  dietaryNotesBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  dietaryNoteText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    lineHeight: 18,
  },

  // Setup & Add-ons
  addonLine: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  addonTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  addonQty: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.regular,
    color: colors.primary,
  },
  addonSub: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
  },

  // Chat helper card
  chatHelperCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.base,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.base,
    ...shadows.sm,
  },
  chatHelperIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  chatHelperTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foreground,
  },
  chatHelperSubtitle: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    marginTop: 2,
    lineHeight: 16,
  },

  // Bottom Actions
  bottomActions: {
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  allInquiriesBtn: {
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.xs,
  },
  allInquiriesBtnText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.bold,
    color: colors.primary,
  },
});

export default InquiryDetailScreen;
