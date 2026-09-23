import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  X,
  Search,
  UtensilsCrossed,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  SH,
  Field,
  TTextarea,
  StepShell,
} from "../components/BookingSharedUI";
import { focusRing } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";
import { resolveGroup, CATEGORY_GROUPS, getCategoryGuidance } from "@/lib/menuCategories";
import {
  offerFoodByCategory,
  offerCourseRequirement,
  offerInclusions,
  offerGuestCount,
  offerPricePerPax,
} from "@/lib/specialOffers";

/**
 * Compact, horizontal menu card.
 * Image on left, readable dish name and description in middle, check indicator on right.
 */
function DishCard({ item, selected, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl border p-2.5 sm:p-3 text-left transition-all cursor-pointer select-none active:scale-[0.99] touch-manipulation",
        selected
          ? "border-[#4C81E0] bg-blue-50/50 ring-1.5 ring-[#4C81E0] shadow-xs"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs",
        focusRing,
      )}
    >
      {/* Food Thumbnail */}
      {item.image_url ? (
        <span className="relative block h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200/80">
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        </span>
      ) : (
        <span className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200/60">
          <UtensilsCrossed size={18} />
        </span>
      )}

      {/* Dish Name & Description */}
      <div className="min-w-0 flex-1 py-0.5">
        <h4
          className={cn(
            "text-xs sm:text-sm font-bold transition-colors leading-snug line-clamp-2 break-words",
            selected
              ? "text-[#4C81E0]"
              : "text-slate-900 group-hover:text-slate-950",
          )}
        >
          {item.name}
        </h4>

        {item.description ? (
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed mt-0.5 line-clamp-2">
            {item.description}
          </p>
        ) : (
          <p className="text-[11px] text-slate-400 italic leading-relaxed mt-0.5">
            Standard catering preparation
          </p>
        )}
      </div>

      {/* Clear Selected Checkmark */}
      <div className="shrink-0 pl-1">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border transition-all duration-150",
            selected
              ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
              : "border-slate-300 bg-white text-transparent group-hover:border-slate-400",
          )}
          aria-hidden="true"
        >
          <Check size={12} strokeWidth={3} />
        </span>
      </div>
    </button>
  );
}



/**
 * Lightweight, compact text-based category navigation tabs.
 * Clean horizontal text strip with active underline highlight, no bulky pill frames or database counters.
 */
