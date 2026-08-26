import { useEffect, useMemo, useState } from "react";
import { Check, X, Search, UtensilsCrossed, RotateCcw } from "lucide-react";
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
import {
  offerFoodByCategory,
  offerCourseRequirement,
  offerInclusions,
  offerGuestCount,
  offerPricePerPax,
} from "@/lib/specialOffers";

/**
 * Compact horizontal dish row (Mobbin / DoorDash / Toast pattern).
 * Gracefully handles items with and without images, maintaining a tight 52-56px height.
 */
function DishRow({ item, selected, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "group relative flex items-center justify-between gap-2.5 rounded-lg border p-2 text-left transition-all cursor-pointer select-none",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/[0.04] ring-1 ring-[#4C81E0]/60 shadow-2xs"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 shadow-2xs",
        focusRing,
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        {item.image_url ? (
          <span className="block h-10 w-10 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-md bg-slate-100 border border-slate-200/70">
            <img
              src={item.image_url}
              alt=""
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </span>
        ) : (
          <span className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 border border-slate-200/50">
            <UtensilsCrossed size={15} />
          </span>
        )}

        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-bold text-slate-800 group-hover:text-[#4C81E0] transition-colors leading-tight">
            {item.name}
          </span>
          {item.description && (
            <span className="line-clamp-1 block text-[11px] text-slate-500 leading-tight mt-0.5">
              {item.description}
            </span>
          )}
        </span>
      </div>

      <span
        className={cn(
          "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ml-1.5",
          selected
            ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
            : "border-slate-300 bg-white text-transparent group-hover:border-slate-400",
        )}
        aria-hidden="true"
      >
        <Check size={11} strokeWidth={3} />
      </span>
    </button>
  );
}

function DishGrid({ items, isSelected, onToggle, emptyMessage }) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400">
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
function PickChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 py-0.5 pl-2 pr-1 text-xs font-medium text-blue-900 shadow-2xs">
      <span className="truncate max-w-[130px]">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className={cn(
            "flex h-3.5 w-3.5 items-center justify-center rounded text-blue-700 hover:bg-blue-200 hover:text-blue-900 cursor-pointer",
            focusRing,
          )}
        >
          <X size={10} />
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
  const [activeGroup, setActiveGroup] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  /**
   * Seeding single-item combo courses into snapshot.
   */
  useEffect(() => {
    if (courses.length === 0) return;

    setForm((prev) => {
      const current = Array.isArray(prev.offer_food_snapshot)
        ? prev.offer_food_snapshot
        : [];
      const missing = courses.filter(
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
  }, [offer, setForm]);

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

  // Group items by category course
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

  // Filter groups by active tab and search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return groupedItems
      .filter((group) => activeGroup === "all" || group.id === activeGroup)
      .map((group) => {
        const matchingItems = q
          ? group.items.filter(
              (item) =>
                item.name?.toLowerCase().includes(q) ||
                item.description?.toLowerCase().includes(q),
            )
          : group.items;

        return {
          ...group,
          items: matchingItems,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [groupedItems, activeGroup, searchQuery]);

  const requestsField = (placeholder) => (
    <Field
      label="Additional requests or notes"
      hint="Optional. Custom dishes not on the menu or special preparation notes."
    >
      <TTextarea
        placeholder={placeholder}
        value={form.special_requests || ""}
        onChange={(val) => setForm({ ...form, special_requests: val })}
        rows={3}
      />
    </Field>
  );

  const dishBrowser = (
    <div className="space-y-3">
      {/* 1. Quick Search Bar */}
      <div className="relative">
        <Search
          size={13}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search dishes by name or ingredients (e.g. Sisig, Lumpia, Pork, Pancit)..."
          aria-label="Search dishes"
          className={cn(
            "h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]",
            focusRing,
          )}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 2. Docked Selected Dishes Tray */}
      {selected.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2.5">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
              Selected Menu ({selected.length} {selected.length === 1 ? "dish" : "dishes"})
            </span>
            <button
              type="button"
              onClick={clearAll}
              className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selected.map((item) => (
              <PickChip
                key={item._id}
                label={item.name}
                onRemove={() => remove(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3. Category Tabs Bar with Counts & Selection Badges */}
      <div
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none"
        role="group"
        aria-label="Filter dishes by course"
      >
        <button
          type="button"
          aria-pressed={activeGroup === "all"}
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
            activeGroup === "all"
              ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            focusRing,
          )}
          onClick={() => setActiveGroup("all")}
        >
          <span>All dishes</span>
          <span
            className={cn(
              "text-[10px] px-1 py-0.2 rounded font-mono font-bold",
              activeGroup === "all"
                ? "bg-white/20 text-white"
                : "bg-slate-100 text-slate-500",
            )}
          >
            {menuItems?.length || 0}
          </span>
        </button>

        {groupedItems.map((group) => {
          const countInThis = group.items.length;
          const selectedInThis = selectedCountsByGroup[group.id] || 0;
          const isActive = activeGroup === group.id;

          return (
            <button
              key={group.id}
              type="button"
              aria-pressed={isActive}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                isActive
                  ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
                focusRing,
              )}
              onClick={() => setActiveGroup(group.id)}
            >
              <span>{group.label}</span>
              <span
                className={cn(
                  "text-[10px] px-1 py-0.2 rounded font-mono font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : selectedInThis > 0
                      ? "bg-blue-100 text-blue-800"
                      : "bg-slate-100 text-slate-500",
                )}
              >
                {countInThis}
              </span>
              {selectedInThis > 0 && !isActive && (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#4C81E0] text-white text-[9px] font-bold">
                  {selectedInThis}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Filtered Dishes List */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-xs text-slate-400 space-y-2">
          <p>No dishes match “{searchQuery}”.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setActiveGroup("all");
            }}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#4C81E0] hover:underline cursor-pointer"
          >
            <RotateCcw size={12} />
            Reset search &amp; filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => {
            const selectedInThis = selectedCountsByGroup[group.id] || 0;

            return (
              <section key={group.id}>
                <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <span>{group.label}</span>
                    <span className="text-[10px] font-normal text-slate-400 lowercase font-sans">
                      ({group.items.length} items)
                    </span>
                  </h3>
                  {selectedInThis > 0 && (
                    <span className="text-[11px] font-semibold text-[#4C81E0]">
                      {selectedInThis} selected
                    </span>
                  )}
                </div>

                <DishGrid
                  items={group.items}
                  isSelected={isSelected}
                  onToggle={toggle}
                  emptyMessage="No dishes in this course."
                />
              </section>
            );
          })}
        </div>
      )}

      {/* 5. Special requests field */}
      <div className="mt-3 border-t border-slate-100 pt-3">
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

      if (requiredCount === 1) {
        const otherCategories = currentSnapshot.filter(
          (entry) => entry.menu_category !== category,
        );
        const next = [...otherCategories, { menu_category: category, item_name: itemName }];
        setForm((prev) => ({
          ...prev,
          offer_food_snapshot: next,
        }));
      } else {
        if (isAlready) {
          const next = currentSnapshot.filter(
            (entry) =>
              !(entry.menu_category === category && entry.item_name === itemName),
          );
          setForm((prev) => ({ ...prev, offer_food_snapshot: next }));
        } else {
          if (existingInCat.length < requiredCount) {
            const next = [
              ...currentSnapshot,
              { menu_category: category, item_name: itemName },
            ];
            setForm((prev) => ({ ...prev, offer_food_snapshot: next }));
          } else {
            const otherInCat = existingInCat.slice(1);
            const otherCategories = currentSnapshot.filter(
              (entry) => entry.menu_category !== category,
            );
            const next = [
              ...otherCategories,
              ...otherInCat,
              { menu_category: category, item_name: itemName },
            ];
            setForm((prev) => ({ ...prev, offer_food_snapshot: next }));
          }
        }
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
          sub="Choose your preferred dish for each course included in this special offer."
        />

        <div className="space-y-3">
          <Card className="p-3 sm:p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <span className="text-sm font-bold text-slate-900">
                  {pax} {pax === 1 ? "guest" : "guests"}
                </span>
                {perPax > 0 && (
                  <span className="text-xs text-slate-500">
                    ₱{perPax.toLocaleString("en-PH")} / pax · ₱{(pax * perPax).toLocaleString("en-PH")} food package total
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-colors",
                    allCompleted
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
                  )}
                >
                  {allCompleted ? <Check size={12} /> : null}
                  {completedCoursesCount} of {courses.length} courses completed
                </span>
              </div>
            </div>
          </Card>

          {courses.map((course) => {
            const req = offerCourseRequirement(course.category);
            const selectedInThis = getSelectedForCategory(course.category);
            const isCategoryComplete =
              selectedInThis.length >= req ||
              (course.items.length === 1 && isDishSelected(course.category, course.items[0]));

            return (
              <Card key={course.category} className="p-3 sm:p-3.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      {course.category}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {course.items.length === 1
                        ? "Automatically included with this combo"
                        : req === 1
                          ? "Select 1 dish below"
                          : `Select ${req} dishes below`}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors",
                      isCategoryComplete
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
                    )}
                  >
                    {isCategoryComplete ? (
                      <>
                        <Check size={11} strokeWidth={3} />
                        {selectedInThis.length > 0 ? `${selectedInThis.length} selected` : "Included"}
                      </>
                    ) : (
                      `Choose ${req} (${selectedInThis.length}/${req})`
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-2">
                  {course.items.map((dishName) => {
                    const isSelected = isDishSelected(course.category, dishName);
                    return (
                      <button
                        key={dishName}
                        type="button"
                        onClick={() => toggleComboDish(course.category, dishName, req)}
                        className={cn(
                          "group flex items-center justify-between rounded-lg border p-2 text-left transition-all cursor-pointer",
                          isSelected
                            ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0] shadow-2xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                          focusRing,
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-400 border border-slate-200/50">
                            <UtensilsCrossed size={13} />
                          </span>
                          <span className="font-bold text-slate-800 text-xs truncate">
                            {dishName}
                          </span>
                        </div>

                        <span
                          className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ml-2",
                            isSelected
                              ? "bg-[#4C81E0] text-white shadow-2xs"
                              : "border border-slate-300 bg-white text-transparent group-hover:border-slate-400",
                          )}
                        >
                          <Check size={10} strokeWidth={3} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}

          {inclusions.length > 0 && (
            <Card className="p-3 sm:p-3.5">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-900">
                Inclusions &amp; Setup Services
              </h3>
              <p className="mb-2 text-[11px] text-slate-500">
                Included with this combo package:
              </p>
              <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 text-xs text-slate-700">
                {inclusions.map((item, index) => (
                  <li key={index} className="flex items-center gap-1.5 rounded-md bg-slate-50 p-2 border border-slate-100">
                    <Check size={13} className="shrink-0 text-[#4C81E0]" />
                    <span className="font-medium text-xs">{item}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-3.5">
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
          sub="Choose any dishes you'd like for your guests. Your per-guest price is confirmed on your official quotation."
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
              Choose dishes from our menu. Catering rate is quoted per guest.
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
