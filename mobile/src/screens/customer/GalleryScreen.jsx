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
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Search,
  Camera,
  X,
  Sparkles,
  MapPin,
} from "lucide-react-native";
import { colors, radius, shadows, spacing, typography } from "../../constants/theme";
import customerApi from "../../api/customer";
import Header from "../../components/common/Header";
import Card from "../../components/common/Card";
import SkeletonLoader from "../../components/common/SkeletonLoader";
import GalleryLightboxModal from "../../components/common/GalleryLightboxModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - spacing.base * 2 - spacing.sm) / 2;

export const GalleryScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const [galleryItems, setGalleryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  const loadGallery = useCallback(async () => {
    try {
      setLoading(true);
      const data = await customerApi.getGallery();
      const valid = Array.isArray(data) ? data.filter((item) => item?.image_url) : [];
      setGalleryItems(valid);
    } catch (error) {
      console.error("Failed to load gallery:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const onRefresh = () => {
    setRefreshing(true);
    loadGallery();
  };

  const categories = useMemo(() => {
    const set = new Set();
    galleryItems.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["all", ...Array.from(set)];
  }, [galleryItems]);

  const filteredGallery = useMemo(() => {
    return galleryItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (item.title || "").toLowerCase().includes(q) ||
        (item.description || "").toLowerCase().includes(q) ||
        (item.venue || "").toLowerCase().includes(q) ||
        (item.category || "").toLowerCase().includes(q);

      const matchesCat =
        activeCategory === "all" ||
        String(item.category || "").toLowerCase() === activeCategory.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [galleryItems, searchQuery, activeCategory]);

  return (
    <View style={styles.screen}>
      <Header
        title="Event Gallery"
        subtitle="Real catering setups, tablescapes & past celebrations"
        onBack={() => navigation.goBack()}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={18} color={colors.foregroundMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search weddings, floral styling, venues..."
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
                  {cat === "all" ? "All Setups" : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Gallery Grid */}
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {loading ? (
          <View style={styles.gridContainer}>
            <SkeletonLoader height={180} style={{ width: CARD_WIDTH, borderRadius: radius.md }} />
            <SkeletonLoader height={180} style={{ width: CARD_WIDTH, borderRadius: radius.md }} />
            <SkeletonLoader height={180} style={{ width: CARD_WIDTH, borderRadius: radius.md }} />
            <SkeletonLoader height={180} style={{ width: CARD_WIDTH, borderRadius: radius.md }} />
          </View>
        ) : filteredGallery.length === 0 ? (
          <Card style={styles.emptyCard} variant="flat">
            <Camera size={36} color={colors.textDisabled} />
            <Text style={styles.emptyTitle}>No Setups Found</Text>
            <Text style={styles.emptySub}>Try searching for a different style or category.</Text>
          </Card>
        ) : (
          <View style={styles.gridContainer}>
            {filteredGallery.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.galleryCard}
                onPress={() => setSelectedItem(item)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.galleryImage}
                  resizeMode="cover"
                />
                <View style={styles.galleryCardContent}>
                  {item.category && (
                    <Text style={styles.categoryPillText}>{item.category}</Text>
                  )}
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title || "Banquet Setup"}
                  </Text>
                  {item.venue && (
                    <View style={styles.venueRow}>
                      <MapPin size={10} color={colors.foregroundMuted} />
                      <Text style={styles.venueText} numberOfLines={1}>
                        {item.venue}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Lightbox Modal */}
      <GalleryLightboxModal
        visible={Boolean(selectedItem)}
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onInquireSetup={() => {
          setSelectedItem(null);
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
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  galleryCard: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
    marginBottom: spacing.xs,
    ...shadows.sm,
  },
  galleryImage: {
    width: "100%",
    height: 130,
    backgroundColor: colors.surfaceAlt,
  },
  galleryCardContent: {
    padding: spacing.sm,
  },
  categoryPillText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.primary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: typography.sizes.xs,
    fontWeight: "700",
    color: colors.foreground,
  },
  venueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 2,
  },
  venueText: {
    fontSize: 10,
    color: colors.foregroundMuted,
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

export default GalleryScreen;