function CategoryTabs({
  groups = [],
  activeGroupId,
  onSelectGroup,
  selectedCounts = {},
}) {
  const scrollRef = useRef(null);

  const handleTabClick = (groupId, e) => {
    onSelectGroup(groupId);
    if (e?.currentTarget && e.currentTarget.scrollIntoView) {
      e.currentTarget.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  };

  return (
    <div className="relative select-none border-b border-slate-200 -mx-1 px-1">
      <div
        ref={scrollRef}
        className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-none scroll-smooth touch-pan-x"
        role="tablist"
        aria-label="Food category navigation"
      >
        {groups.map((group) => {
          const selectedInThis = selectedCounts[group.id] || 0;
          const isActive = activeGroupId === group.id;

          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={(e) => handleTabClick(group.id, e)}
              className={cn(
                "shrink-0 inline-flex items-center gap-1 py-2 px-2.5 text-xs transition-colors cursor-pointer whitespace-nowrap border-b-2 -mb-px",
                isActive
                  ? "border-[#4C81E0] text-[#4C81E0] font-bold"
                  : selectedInThis > 0
                    ? "border-transparent text-slate-800 font-semibold hover:text-[#4C81E0]"
                    : "border-transparent text-slate-500 hover:text-slate-800 font-medium",
                focusRing,
              )}
            >
              <span>{group.label}</span>
              {selectedInThis > 0 && (
                <span className="text-[10px] font-bold text-[#4C81E0] bg-blue-50 border border-blue-200/80 px-1.5 py-0.2 rounded-full">
                  {selectedInThis}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StepMenuSelection({
  form,
  setForm,
  menuItems,
  estimate,
  isFullService,
  offer = null,
  onRegisterMenuNav,
  onRemoveDish,
  onClearDishes,
}) {
  const selected = useMemo(() => form.selected_menu || [], [form.selected_menu]);
  const [activeGroup, setActiveGroup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const prevOfferIdRef = useRef(offer?._id || offer?.id);
  const [expandedCategory, setExpandedCategory] = useState(() => {
    if (!offer) return null;
    const initialCourses = offerFoodByCategory(offer);
    const snapshot = Array.isArray(form.offer_food_snapshot)
      ? form.offer_food_snapshot
      : [];
    const firstIncomplete = initialCourses.find((course) => {
      if (course.items.length === 1) return false;
      const req = offerCourseRequirement(course.category);
      const selectedInCat = snapshot.filter(
        (entry) => entry.menu_category === course.category,
      );
      return selectedInCat.length < req;
    });
    return firstIncomplete ? firstIncomplete.category : null;
  });

  const offerId = offer?._id || offer?.id;
  if (prevOfferIdRef.current !== offerId) {
    prevOfferIdRef.current = offerId;
    const nextCourses = offer ? offerFoodByCategory(offer) : [];
    const snapshot = Array.isArray(form.offer_food_snapshot)
      ? form.offer_food_snapshot
      : [];
    const firstIncomplete = nextCourses.find((course) => {
      if (course.items.length === 1) return false;
      const req = offerCourseRequirement(course.category);
      const selectedInCat = snapshot.filter(
        (entry) => entry.menu_category === course.category,
      );
      return selectedInCat.length < req;
    });
    setExpandedCategory(firstIncomplete ? firstIncomplete.category : null);
  }

  const handleToggleCategory = (category) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const comboCourses = useMemo(() => (offer ? offerFoodByCategory(offer) : []), [offer]);

  /**
   * Seeding single-item combo courses into snapshot.
   */
  useEffect(() => {
    if (!offer || comboCourses.length === 0) return;

    setForm((prev) => {
      const current = Array.isArray(prev.offer_food_snapshot)
        ? prev.offer_food_snapshot
        : [];
      const missing = comboCourses.filter(
        (course) =>
          course.items.length === 1 &&
          !current.some((entry) => entry.menu_category === course.category),
      );
      if (missing.length === 0) return prev;

      return {
        ...prev,
        offer_food_snapshot: [
          ...current,
          ...missing.map((course) => ({
            menu_category: course.category,
            item_name: course.items[0],
          })),
        ],
      };
    });
  }, [offer, comboCourses, setForm]);

  const isSelected = (item) =>
    selected.some((chosen) => String(chosen._id) === String(item._id));

  const toggle = (item) => {
    setForm((prev) => {
      const current = prev.selected_menu || [];
      const already = current.some(
        (chosen) => String(chosen._id) === String(item._id),
      );
      return {
        ...prev,
        selected_menu: already
          ? current.filter((chosen) => String(chosen._id) !== String(item._id))
          : [...current, item],
      };
    });
  };

  const remove = onRemoveDish || ((item) =>
    setForm((prev) => ({
      ...prev,
      selected_menu: (prev.selected_menu || []).filter(
        (chosen) => String(chosen._id) !== String(item._id),
      ),
    })));

  const clearAll = onClearDishes || (() =>
    setForm((prev) => ({
      ...prev,
      selected_menu: [],
    })));

  // Group items by category course in standard dining order
  const groupedItems = useMemo(() => {
    const byId = new Map();
    (menuItems || []).forEach((item) => {
      const group = resolveGroup(item.category);
      if (!byId.has(group.id)) byId.set(group.id, { ...group, items: [] });
      byId.get(group.id).items.push(item);
    });
    const order = CATEGORY_GROUPS.map((group) => group.id);
    return [...byId.values()].sort((a, b) => {
      const ai = order.indexOf(a.id);
      const bi = order.indexOf(b.id);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [menuItems]);

  // Selected counts by category
  const selectedCountsByGroup = useMemo(() => {
    const counts = {};
    selected.forEach((dish) => {
      const group = resolveGroup(dish.category);
      counts[group.id] = (counts[group.id] || 0) + 1;
    });
    return counts;
  }, [selected]);

  // Ensure activeGroup points to a valid category group
  const currentGroupId = useMemo(() => {
    if (activeGroup && groupedItems.some((g) => g.id === activeGroup)) {
      return activeGroup;
    }
    return groupedItems[0]?.id || "";
  }, [activeGroup, groupedItems]);

  const currentGroup = useMemo(() => {
    if (groupedItems.length === 0) return null;
    return groupedItems.find((g) => g.id === currentGroupId) || groupedItems[0];
  }, [groupedItems, currentGroupId]);

  const currentGroupIndex = useMemo(() => {
    if (!currentGroup) return -1;
    return groupedItems.findIndex((g) => g.id === currentGroup.id);
  }, [groupedItems, currentGroup]);

  const prevGroup = currentGroupIndex > 0 ? groupedItems[currentGroupIndex - 1] : null;
  const nextGroup =
    currentGroupIndex >= 0 && currentGroupIndex < groupedItems.length - 1
      ? groupedItems[currentGroupIndex + 1]
      : null;

  // Register category navigation state with parent wizard so the fixed bottom bar progresses categories
  useEffect(() => {
    if (offer || !onRegisterMenuNav) return;
    if (!currentGroup) {
      onRegisterMenuNav(null);
      return;
    }

    onRegisterMenuNav({
      currentGroupIndex,
      totalGroups: groupedItems.length,
      currentGroup,
      nextGroup,
      prevGroup,
      hasNext: Boolean(nextGroup),
      hasPrev: currentGroupIndex > 0,
      nextGroupLabel: nextGroup?.label || "",
      goToNextGroup: () => {
        if (nextGroup) {
          setActiveGroup(nextGroup.id);
          window.scrollTo({ top: 120, behavior: "smooth" });
        }
      },
      goToPrevGroup: () => {
        if (prevGroup) {
          setActiveGroup(prevGroup.id);
          window.scrollTo({ top: 120, behavior: "smooth" });
        }
      },
    });

    return () => onRegisterMenuNav(null);
  }, [
    offer,
    onRegisterMenuNav,
    currentGroup,
    nextGroup,
    prevGroup,
    currentGroupIndex,
    groupedItems.length,
  ]);

  const q = searchQuery.trim().toLowerCase();

  // Filter items strictly in the current active category by search query (do not mix others in main results)
  const activeDishes = useMemo(() => {
    if (!currentGroup) return [];
    if (!q) return currentGroup.items;
    return currentGroup.items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [currentGroup, q]);

  // When active category has no search matches, check if other categories have matches as quick shortcuts
  const otherCategoryMatches = useMemo(() => {
    if (!q || !currentGroup) return [];
    return groupedItems
      .filter((g) => g.id !== currentGroup.id)
      .map((g) => {
        const matchCount = g.items.filter(
          (item) =>
            item.name?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q),
        ).length;
        return { group: g, matchCount };
      })
      .filter((m) => m.matchCount > 0);
  }, [q, currentGroup, groupedItems]);

  const requestsField = (placeholder) => (
    <Field
      label="Additional requests or notes"
      hint="Optional. Custom dishes not on the menu or special preparation notes. (Max 500 chars)"
    >
      <TTextarea
        placeholder={placeholder}
        maxLength={500}
        value={form.special_requests || ""}
        onChange={(val) => setForm({ ...form, special_requests: val })}
        rows={3}
      />
    </Field>
  );

  const dishBrowser = (
    <div className="space-y-4 max-w-full overflow-hidden pb-24 sm:pb-6">
      {/* 1. Lightweight Text-Based Category Navigation */}
      <CategoryTabs
        groups={groupedItems}
        activeGroupId={currentGroup?.id || activeGroup}
        onSelectGroup={setActiveGroup}
        selectedCounts={selectedCountsByGroup}
      />

      {/* 2. Active Category Header with Small Secondary Action & Search */}
      {currentGroup ? (
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  {currentGroup.label}
                </h3>
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                {getCategoryGuidance(currentGroup)}
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-56 shrink-0">
              <Search
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${currentGroup.label.toLowerCase()}...`}
                aria-label={`Search dishes in ${currentGroup.label}`}
                className={cn(
                  "h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-7 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#4C81E0]/30 focus:border-[#4C81E0] shadow-2xs",
                  focusRing,
                )}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* 3. Dishes Grid: Strictly 2 columns on desktop/tablet, 1 on mobile */}
          {activeDishes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 px-4 text-center text-xs text-slate-400 space-y-3">
              {q ? (
                <>
                  <p className="text-slate-600 font-medium">
                    No dishes in {currentGroup.label} match “{searchQuery}”.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    Clear search
                  </button>

                  {otherCategoryMatches.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 max-w-sm mx-auto">
                      <p className="text-[11px] text-slate-500 mb-2">
                        Matches found in other categories:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-1.5">
                        {otherCategoryMatches.map(({ group, matchCount }) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setActiveGroup(group.id);
                            }}
                            className="inline-flex items-center gap-1 rounded-full border border-blue-200/80 bg-blue-50/70 px-2.5 py-1 text-[11px] font-semibold text-[#4C81E0] hover:bg-blue-100 transition-colors cursor-pointer"
                          >
                            <span>{group.label}</span>
                            <span className="font-mono text-[10px] text-blue-500">
                              ({matchCount})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p>No dishes currently listed under this category.</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {activeDishes.map((item) => (
                <DishCard
                  key={item._id}
                  item={item}
                  selected={isSelected(item)}
                  onToggle={() => toggle(item)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-xs text-slate-400">
          Loading menu items...
        </div>
      )}

      {/* 4. Special requests field */}
      <div className="mt-4 border-t border-slate-100 pt-3">
        {requestsField(
          "e.g. We would like pork barbecue if you can source it, and keep the pancit separate",
        )}
      </div>
    </div>
  );


  // ---------------------------------------------------------------------------
  // Special Offer — a combo pack
  // ---------------------------------------------------------------------------
  if (offer) {
    const courses = comboCourses;
    const inclusions = offerInclusions(offer);
    const pax = Number(form.guest_count) || offerGuestCount(offer) || 1;
    const perPax = offerPricePerPax(offer);

    const currentSnapshot = Array.isArray(form.offer_food_snapshot)
      ? form.offer_food_snapshot
      : [];

    // Catalog lookup map for images and descriptions
    const catalogMap = new Map();
    (menuItems || []).forEach((item) => {
      if (item?.name) {
        catalogMap.set(item.name.toLowerCase().trim(), item);
      }
    });

    const isDishSelected = (category, itemName) =>
      currentSnapshot.some(
        (entry) =>
          entry.menu_category === category && entry.item_name === itemName,
      );

    const getSelectedForCategory = (category) =>
      currentSnapshot.filter((entry) => entry.menu_category === category);

    const toggleComboDish = (category, itemName, requiredCount) => {
      const existingInCat = getSelectedForCategory(category);
      const isAlready = existingInCat.some((e) => e.item_name === itemName);
      let nextSnapshot;
      let isNowComplete = false;

      if (requiredCount === 1) {
        const otherCategories = currentSnapshot.filter(
          (entry) => entry.menu_category !== category,
        );
        nextSnapshot = [...otherCategories, { menu_category: category, item_name: itemName }];
        isNowComplete = true;
      } else {
        if (isAlready) {
          nextSnapshot = currentSnapshot.filter(
            (entry) =>
              !(entry.menu_category === category && entry.item_name === itemName),
          );
          const remainingInCat = nextSnapshot.filter(
            (entry) => entry.menu_category === category,
          );
          isNowComplete = remainingInCat.length >= requiredCount;
        } else {
          if (existingInCat.length < requiredCount) {
            nextSnapshot = [
              ...currentSnapshot,
              { menu_category: category, item_name: itemName },
            ];
            isNowComplete = existingInCat.length + 1 >= requiredCount;
          } else {
            const otherInCat = existingInCat.slice(1);
            const otherCategories = currentSnapshot.filter(
              (entry) => entry.menu_category !== category,
            );
            nextSnapshot = [
              ...otherCategories,
              ...otherInCat,
              { menu_category: category, item_name: itemName },
            ];
            isNowComplete = true;
          }
        }
      }

      setForm((prev) => ({
        ...prev,
        offer_food_snapshot: nextSnapshot,
      }));

      if (isNowComplete) {
        const currentIndex = courses.findIndex((c) => c.category === category);
        const orderedCourses = [
          ...courses.slice(currentIndex + 1),
          ...courses.slice(0, currentIndex),
        ];
        const nextIncomplete = orderedCourses.find((c) => {
          if (c.items.length === 1) return false;
          const req = offerCourseRequirement(c.category);
          const count = nextSnapshot.filter(
            (entry) => entry.menu_category === c.category,
          ).length;
          return count < req;
        });

        setExpandedCategory(nextIncomplete ? nextIncomplete.category : null);
      }
    };

    const completedCoursesCount = courses.filter((course) => {
      const selected = getSelectedForCategory(course.category);
      const req = offerCourseRequirement(course.category);
      return selected.length >= req || (course.items.length === 1 && selected.length > 0);
    }).length;

    const allCompleted = courses.length > 0 && completedCoursesCount === courses.length;

    return (
      <StepShell aside={<EstimateSummary estimate={estimate} />}>
        <SH
          title={`Your ${offer.name}`}
          sub="Choose your preferred dish for each course included in this special offer combo."
        />

        <div className="space-y-3 max-w-full overflow-hidden">
          {/* Top Pax & Combo Progress Summary Card */}
          <Card className="p-3 sm:p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {pax} {pax === 1 ? "guest" : "guests"}
                </span>
                {perPax > 0 && (
                  <span className="text-xs text-slate-500">
                    ₱{perPax.toLocaleString("en-PH")} / pax · ₱{(pax * perPax).toLocaleString("en-PH")} combo total
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
                    allCompleted
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
                  )}
                >
                  {allCompleted ? <Check size={12} strokeWidth={3} /> : null}
                  {completedCoursesCount} of {courses.length} courses completed
                </span>
              </div>
            </div>
          </Card>

          {/* Course Accordion Cards */}
          <div className="space-y-2.5">
            {courses.map((course, index) => {
              const req = offerCourseRequirement(course.category);
              const isSingle = course.items.length === 1;
              const selectedInThis = getSelectedForCategory(course.category);
              const isCategoryComplete =
                selectedInThis.length >= req ||
                (isSingle && isDishSelected(course.category, course.items[0]));
              const isExpanded = expandedCategory === course.category;

              const selectedDishes =
                selectedInThis.length > 0
                  ? selectedInThis.map((e) => e.item_name)
                  : isSingle && isDishSelected(course.category, course.items[0])
                    ? [course.items[0]]
                    : [];

              return (
                <Card
                  key={course.category}
                  className={cn(
                    "p-3 sm:p-3.5 transition-all duration-200",
                    isExpanded
                      ? "border-[#4C81E0] ring-1 ring-[#4C81E0]/30 shadow-xs"
                      : isCategoryComplete
                        ? "border-slate-200 bg-white hover:border-slate-300"
                        : "border-amber-200/90 bg-amber-50/[0.03] hover:border-amber-300",
                  )}
                >
                  {/* Clickable Course Accordion Header */}
                  <button
                    type="button"
                    onClick={() => handleToggleCategory(course.category)}
                    aria-expanded={isExpanded}
                    className="w-full flex items-center justify-between gap-2.5 text-left cursor-pointer select-none group touch-manipulation"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-slate-400">
                          0{index + 1}
                        </span>
                        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-900 group-hover:text-[#4C81E0] transition-colors">
                          {course.category}
                        </h3>

                        {/* Explicit Course Selection Rule Badge */}
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-tight uppercase",
                            isSingle
                              ? "bg-slate-100 text-slate-600 border border-slate-200/80"
                              : req === 1
                                ? "bg-blue-50 text-[#4C81E0] border border-blue-200/70"
                                : "bg-purple-50 text-purple-700 border border-purple-200/70",
                          )}
                        >
                          {isSingle
                            ? "Included"
                            : req === 1
                              ? "Choose 1"
                              : `Choose ${req}`}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {isSingle
                          ? "Automatically included with this combo package"
                          : req === 1
                            ? "Select 1 dish from this course"
                            : `Select ${req} dishes from this course`}
                      </p>
                    </div>

                    {/* Course Selection Status & Chevron */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors",
                          isCategoryComplete
                            ? isSingle
                              ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200/80"
                              : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                            : "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80",
                        )}
                      >
                        {isCategoryComplete ? (
                          <>
                            <Check size={11} strokeWidth={3} />
                            <span>
                              {isSingle
                                ? "Included"
                                : `${selectedInThis.length}/${req} selected`}
                            </span>
                          </>
                        ) : (
                          <span>
                            Needs {req - selectedInThis.length} ({selectedInThis.length}/{req})
                          </span>
                        )}
                      </span>

                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-transform duration-200 group-hover:bg-slate-100 group-hover:text-slate-600",
                          isExpanded && "rotate-180 text-[#4C81E0] bg-blue-50",
                        )}
                      >
                        <ChevronDown size={14} />
                      </span>
                    </div>
                  </button>

                  {/* Collapsed State: Display selected dish chips with quick change option */}
                  {!isExpanded && isCategoryComplete && selectedDishes.length > 0 && (
                    <div
                      onClick={() => handleToggleCategory(course.category)}
                      className="mt-2.5 border-t border-slate-100 pt-2 flex flex-wrap items-center justify-between gap-2 cursor-pointer group/row"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                        {selectedDishes.map((dishName) => (
                          <div
                            key={dishName}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#4C81E0]/30 bg-[#4C81E0]/5 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs"
                          >
                            <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[9px] font-bold">
                              ✓
                            </span>
                            <span className="truncate max-w-[200px]">{dishName}</span>
                          </div>
                        ))}
                      </div>
                      {!isSingle && (
                        <span className="text-[11px] font-semibold text-[#4C81E0] group-hover/row:underline ml-auto">
                          Change dish
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expanded State: Dish Selection Options */}
                  {isExpanded && (
                    <div className="mt-3 border-t border-slate-100 pt-2.5">
                      {isSingle ? (
                        /* Automatically included single item */
                        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/40 p-2.5 sm:p-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {catalogMap.get(course.items[0].toLowerCase().trim())?.image_url ? (
                              <img
                                src={catalogMap.get(course.items[0].toLowerCase().trim()).image_url}
                                alt=""
                                className="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-lg object-cover border border-slate-200/80"
                              />
                            ) : (
                              <span className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 border border-slate-200/80">
                                <UtensilsCrossed size={16} />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                  {course.items[0]}
                                </span>
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.2 text-[10px] font-bold bg-blue-100 text-blue-800">
                                  Included
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {catalogMap.get(course.items[0].toLowerCase().trim())?.description ||
                                  "Automatically included in this combo package"}
                              </p>
                            </div>
                          </div>
                          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#4C81E0] text-white text-[10px] font-bold shrink-0 ml-2 shadow-2xs">
                            ✓
                          </span>
                        </div>
                      ) : (
                        /* Multi-item dish choices grid */
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {course.items.map((dishName) => {
                            const isSelected = isDishSelected(course.category, dishName);
                            const catalogItem = catalogMap.get(dishName.toLowerCase().trim());

                            return (
                              <button
                                key={dishName}
                                type="button"
                                role="checkbox"
                                aria-checked={isSelected}
                                onClick={() => toggleComboDish(course.category, dishName, req)}
                                className={cn(
                                  "group relative flex items-center justify-between gap-2.5 rounded-xl border p-2.5 text-left transition-all cursor-pointer select-none active:scale-[0.99] touch-manipulation",
                                  isSelected
                                    ? "border-[#4C81E0] bg-[#4C81E0]/[0.06] ring-1 ring-[#4C81E0]/50 shadow-xs"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs",
                                  focusRing,
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {catalogItem?.image_url ? (
                                    <span className="relative block h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200/70">
                                      <img
                                        src={catalogItem.image_url}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                      />
                                    </span>
                                  ) : (
                                    <span className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200/50">
                                      <UtensilsCrossed size={15} />
                                    </span>
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <span
                                      className={cn(
                                        "block truncate text-xs font-bold transition-colors leading-snug",
                                        isSelected
                                          ? "text-[#4C81E0]"
                                          : "text-slate-800 group-hover:text-slate-950",
                                      )}
                                    >
                                      {dishName}
                                    </span>
                                    {catalogItem?.description ? (
                                      <p className="line-clamp-1 text-[11px] text-slate-500 leading-tight mt-0.5">
                                        {catalogItem.description}
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 italic leading-tight mt-0.5">
                                        Course selection option
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="shrink-0 pl-1">
                                  <span
                                    className={cn(
                                      "flex h-4.5 w-4.5 items-center justify-center rounded-md border transition-all duration-150",
                                      isSelected
                                        ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
                                        : "border-slate-300 bg-white text-transparent group-hover:border-slate-400 group-hover:bg-slate-50",
                                    )}
                                    aria-hidden="true"
                                  >
                                    <Check size={11} strokeWidth={3} />
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Inclusions & Setup Services */}
          {inclusions.length > 0 && (
            <Card className="p-3 sm:p-3.5">
              <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <span>Package Inclusions</span>
                  <span className="text-[10px] font-normal text-slate-400 font-sans">
                    ({inclusions.length} items)
                  </span>
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                  <Check size={11} strokeWidth={3} /> Included with combo
                </span>
              </div>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs text-slate-700">
                {inclusions.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 rounded-lg bg-slate-50/70 p-2 border border-slate-100">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4C81E0]/15 text-[#4C81E0]">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <span className="font-medium text-xs text-slate-800">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Special preparation notes */}
          <Card className="p-3 sm:p-3.5">
            {requestsField(
              "e.g. Please keep spicy items separated, or note any special preparation requests",
            )}
          </Card>
        </div>
      </StepShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Full service (Food + Event Setup, or a package with catering added)
  // ---------------------------------------------------------------------------
  if (isFullService) {
    const isFoodIncluded = form.include_food !== false;

    return (
      <StepShell
        aside={
          isFoodIncluded ? (
            <EstimateSummary
              estimate={estimate}
              selectedMenu={selected}
              onRemoveDish={remove}
              onClearDishes={clearAll}
              isFoodExpandable
            />
          ) : undefined
        }
        className="max-w-6xl"
      >
        {/* Header with compact catering toggle buttons matching mockup */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3.5 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Food Catering Menu</h2>
            <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
              Choose the dishes you'd like for your guests. Food pricing and details will be discussed and finalized in your official quotation.
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, include_food: true }))}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                isFoodIncluded
                  ? "bg-white text-[#4C81E0] shadow-xs border border-blue-200/80"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <Check
                size={12}
                strokeWidth={isFoodIncluded ? 3 : 2}
                className={isFoodIncluded ? "text-[#4C81E0]" : "text-transparent"}
              />
              Add Catering
            </button>
            <button
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  include_food: false,
                  selected_menu: [],
                }))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                !isFoodIncluded
                  ? "bg-white text-slate-900 shadow-xs border border-slate-300"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              Skip Catering
            </button>
          </div>
        </div>

        {!isFoodIncluded ? (
          <Card className="p-6 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-[#4C81E0] mb-3">
              <Check size={22} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Event Setup Only Selected
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No food catering will be added. You can proceed with Event Setup styling only.
            </p>
            <div className="mt-5 border-t border-slate-100 pt-3 text-left">
              {requestsField(
                "Optional setup notes or special requests for our team",
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-3.5 sm:p-5">{dishBrowser}</Card>
        )}
      </StepShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Food only render
  // ---------------------------------------------------------------------------
  return (
    <StepShell
      aside={
        <EstimateSummary
          estimate={estimate}
          selectedMenu={selected}
          onRemoveDish={remove}
          onClearDishes={clearAll}
          isFoodExpandable
        />
      }
      className="max-w-6xl"
    >
      <SH
        title="Choose Your Dishes"
        sub="Select your dishes for catering. Your per-guest catering rate will be confirmed on your official quotation."
      />

      <Card className="p-3.5 sm:p-5">{dishBrowser}</Card>
    </StepShell>
  );
}
