import { useEffect, useMemo, useState } from "react";
import {
  Check,
  X,
  Search,
  UtensilsCrossed,
  RotateCcw,
  ChevronDown,
  ChevronLeft,
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
import { resolveGroup, CATEGORY_GROUPS } from "@/lib/menuCategories";
import CourseFilterBar from "../components/CourseFilterBar";
import {
  offerFoodByCategory,
  offerCourseRequirement,
  offerInclusions,
  offerGuestCount,
  offerPricePerPax,
} from "@/lib/specialOffers";

/**
 * Clean, touch-optimized dish selection card.
 * Features crisp typography, image thumbnail, clear selected state, and responsive sizing.
 */
function DishRow({ item, selected, onToggle }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      onClick={onToggle}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-xl border p-2.5 text-left transition-all cursor-pointer select-none active:scale-[0.99] touch-manipulation",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/[0.06] ring-1 ring-[#4C81E0]/50 shadow-xs"
          : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs",
        focusRing,
      )}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {item.image_url ? (
          <span className="relative block h-12 w-12 sm:h-13 sm:w-13 shrink-0 overflow-hidden rounded-lg bg-slate-100 border border-slate-200/70">
            <img
              src={item.image_url}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            />
          </span>
        ) : (
          <span className="flex h-12 w-12 sm:h-13 sm:w-13 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200/50">
            <UtensilsCrossed size={18} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-xs sm:text-sm font-bold transition-colors leading-snug",
              selected
                ? "text-[#4C81E0]"
                : "text-slate-800 group-hover:text-slate-950",
            )}
          >
            {item.name}
          </span>
          {item.description ? (
            <p className="line-clamp-1 sm:line-clamp-2 text-[11px] text-slate-500 leading-tight mt-0.5">
              {item.description}
            </p>
          ) : (
            <p className="text-[11px] text-slate-400 italic leading-tight mt-0.5">
              Standard catering preparation
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 pl-1">
        <span
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-150",
            selected
              ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
              : "border-slate-300 bg-white text-transparent group-hover:border-slate-400 group-hover:bg-slate-50",
          )}
          aria-hidden="true"
        >
          <Check size={12} strokeWidth={3} />
        </span>
      </div>
    </button>
  );
}

function DishGrid({ items, isSelected, onToggle, emptyMessage }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
      {items.map((item) => (
        <DishRow
          key={item._id}
          item={item}
          selected={isSelected(item)}
          onToggle={() => onToggle(item)}
        />
      ))}
    </div>
  );
}

