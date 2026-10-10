import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Utensils,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import DishCard from "../../components/common/DishCard";
import DishDetailModal from "../../components/common/DishDetailModal";

export const MenuScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedDish, setSelectedDish] = useState(null);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await customerApi.getMenu();
      setDishes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load menu dishes:", err);
      setError("Unable to load culinary menu. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMenu();
  };

  const categories = useMemo(() => {
    const set = new Set();
    dishes.forEach((d) => {
      if (d.category) set.add(d.category);
    });
    return ["all", ...Array.from(set)];
  }, [dishes]);

  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (dish.name || "").toLowerCase().includes(q) ||
        (dish.description || "").toLowerCase().includes(q) ||
        (dish.category || "").toLowerCase().includes(q);

      const matchesCat =
        activeCategory === "all" ||
        String(dish.category || "").toLowerCase() === activeCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [dishes, searchQuery, activeCategory]);

  return (
    <View style={styles.screen}>
      <Header
        title="Banquet Menu"
        subtitle="Explore our handcrafted catering dishes & courses"
        onBack={() => navigation.goBack()}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.foregroundMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search dishes, pasta, desserts, beef..."
          placeholderTextColor={colors.textDisabled}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          accessibilityLabel="Search dishes"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search"
          >
            <X size={16} color={colors.foregroundMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills */}
      <View style={styles.categoryPillsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryPillsScroll}
        >
          {categories.map((cat) => {
            const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.pill, isSelected && styles.pillActive]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {cat === "all" ? "All Courses" : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Dishes List */}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          (filteredDishes.length === 0 || Boolean(error && dishes.length === 0)) &&
            styles.scrollContentEmpty,
          { paddingBottom: Math.max(insets.bottom, 16) + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {error && dishes.length === 0 ? (
          <ErrorState
            title="Unable to Load Menu"
            message={error}
            onRetry={loadMenu}
          />
        ) : loading ? (
          <View style={{ gap: spacing.sm }}>
            <SkeletonLoader height={104} borderRadius={radius.xl} />
            <SkeletonLoader height={104} borderRadius={radius.xl} />
            <SkeletonLoader height={104} borderRadius={radius.xl} />
          </View>
        ) : filteredDishes.length === 0 ? (
          <EmptyState
            icon={Utensils}
            title={
              searchQuery || activeCategory !== "all"
                ? "No Dishes Match Your Search"
                : "No Dishes Found"
            }
            description={
              searchQuery || activeCategory !== "all"
                ? "Try searching for a different dish name or clear course filters."
                : "Our culinary catering menu is currently being refreshed."
            }
            actionLabel={
              searchQuery || activeCategory !== "all"
                ? "Reset Menu Filters"
                : "Browse Packages"
            }
            onAction={
              searchQuery || activeCategory !== "all"
                ? () => {
                    setSearchQuery("");
                    setActiveCategory("all");
                  }
                : () => navigation.navigate("Packages")
            }
          />
        ) : (
          filteredDishes.map((dish) => (
            <DishCard
              key={dish._id || dish.name}
              dish={dish}
              onPress={() => setSelectedDish(dish)}
            />
          ))
        )}
      </ScrollView>

      {/* Dish Detail Modal */}
      <DishDetailModal
        visible={Boolean(selectedDish)}
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        onSelectDish={() => {
          setSelectedDish(null);
          navigation.navigate("InquiryWizard");
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceAlt,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    marginHorizontal: spacing.base,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.sm,
    color: colors.foreground,
  },
  categoryPillsContainer: {
    marginVertical: spacing.sm,
  },
  categoryPillsScroll: {
    paddingHorizontal: spacing.base,
    gap: spacing.xs,
  },
  pill: {
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  pillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: typography.sizes.xs,
    fontWeight: "600",
    color: colors.foregroundMuted,
  },
  pillTextActive: {
    color: colors.white,
    fontWeight: "700",
  },
  scrollContent: {
    padding: spacing.base,
    gap: spacing.sm,
  },
  scrollContentEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  dishCard: {
    flexDirection: "row",
    padding: spacing.sm,
    alignItems: "flex-start",
  },
  dishImage: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  dishContent: {
    flex: 1,
    marginLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  courseBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 4,
    marginBottom: 4,
  },
  courseBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
  },
  dishName: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
  },
  dishDesc: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
  dishPrice: {
    fontSize: typography.sizes.xs,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.sizes.sm,
    fontWeight: "700",
    color: colors.foreground,
    marginTop: spacing.sm,
  },
  emptySub: {
    fontSize: typography.sizes.xs,
    color: colors.foregroundMuted,
    marginTop: 2,
  },
});

export default MenuScreen;
