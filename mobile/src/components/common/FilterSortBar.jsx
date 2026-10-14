import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react-native";
import { colors, radius, spacing, typography } from "../../constants/theme";

const BRAND_BLUE = "#4C81E0";
const BRAND_BLUE_LIGHT = "rgba(76, 129, 224, 0.08)";
const BRAND_BLUE_BORDER = "rgba(76, 129, 224, 0.30)";

export const FilterSortBar = ({
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search by event, reference, venue...",
  // Sorting
  sortBy = "newest",
  onSortChange,
  sortOptions = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "date", label: "Event date" },
  ],
  // Status
  statusFilter = "all",
  onStatusChange,
  statusOptions = [],
  // Service Type
  serviceFilter = "all",
  onServiceChange,
  serviceGroups = [],
  // Optional Special / Payment Filter
  isPaymentDueActive = false,
  onClearPaymentDue,
  // Clear all callback
  onClearAll,
  // Dynamic result count preview calculator: (draft) => number
  getPreviewCount,
}) => {
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  // Draft state inside bottom sheet (user reviews before tapping "Show results")
  const [draftSort, setDraftSort] = useState(sortBy);
  const [draftStatus, setDraftStatus] = useState(statusFilter);
  const [draftService, setDraftService] = useState(serviceFilter);

  // Synchronize draft state whenever bottom sheet opens
  useEffect(() => {
    if (sheetOpen) {
      setDraftSort(sortBy);
      setDraftStatus(statusFilter);
      setDraftService(serviceFilter);
    }
  }, [sheetOpen, sortBy, statusFilter, serviceFilter]);

  // Active filter states
  const isStatusActive = statusFilter !== "all";
  const isServiceActive = serviceFilter !== "all";
  const isSortActive = sortBy !== "newest";
  const isSearchActive = Boolean(searchQuery.trim());
  const hasActiveFilters =
    isStatusActive || isServiceActive || isSortActive || isSearchActive || isPaymentDueActive;

  // Active filter count on button
  const activeCount =
    (isStatusActive ? 1 : 0) +
    (isServiceActive ? 1 : 0) +
    (isSortActive ? 1 : 0) +
    (isPaymentDueActive ? 1 : 0);

  // Labels for applied chips
  const currentStatusObj = statusOptions.find((opt) => opt.key === statusFilter);
  const currentStatusLabel = currentStatusObj?.label || statusFilter;

  const currentSortObj = sortOptions.find((opt) => opt.key === sortBy);
  const currentSortLabel = currentSortObj?.label || sortBy;

  let currentServiceLabel = serviceFilter;
  for (const group of serviceGroups) {
    const match = group.options?.find((opt) => opt.key === serviceFilter);
    if (match) {
      currentServiceLabel = match.label;
      break;
    }
  }

  // Calculate dynamic preview count for "Show results" button
  const previewCount = useMemo(() => {
    if (typeof getPreviewCount === "function") {
      return getPreviewCount({
        sortBy: draftSort,
        statusFilter: draftStatus,
        serviceFilter: draftService,
      });
    }
    return null;
  }, [getPreviewCount, draftSort, draftStatus, draftService]);

  const handleApply = () => {
    onSortChange(draftSort);
    onStatusChange(draftStatus);
    onServiceChange(draftService);
    setSheetOpen(false);
  };

  const handleResetDraft = () => {
    setDraftSort("newest");
    setDraftStatus("all");
    setDraftService("all");
  };

  return (
    <View style={styles.container}>
      {/* 1. Combined Search Field + Filter Button on the SAME Row */}
      <View style={styles.searchFilterRow}>
        <View
          style={[
            styles.searchBox,
            searchFocused && styles.searchBoxFocused,
          ]}
        >
          <Search size={16} color={colors.foregroundMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textSubtle}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {isSearchActive && (
            <TouchableOpacity
              onPress={() => onSearchChange("")}
              style={styles.clearSearchBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Clear search"
            >
              <X size={15} color={colors.foregroundMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Compact Filter Icon Button */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            activeCount > 0 && styles.filterBtnActive,
          ]}
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`Open filters and sorting, ${activeCount} active`}
        >
          <SlidersHorizontal
            size={18}
            color={BRAND_BLUE}
            strokeWidth={activeCount > 0 ? 2.4 : 2}
          />
          {activeCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2. Applied Filter Chips (ONLY rendered when filters are active) */}
      {hasActiveFilters && (
        <View style={styles.appliedChipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.appliedChipsScroll}
          >
            {isPaymentDueActive && (
              <TouchableOpacity
                style={styles.appliedChip}
                onPress={onClearPaymentDue}
                activeOpacity={0.7}
              >
                <Text style={styles.appliedChipText} numberOfLines={1}>
                  Needs payment
                </Text>
                <X size={12} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {isStatusActive && (
              <TouchableOpacity
                style={styles.appliedChip}
                onPress={() => onStatusChange("all")}
                activeOpacity={0.7}
              >
                <Text style={styles.appliedChipText} numberOfLines={1}>
                  Status: {currentStatusLabel}
                </Text>
                <X size={12} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {isServiceActive && (
              <TouchableOpacity
                style={styles.appliedChip}
                onPress={() => onServiceChange("all")}
                activeOpacity={0.7}
              >
                <Text style={styles.appliedChipText} numberOfLines={1}>
                  Service: {currentServiceLabel}
                </Text>
                <X size={12} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {isSortActive && (
              <TouchableOpacity
                style={styles.appliedChip}
                onPress={() => onSortChange("newest")}
                activeOpacity={0.7}
              >
                <Text style={styles.appliedChipText} numberOfLines={1}>
                  Sort: {currentSortLabel}
                </Text>
                <X size={12} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            {isSearchActive && (
              <TouchableOpacity
                style={styles.appliedChip}
                onPress={() => onSearchChange("")}
                activeOpacity={0.7}
              >
                <Text style={styles.appliedChipText} numberOfLines={1}>
                  "{searchQuery}"
                </Text>
                <X size={12} color={BRAND_BLUE} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.clearAllBtn}
              onPress={onClearAll}
              activeOpacity={0.7}
            >
              <RotateCcw size={11} color={colors.textSubtle} style={{ marginRight: 3 }} />
              <Text style={styles.clearAllBtnText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* 3. Filter & Sort Bottom Sheet Modal */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSheetOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSheetOpen(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.sheetContainer,
                  { paddingBottom: Math.max(insets.bottom, 12) + 6 },
                ]}
              >
                {/* Drag Handle */}
                <View style={styles.sheetHandle} />

                {/* Header */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>Filters & Sorting</Text>
                  <View style={styles.sheetHeaderActions}>
                    <TouchableOpacity
                      onPress={handleResetDraft}
                      style={styles.sheetResetBtn}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.sheetResetBtnText}>Reset</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSheetOpen(false)}
                      style={styles.sheetCloseBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel="Close filters"
                    >
                      <X size={18} color={colors.foreground} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Scrollable Filters Content */}
                <ScrollView
                  style={styles.sheetScroll}
                  showsVerticalScrollIndicator={false}
                >
                  {/* SECTION 1: Sort by */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>SORT BY</Text>
                    {sortOptions.map((opt) => {
                      const isSelected = draftSort === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.radioRow,
                            isSelected && styles.radioRowActive,
                          ]}
                          onPress={() => setDraftSort(opt.key)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.radioLabelWrap}>
                            <View
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelected && <View style={styles.radioDot} />}
                            </View>
                            <Text
                              style={[
                                styles.radioLabelText,
                                isSelected && styles.radioLabelTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* SECTION 2: Status */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>STATUS</Text>
                    {statusOptions.map((opt) => {
                      const isSelected = draftStatus === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[
                            styles.radioRow,
                            isSelected && styles.radioRowActive,
                          ]}
                          onPress={() => setDraftStatus(opt.key)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.radioLabelWrap}>
                            <View
                              style={[
                                styles.radioCircle,
                                isSelected && styles.radioCircleSelected,
                              ]}
                            >
                              {isSelected && <View style={styles.radioDot} />}
                            </View>
                            <Text
                              style={[
                                styles.radioLabelText,
                                isSelected && styles.radioLabelTextSelected,
                              ]}
                            >
                              {opt.label}
                            </Text>
                          </View>

                          {typeof opt.count === "number" && (
                            <View
                              style={[
                                styles.optionCountBadge,
                                isSelected && styles.optionCountBadgeSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.optionCountText,
                                  isSelected && styles.optionCountTextSelected,
                                ]}
                              >
                                {opt.count}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* SECTION 3: Service Type */}
                  <View style={styles.sectionBlock}>
                    <Text style={styles.sectionHeading}>SERVICE TYPE</Text>
                    {/* All Services */}
                    <TouchableOpacity
                      style={[
                        styles.radioRow,
                        draftService === "all" && styles.radioRowActive,
                      ]}
                      onPress={() => setDraftService("all")}
                      activeOpacity={0.7}
                    >
                      <View style={styles.radioLabelWrap}>
                        <View
                          style={[
                            styles.radioCircle,
                            draftService === "all" && styles.radioCircleSelected,
                          ]}
                        >
                          {draftService === "all" && <View style={styles.radioDot} />}
                        </View>
                        <Text
                          style={[
                            styles.radioLabelText,
                            draftService === "all" && styles.radioLabelTextSelected,
                          ]}
                        >
                          All Services
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Grouped Service Categories (Custom Quotes, Packages, Combo Packs) */}
                    {serviceGroups.map((group, groupIdx) => {
                      if (!group.options || group.options.length === 0) return null;
                      return (
                        <View key={group.title || groupIdx} style={styles.subGroupContainer}>
                          <Text style={styles.subGroupTitle}>{group.title}</Text>
                          {group.options.map((opt) => {
                            const isSelected = draftService === opt.key;
                            return (
                              <TouchableOpacity
                                key={opt.key}
                                style={[
                                  styles.radioRow,
                                  isSelected && styles.radioRowActive,
                                ]}
                                onPress={() => setDraftService(opt.key)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.radioLabelWrap}>
                                  <View
                                    style={[
                                      styles.radioCircle,
                                      isSelected && styles.radioCircleSelected,
                                    ]}
                                  >
                                    {isSelected && <View style={styles.radioDot} />}
                                  </View>
                                  <Text
                                    style={[
                                      styles.radioLabelText,
                                      isSelected && styles.radioLabelTextSelected,
                                    ]}
                                    numberOfLines={2}
                                  >
                                    {opt.label}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      );
                    })}
                  </View>
                </ScrollView>

                {/* Bottom Pinned "Show Results" Action Button */}
                <View style={styles.sheetFooter}>
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={handleApply}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.applyBtnText}>
                      {typeof previewCount === "number"
                        ? `Show ${previewCount} ${previewCount === 1 ? "result" : "results"}`
                        : "Show results"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 3,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm + 2,
    height: 40,
  },
  searchBoxFocused: {
    borderColor: BRAND_BLUE,
    backgroundColor: colors.white,
  },
  searchIcon: {
    marginRight: spacing.xs + 2,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.regular,
    color: colors.foreground,
    paddingVertical: 0,
  },
  clearSearchBtn: {
    padding: 3,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBtnActive: {
    backgroundColor: BRAND_BLUE_LIGHT,
    borderColor: BRAND_BLUE,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: BRAND_BLUE,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  filterBadgeText: {
    color: colors.white,
    fontSize: 9.5,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  /* Applied Filter Chips */
  appliedChipsRow: {
    marginTop: spacing.xs + 1,
  },
  appliedChipsScroll: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  appliedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BRAND_BLUE_LIGHT,
    borderWidth: 1,
    borderColor: BRAND_BLUE_BORDER,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
  },
  appliedChipText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: BRAND_BLUE,
    maxWidth: 160,
  },
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3.5,
  },
  clearAllBtnText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.medium,
    color: colors.textSubtle,
  },
  /* Bottom Sheet Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    maxHeight: "82%",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    backgroundColor: colors.cardBorder,
    borderRadius: radius.full,
    alignSelf: "center",
    marginVertical: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foreground,
  },
  sheetHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  sheetResetBtn: {
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  sheetResetBtnText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.fontFamilies.bold,
    color: BRAND_BLUE,
  },
  sheetCloseBtn: {
    padding: 3,
  },
  sheetScroll: {
    marginTop: spacing.xs,
  },
  /* Section Blocks */
  sectionBlock: {
    marginBottom: spacing.base,
  },
  sectionHeading: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
    color: colors.foregroundMuted,
    letterSpacing: 0.7,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
  },
  subGroupContainer: {
    marginTop: spacing.xs + 2,
    paddingLeft: spacing.xs,
    borderLeftWidth: 2,
    borderLeftColor: colors.borderLight,
    marginBottom: 4,
  },
  subGroupTitle: {
    fontSize: 10.5,
    fontFamily: typography.fontFamilies.bold,
    color: colors.textSubtle,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  /* Radio Rows */
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    marginVertical: 1,
  },
  radioRowActive: {
    backgroundColor: BRAND_BLUE_LIGHT,
  },
  radioLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.8,
    borderColor: colors.cardBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  radioCircleSelected: {
    borderColor: BRAND_BLUE,
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: BRAND_BLUE,
  },
  radioLabelText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.fontFamilies.medium,
    color: colors.foreground,
    flexShrink: 1,
  },
  radioLabelTextSelected: {
    color: BRAND_BLUE,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
  optionCountBadge: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  optionCountBadgeSelected: {
    backgroundColor: colors.white,
    borderColor: BRAND_BLUE_BORDER,
  },
  optionCountText: {
    fontSize: 11,
    fontFamily: typography.fontFamilies.bold,
    color: colors.foregroundMuted,
  },
  optionCountTextSelected: {
    color: BRAND_BLUE,
  },
  /* Sheet Footer / Action Button */
  sheetFooter: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  applyBtn: {
    backgroundColor: BRAND_BLUE,
    minHeight: 46,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyBtnText: {
    color: colors.white,
    fontSize: typography.sizes.base,
    fontFamily: typography.fontFamilies.bold,
    fontWeight: "700",
  },
});

export default FilterSortBar;