/** Removable chip for the docked selected dishes tray. */
function PickChip({ item, onRemove }) {
  const group = resolveGroup(item.category);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#4C81E0]/30 bg-blue-50/80 py-1 pl-2.5 pr-1.5 text-xs font-medium text-blue-900 shadow-2xs">
      <span className="truncate max-w-[130px] sm:max-w-[180px] font-semibold">
        {item.name}
      </span>
      {group?.label && (
        <span className="hidden sm:inline text-[10px] text-blue-600/80 bg-blue-100/60 px-1 py-0.2 rounded font-sans">
          {group.label}
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.name}`}
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded text-blue-700 hover:bg-blue-200 hover:text-blue-900 cursor-pointer ml-0.5",
            focusRing,
          )}
        >
          <X size={11} />
        </button>
      )}
    </span>
  );
}

export default function StepMenuSelection({
  form,
  setForm,
  menuItems,
  estimate,
  isFullService,
  offer = null,
}) {
  const selected = useMemo(() => form.selected_menu || [], [form.selected_menu]);
  const [activeGroup, setActiveGroup] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [hasInitializedAccordion, setHasInitializedAccordion] = useState(false);
  const courses = useMemo(
    () => (offer ? offerFoodByCategory(offer) : []),
    [offer],
  );

  useEffect(() => {
    setHasInitializedAccordion(false);
  }, [offer?._id, offer?.id]);

  /**
   * Initialize expanded category for Special Offer accordion.
   * Expands the first incomplete category; if all are completed, leaves all collapsed.
   */
  useEffect(() => {
    if (!offer || hasInitializedAccordion || courses.length === 0) return;

    const snapshot = Array.isArray(form.offer_food_snapshot)
      ? form.offer_food_snapshot
      : [];

    const firstIncomplete = courses.find((course) => {
      if (course.items.length === 1) return false;
      const req = offerCourseRequirement(course.category);
      const selectedInCat = snapshot.filter(
        (entry) => entry.menu_category === course.category,
      );
      return selectedInCat.length < req;
    });

    setExpandedCategory(firstIncomplete ? firstIncomplete.category : null);
    setHasInitializedAccordion(true);
  }, [offer, courses, form.offer_food_snapshot, hasInitializedAccordion]);

  const handleToggleCategory = (category) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  /**
   * Seeding single-item combo courses into snapshot.
   */
  useEffect(() => {
    if (!offer || courses.length === 0) return;

    setForm((prev) => {
      const current = Array.isArray(prev.offer_food_snapshot)
        ? prev.offer_food_snapshot
        : [];
      const missing = courses.filter(
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
  }, [offer, courses, setForm]);

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

  const remove = (item) =>
    setForm((prev) => ({
      ...prev,
      selected_menu: (prev.selected_menu || []).filter(
        (chosen) => String(chosen._id) !== String(item._id),
      ),
    }));

  const clearAll = () =>
    setForm((prev) => ({
      ...prev,
      selected_menu: [],
    }));

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
  useEffect(() => {
    if (groupedItems.length > 0) {
      if (!activeGroup || !groupedItems.some((g) => g.id === activeGroup)) {
        setActiveGroup(groupedItems[0].id);
      }
    }
  }, [groupedItems, activeGroup]);

  const currentGroup = useMemo(() => {
    if (groupedItems.length === 0) return null;
    return groupedItems.find((g) => g.id === activeGroup) || groupedItems[0];
  }, [groupedItems, activeGroup]);

  const currentGroupIndex = useMemo(() => {
    if (!currentGroup) return -1;
    return groupedItems.findIndex((g) => g.id === currentGroup.id);
  }, [groupedItems, currentGroup]);

  const prevGroup = currentGroupIndex > 0 ? groupedItems[currentGroupIndex - 1] : null;
  const nextGroup =
    currentGroupIndex >= 0 && currentGroupIndex < groupedItems.length - 1
      ? groupedItems[currentGroupIndex + 1]
      : null;

  const q = searchQuery.trim().toLowerCase();

  // Filter items in the current active category by search query
  const activeDishes = useMemo(() => {
    if (!currentGroup) return [];
    if (!q) return currentGroup.items;
    return currentGroup.items.filter(
      (item) =>
        item.name?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q),
    );
  }, [currentGroup, q]);

  // Matches in other categories for the current search query
  const otherMatches = useMemo(() => {
    if (!q || !currentGroup) return [];
    return groupedItems
      .filter((g) => g.id !== currentGroup.id)
      .map((g) => ({
        id: g.id,
        label: g.label,
        count: g.items.filter(
          (item) =>
            item.name?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q),
        ).length,
      }))
      .filter((g) => g.count > 0);
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
    <div className="space-y-3.5 max-w-full overflow-hidden">
      {/* 1. Quick Search Bar */}
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search dishes in ${currentGroup?.label || "menu"} or ingredients (e.g. Sisig, Pork, Pancit)...`}
          aria-label="Search dishes"
          className={cn(
            "h-9.5 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0] shadow-2xs",
            focusRing,
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Cross-category search match suggestions when searching */}
      {q && otherMatches.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/40 p-2 text-xs text-slate-600">
          <span className="text-[11px] font-medium text-slate-500">Also found in:</span>
          {otherMatches.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => setActiveGroup(match.id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md bg-white border border-blue-200 px-2 py-0.5 text-[11px] font-semibold text-[#4C81E0] hover:bg-blue-50 cursor-pointer shadow-2xs transition-colors",
                focusRing,
              )}
            >
              <span>{match.label}</span>
              <span className="rounded-full bg-blue-100 px-1 text-[10px] text-blue-800 font-bold">
                {match.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 2. Docked Selected Dishes Tray */}
      {selected.length > 0 && (
        <div className="rounded-xl border border-blue-200/80 bg-blue-50/40 p-3 shadow-2xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[10px]">
                ✓
              </span>
              <span>Your Selected Menu ({selected.length} {selected.length === 1 ? "dish" : "dishes"})</span>
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
            {selected.map((item) => (
              <PickChip
                key={item._id}
                item={item}
                onRemove={() => remove(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Primary Food Category Navigation */}
      <CourseFilterBar
        activeGroup={currentGroup?.id || activeGroup}
        onSelectGroup={setActiveGroup}
        totalDishCount={menuItems?.length || 0}
        groups={groupedItems}
        selectedCountsByGroup={selectedCountsByGroup}
        showAll={false}
      />

      {/* 4. Active Category Dish Selection View */}
      {currentGroup ? (
        <div className="space-y-3 pt-1">
          {/* Active Category Header with Live Status and Stepping */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <span>{currentGroup.label}</span>
                <span className="text-[11px] font-normal text-slate-400 lowercase font-sans">
                  ({activeDishes.length} {activeDishes.length === 1 ? "dish" : "dishes"})
                </span>
              </h3>

              {selectedCountsByGroup[currentGroup.id] > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-[#4C81E0] ring-1 ring-[#4C81E0]/30">
                  <Check size={11} strokeWidth={3} />
                  {selectedCountsByGroup[currentGroup.id]} selected
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  (none selected)
                </span>
              )}
            </div>

            {/* Previous / Next Category Stepper Controls */}
            <div className="flex items-center gap-1.5 text-xs ml-auto">
              {prevGroup && (
                <button
                  type="button"
                  onClick={() => setActiveGroup(prevGroup.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors shadow-2xs",
                    focusRing,
                  )}
                  title={`Previous: ${prevGroup.label}`}
                >
                  <ChevronLeft size={12} />
                  <span className="hidden sm:inline">{prevGroup.label}</span>
                </button>
              )}
              {nextGroup && (
                <button
                  type="button"
                  onClick={() => setActiveGroup(nextGroup.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border border-[#4C81E0]/30 bg-blue-50/70 px-2 py-1 text-[11px] font-semibold text-[#4C81E0] hover:bg-blue-100/70 cursor-pointer transition-colors shadow-2xs",
                    focusRing,
                  )}
                  title={`Next: ${nextGroup.label}`}
                >
                  <span>Next: {nextGroup.label}</span>
                  <ChevronRight size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Dishes in Active Category */}
          {activeDishes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 space-y-2.5">
              {q ? (
                <>
                  <p>No dishes in {currentGroup.label} match “{searchQuery}”.</p>
                  {otherMatches.length > 0 ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] text-slate-500">
                        Matches found in other courses:
                      </p>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {otherMatches.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setActiveGroup(m.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-[#4C81E0] hover:bg-blue-100 cursor-pointer"
                          >
                            <span>{m.label} ({m.count})</span>
                            <ChevronRight size={11} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    Clear search
                  </button>
                </>
              ) : (
                <p>No dishes currently listed under this course.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <DishGrid
                items={activeDishes}
                isSelected={isSelected}
                onToggle={toggle}
                emptyMessage="No dishes available."
              />

              {/* Bottom course transition helper */}
              {nextGroup && !q && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setActiveGroup(nextGroup.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#4C81E0]/40 hover:bg-slate-50 hover:text-[#4C81E0] transition-all cursor-pointer shadow-2xs",
                      focusRing,
                    )}
                  >
                    <span>Continue to {nextGroup.label}</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
          Loading menu items...
        </div>
      )}

      {/* 5. Special requests field */}
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
    const courses = offerFoodByCategory(offer);
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
      <StepShell aside={isFoodIncluded ? <EstimateSummary estimate={estimate} /> : undefined}>
        <SH
          title="Food Catering Menu"
          sub="Choose any dishes you'd like for your guests. Food pricing and details will be discussed and finalized in your official quotation."
        />

        {/* Catering Toggle: Include Food vs Setup Only */}
        <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, include_food: true }))}
            className={cn(
              "flex flex-col items-start rounded-lg border p-3 text-left transition-all cursor-pointer",
              isFoodIncluded
                ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0] shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300",
              focusRing,
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                  isFoodIncluded
                    ? "bg-[#4C81E0] text-white"
                    : "border border-slate-300 bg-white text-transparent",
                )}
              >
                ✓
              </span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                Add Catering / Food Menu
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 pl-6">
              Choose dishes from our menu. The price will be discussed and finalized through the quotation.
            </p>
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
              "flex flex-col items-start rounded-lg border p-3 text-left transition-all cursor-pointer",
              !isFoodIncluded
                ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0] shadow-xs"
                : "border-slate-200 bg-white hover:border-slate-300",
              focusRing,
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition-colors",
                  !isFoodIncluded
                    ? "bg-[#4C81E0] text-white"
                    : "border border-slate-300 bg-white text-transparent",
                )}
              >
                ✓
              </span>
              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                Skip Catering (Event Setup Only)
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 pl-6">
              No food catering needed. Proceed with Event Setup styling only.
            </p>
          </button>
        </div>

        {!isFoodIncluded ? (
          <Card className="p-5 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-[#4C81E0] mb-2.5">
              <Check size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Event Setup Only Selected
            </h3>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              No food catering will be added. You can proceed to extras and contact details.
            </p>
            <div className="mt-4 border-t border-slate-100 pt-3 text-left">
              {requestsField(
                "Optional setup notes or special requests for our team",
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-3.5 sm:p-4">{dishBrowser}</Card>
        )}
      </StepShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Food only render
  // ---------------------------------------------------------------------------
  return (
    <StepShell aside={<EstimateSummary estimate={estimate} />}>
      <SH
        title="Choose Your Dishes"
        sub="Select your dishes for catering. Your per-guest catering rate will be confirmed on your official quotation."
      />

      <Card className="p-3.5 sm:p-4">{dishBrowser}</Card>
    </StepShell>
  );
}
