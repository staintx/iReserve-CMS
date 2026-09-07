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
import DishDetailModal from "../../components/common/DishDetailModal";
import { resolveDishImage } from "../../constants/cateringData";
import { formatCurrency } from "../../utils/format";

export const MenuScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedDish, setSelectedDish] = useState(null);

  const loadMenu = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customerApi.getMenu();
      setDishes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load menu dishes:", error);
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
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
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
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  {cat === "all" ? "All Courses" : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Dishes Grid */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <View style={{ gap: spacing.md }}>
            <SkeletonLoader height={100} borderRadius={radius.lg} />
            <SkeletonLoader height={100} borderRadius={radius.lg} />
            <SkeletonLoader height={100} borderRadius={radius.lg} />
          </View>
        ) : filteredDishes.length === 0 ? (
          <Card style={styles.emptyCard} variant="flat">
            <Utensils size={36} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No Dishes Found</Text>
            <Text style={styles.emptySub}>Try searching for a different dish name or category.</Text>
          </Card>
        ) : (
          filteredDishes.map((dish) => {
            const img = resolveDishImage(dish);
            return (
              <Card
                key={dish._id}
                style={styles.dishCard}
                onPress={() => setSelectedDish(dish)}
              >
                <Image source={{ uri: img }} style={styles.dishImage} resizeMode="cover" />
                <View style={styles.dishContent}>
                  <View style={styles.courseBadge}>
                    <Text style={styles.courseBadgeText}>{dish.category || "Main Course"}</Text>
                  </View>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  {dish.description ? (
                    <Text style={styles.dishDesc} numberOfLines={2}>
                      {dish.description}
                    </Text>
                  ) : null}
                  {dish.price > 0 ? (
                    <Text style={styles.dishPrice}>{formatCurrency(dish.price)}</Text>
                  ) : null}
                </View>
                <ChevronRight size={18} color={colors.border} style={{ alignSelf: "center" }} />
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Dish Detail Modal */}
      <DishDetailModal
        visible={Boolean(selectedDish)}
        dish={selectedDish}
        onClose={() => setSelectedDish(null)}
        onSelectDish={(dish) => {
          setSelectedDish(null);
          navigation.navigate("InquiryWizard", {
            favoriteDish: dish.name,
          });
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
    height: 44,
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
    paddingVertical: 6,
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
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  courseBadgeText: {
    fontSize: 9,
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
    fontSize: 11,
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
