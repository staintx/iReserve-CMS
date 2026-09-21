import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  UtensilsCrossed,
  Calendar,
  Sparkles,
  Layers,
  LayoutDashboard,
  Users,
  Sun,
  PackageCheck,
  ChevronRight,
  CheckCircle2,
  X,
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Role-specific slide configurations
const ROLE_SLIDES = {
  customer: [
    {
      id: "slide_curated_menus",
      kicker: "HANDCRAFTED CATERING",
      title: "Exquisite Flavors for Every Milestone",
      description:
        "Explore curated buffet packages, plated specialties, and signature dishes crafted for weddings, debuts, and family celebrations in Batangas.",
      icon: UtensilsCrossed,
      accentIcon: Sparkles,
      accentLabel: "Caezelle's Signature",
      badgeColor: colors.primaryLight,
      iconColor: colors.primary,
    },
    {
      id: "slide_proposals_tracking",
      kicker: "TRANSPARENT MILESTONES",
      title: "Real-Time Proposals & Event Tracking",
      description:
        "Review customized quotations, track your food tasting appointments, and follow event preparation milestones step by step.",
      icon: Calendar,
      accentIcon: CheckCircle2,
      accentLabel: "Live Milestones",
      badgeColor: colors.successLight,
      iconColor: colors.success,
    },
    {
      id: "slide_zelle_ai",
      kicker: "INTELLIGENT ASSISTANT",
      title: "Meet Zelle, Your Catering Advisor",
      description:
        "Get instant guidance on dish combinations, guest count estimates, budget pairings, and dietary options anytime with 24/7 AI chat.",
      icon: Sparkles,
      accentIcon: HeartHandshake,
      accentLabel: "Instant Answers",
      badgeColor: colors.accentLight,
      iconColor: colors.primaryDark,
    },
    {
      id: "slide_hassle_free",
      kicker: "SEAMLESS BOOKING",
      title: "Your Dream Celebration Starts Here",
      description:
        "Submit catering inquiries in minutes, customize themes with our banquet team, and enjoy worry-free event hospitality.",
      icon: Layers,
      accentIcon: ShieldCheck,
      accentLabel: "Secure & Verified",
      badgeColor: colors.powderBlue,
      iconColor: colors.secondary,
    },
  ],
  manager: [
    {
      id: "slide_manager_dashboard",
      kicker: "OPERATIONS COMMAND",
      title: "Centralized Banquet Operations",
      description:
        "Real-time overview of active events, guest headcounts, and staffing demands across all Batangas catering venues.",
      icon: LayoutDashboard,
      accentIcon: Sparkles,
      accentLabel: "Live Oversight",
      badgeColor: colors.primaryLight,
      iconColor: colors.primary,
    },
    {
      id: "slide_manager_staffing",
      kicker: "TEAM ROSTERING",
      title: "Dispatch & Track Banquet Crews",
      description:
        "Assign team leads, service captains, and banquet staff with clear shift timings and equipment handovers.",
      icon: Users,
      accentIcon: CheckCircle2,
      accentLabel: "Crew Scheduling",
      badgeColor: colors.successLight,
      iconColor: colors.success,
    },
    {
      id: "slide_manager_calendar",
      kicker: "EVENT CALENDAR",
      title: "Keep Every Milestone on Schedule",
      description:
        "Review client inquiries, approve quotations, and verify equipment readiness with your event supervisors.",
      icon: Calendar,
      accentIcon: Layers,
      accentLabel: "Zero Conflicts",
      badgeColor: colors.powderBlue,
      iconColor: colors.secondary,
    },
  ],
  staff: [
    {
      id: "slide_staff_roster",
      kicker: "DAILY SHIFT ROSTER",
      title: "Your Assigned Events & Locations",
      description:
        "View upcoming call times, assigned service roles, and get one-tap Google Maps navigation directly to the event venue.",
      icon: Sun,
      accentIcon: Calendar,
      accentLabel: "On-Time Arrival",
      badgeColor: colors.warningLight,
      iconColor: colors.warningDark,
    },
    {
      id: "slide_staff_equipment",
      kicker: "EQUIPMENT & SIGN-OFF",
      title: "Digital On-Site Verification",
      description:
        "Inspect and check off catering equipment on arrival, and complete your digital shift verification seamlessly.",
      icon: PackageCheck,
      accentIcon: CheckCircle2,
      accentLabel: "Fast Sign-Off",
      badgeColor: colors.successLight,
      iconColor: colors.success,
    },
  ],
};

export const OnboardingScreen = ({
  role = "customer",
  onComplete,
  isReplay = false,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = ROLE_SLIDES[role] || ROLE_SLIDES.customer;
  const isLastSlide = activeIndex === slides.length - 1;

  const handleScroll = useCallback(
    (event) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      if (index >= 0 && index < slides.length && index !== activeIndex) {
        setActiveIndex(index);
      }
    },
    [activeIndex, slides.length]
  );

  const handleNext = () => {
    if (isLastSlide) {
      onComplete?.();
    } else {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    }
  };

  const handleSkip = () => {
    if (isReplay && onDismiss) {
      onDismiss();
    } else {
      onComplete?.();
    }
  };

  const renderSlide = ({ item, index }) => {
    const IconComponent = item.icon;
    const AccentIconComponent = item.accentIcon;

    return (
      <View style={[styles.slideWrap, { width: SCREEN_WIDTH }]}>
        {/* Visual Artwork Composition */}
        <View style={styles.artContainer}>
          <View style={[styles.outerGlowCircle, { backgroundColor: item.badgeColor }]}>
            <View style={styles.innerGlowCircle}>
              <IconComponent size={64} color={item.iconColor} strokeWidth={1.75} />
            </View>
          </View>

          {/* Floating Pill Badge */}
          <View style={styles.floatingBadge}>
            <AccentIconComponent size={14} color={colors.primary} />
            <Text style={styles.floatingBadgeText}>{item.accentLabel}</Text>
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.contentContainer}>
          <View style={styles.kickerBadge}>
            <Text style={styles.kickerText}>{item.kicker}</Text>
          </View>

          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideDescription}>{item.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.brandRow}>
          <View style={styles.goldDot} />
          <Text style={styles.brandText}>iReserve • Caezelle's</Text>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {isReplay ? (
            <View style={styles.closeWrap}>
              <X size={18} color={colors.foregroundMuted} />
              <Text style={styles.skipText}>Close</Text>
            </View>
          ) : (
            <Text style={styles.skipText}>Skip</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Slide Carousel */}
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.flatList}
      />

      {/* Footer: Pagination Dots & Action Buttons */}
      <View style={styles.footerContainer}>
        {/* Dot Indicators */}
        <View style={styles.dotsRow}>
          {slides.map((_, index) => {
            const isActive = index === activeIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  isActive ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            isLastSlide && styles.primaryButtonLast,
          ]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>
            {isLastSlide ? "Get Started" : "Continue"}
          </Text>
          {isLastSlide ? (
            <CheckCircle2 size={18} color={colors.white} style={styles.btnIcon} />
          ) : (
            <ArrowRight size={18} color={colors.white} style={styles.btnIcon} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerBar: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accentGold,
    marginRight: 8,
  },
  brandText: {
    fontSize: 14,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primaryDark,
    letterSpacing: -0.2,
  },
  skipButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  closeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  skipText: {
    fontSize: 13,
    fontFamily: typography.fontFamilies.medium,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  flatList: {
    flex: 1,
  },
  slideWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  artContainer: {
    flex: 1.1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  outerGlowCircle: {
    width: SCREEN_WIDTH * 0.58,
    height: SCREEN_WIDTH * 0.58,
    borderRadius: (SCREEN_WIDTH * 0.58) / 2,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  innerGlowCircle: {
    width: SCREEN_WIDTH * 0.44,
    height: SCREEN_WIDTH * 0.44,
    borderRadius: (SCREEN_WIDTH * 0.44) / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  floatingBadge: {
    position: "absolute",
    bottom: SCREEN_WIDTH * 0.08,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBrand,
    gap: 6,
    ...shadows.sm,
  },
  floatingBadgeText: {
    fontSize: 12,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.primaryDark,
  },
  contentContainer: {
    flex: 0.9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  kickerBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.md,
  },
  kickerText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 0.8,
  },
  slideTitle: {
    fontSize: 24,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundDark,
    textAlign: "center",
    marginBottom: spacing.md,
    lineHeight: 31,
    letterSpacing: -0.3,
  },
  slideDescription: {
    fontSize: 14.5,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foregroundMuted,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: SCREEN_WIDTH * 0.85,
  },
  footerContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 26,
    backgroundColor: colors.primary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: colors.border,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radius.full,
    gap: 8,
    ...shadows.md,
  },
  primaryButtonLast: {
    backgroundColor: colors.primaryDark,
  },
  primaryButtonText: {
    fontSize: 15,
    fontFamily: typography.fontFamilies.semiBold,
    fontWeight: "600",
    color: colors.white,
  },
  btnIcon: {
    marginLeft: 2,
  },
});

export default OnboardingScreen;
