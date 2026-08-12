import { useMemo, useState } from "react";
import { Check, Droplets, GlassWater, ListChecks, X } from "lucide-react";
import {
  Card,
  SH,
  Field,
  TTextarea,
  StepShell,
} from "../components/BookingSharedUI";
import { focusRing, formatPeso } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import EstimateSummary from "../components/EstimateSummary";
import { resolveGroup, CATEGORY_GROUPS } from "@/lib/menuCategories";
import {
  courseProgress,
  itemsInGroup,
  selectedInGroup,
  DRINKS_GROUP_ID,
  WATER_GROUP_ID,
} from "../lib/bookingRules";

const SUMMARY_SECTION = "summary";
const DRINKS_SECTION = "drinks";

/** One selectable dish. Disabled only when a fixed-count course is already full. */
function DishTile({ item, selected, disabled, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/5"
          : disabled
            ? "cursor-not-allowed border-[#E2E8F0] bg-[#F8FAFC] opacity-50"
            : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
        focusRing,
      )}
    >
      {item.image_url && (
        <span className="block h-24 w-full overflow-hidden bg-[#F8FAFC]">
          <img src={item.image_url} alt="" className="h-full w-full object-cover" />
        </span>
      )}

      {/* Menu photos are bright, so an unselected translucent circle vanished
          against them. A solid chip plus a ring keeps the control readable on
          any image. */}
      <span
        className={cn(
          "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-black/10 transition-colors",
          selected
            ? "bg-[#4C81E0] text-white"
            : "bg-white text-[#CBD5E1] shadow-sm",
        )}
        aria-hidden="true"
      >
        <Check size={12} strokeWidth={3} />
      </span>

      <span className="flex flex-1 flex-col justify-between p-3">
        <span className="block">
          <span className="block pr-6 text-sm font-medium leading-snug text-[#1E293B]">
            {item.name}
          </span>
          {item.description && (
            <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-[#64748B]">
              {item.description}
            </span>
          )}
        </span>
        {item.price > 0 && (
          <span className="mt-2 block text-xs font-medium text-[#64748B]">
            {formatPeso(item.price)} per guest
          </span>
        )}
      </span>
    </button>
  );
}

function DishGrid({ items, isSelected, isDisabled, onToggle, emptyMessage }) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#CBD5E1] py-6 text-center text-sm text-[#94A3B8]">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => (
        <DishTile
          key={item._id}
          item={item}
          selected={isSelected(item)}
          disabled={isDisabled ? isDisabled(item) : false}
          onToggle={() => onToggle(item)}
        />
      ))}
    </div>
  );
}

/** Removable chip. The only way to correct a choice from a summary view. */
function PickChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white py-1 pl-2.5 pr-1 text-[13px] text-[#1E293B]">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#1E293B]",
            focusRing,
          )}
        >
          <X size={12} />
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
}) {
  const selected = useMemo(() => form.selected_menu || [], [form.selected_menu]);

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

  const courses = useMemo(
    () => (isFullService ? courseProgress(selected, menuItems) : []),
    [isFullService, selected, menuItems],
  );

  const drinks = useMemo(
    () => itemsInGroup(menuItems, DRINKS_GROUP_ID),
    [menuItems],
  );
  const waterItems = useMemo(
    () => itemsInGroup(menuItems, WATER_GROUP_ID),
    [menuItems],
  );
  const selectedDrinks = selectedInGroup(selected, DRINKS_GROUP_ID);

  const chosenCount = courses.reduce((sum, c) => sum + c.selectedCount, 0);
  const requiredCount = courses.reduce((sum, c) => sum + c.required, 0);

  // ---------------------------------------------------------------------------
  // Full service: one course at a time, with a rail carrying the progress
  // ---------------------------------------------------------------------------
  // Three fixed-count decisions plus an open one is too much to hold at once,
  // and stacking every catalogue on one page turns the step into a long scroll
  // where progress is invisible. The rail keeps every course one click away and
  // states the counts, so correcting a choice never means starting over.
  const sections = useMemo(() => {
    if (!isFullService) return [];
    return [
      ...courses.map((course) => ({
        id: course.key,
        label: course.label,
        course,
        status: course.unavailable
          ? "unavailable"
          : course.satisfied
            ? "done"
            : "todo",
        hint: course.unavailable
          ? "None available"
          : `${course.selectedCount} of ${course.required}`,
      })),
      {
        id: DRINKS_SECTION,
        label: "Drinks",
        status: "optional",
        hint: selectedDrinks.length > 0 ? `${selectedDrinks.length} chosen` : "Optional",
      },
      {
        id: SUMMARY_SECTION,
        label: "Your menu",
        status: "summary",
        hint: null,
      },
    ];
  }, [isFullService, courses, selectedDrinks.length]);

  // The summary is a destination, not a course, so it is excluded from the
  // mobile progress dots and given its own persistent action instead.
  const courseSections = useMemo(
    () => sections.filter((section) => section.id !== SUMMARY_SECTION),
    [sections],
  );

  const [activeSection, setActiveSection] = useState(null);
  const activeId = activeSection ?? sections[0]?.id;
  const active = sections.find((section) => section.id === activeId) || sections[0];

  // Completing a course moves the customer forward on its own. Corrections do
  // not: the jump only fires on the selection that fills the course, so
  // swapping a dish inside a finished one leaves them where they are.
  const advanceFrom = (sectionId) => {
    const index = sections.findIndex((section) => section.id === sectionId);
    const next =
      sections.slice(index + 1).find((section) => section.status === "todo") ||
      sections[index + 1];
    if (next) setActiveSection(next.id);
  };

  const toggleInCourse = (item, course) => {
    const wasSelected = isSelected(item);
    toggle(item);
    if (!wasSelected && course.selectedCount + 1 === course.required) {
      advanceFrom(course.key);
    }
  };

  // ---------------------------------------------------------------------------
  // Food only: open browsing, grouped so the list reads like a menu
  // ---------------------------------------------------------------------------
  const [activeGroup, setActiveGroup] = useState("all");

  const groupedItems = useMemo(() => {
    if (isFullService) return [];
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
  }, [isFullService, menuItems]);

  const visibleGroups =
    activeGroup === "all"
      ? groupedItems
      : groupedItems.filter((group) => group.id === activeGroup);

  // One field, one explanation. This previously carried a label, a hint and a
  // separate info box all saying much the same thing.
  const requestsField = (placeholder) => (
    <Field
      label="Additional requests or notes"
      hint="Optional. Want something that is not on our menu? Describe it here and we will price it on your quotation."
    >
      <TTextarea
        placeholder={placeholder}
        value={form.special_requests || ""}
        onChange={(val) => setForm({ ...form, special_requests: val })}
        rows={3}
      />
    </Field>
  );

  // ---------------------------------------------------------------------------
  // Full service render
  // ---------------------------------------------------------------------------
  if (isFullService) {
    const waterNames = waterItems.map((item) => item.name).join(", ");

    return (
      <StepShell>
        <SH
          title="Build Your Menu"
          sub="Every guest is served the same courses. Pick one course at a time."
        />

        {/* Course navigation.
            Desktop gets the full rail. On a 390px screen that rail overflowed
            and "Your menu" sat off the right edge, so an important destination
            was only reachable by guessing it was there. Mobile instead gets the
            current course, tappable progress dots, and a permanently visible
            action for the summary, all in two compact rows. */}
        <nav
          aria-label="Menu courses"
          className="-mx-1 mb-4 hidden gap-2 overflow-x-auto px-1 pb-1 sm:flex"
        >
          {sections.map((section) => {
            const isActive = section.id === activeId;
            const isDone = section.status === "done";
            return (
              <button
                key={section.id}
                type="button"
                aria-current={isActive ? "step" : undefined}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors",
                  isActive
                    ? "border-[#4C81E0] bg-[#4C81E0]/5"
                    : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
                  focusRing,
                )}
              >
                {isDone ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                    <Check size={10} strokeWidth={3} />
                  </span>
                ) : section.id === SUMMARY_SECTION ? (
                  <ListChecks size={14} className="text-[#94A3B8]" />
                ) : null}
                <span>
                  <span
                    className={cn(
                      "block text-[13px] font-medium",
                      isActive ? "text-[#1E293B]" : "text-[#64748B]",
                    )}
                  >
                    {section.label}
                  </span>
                  {section.hint && (
                    <span
                      className={cn(
                        "block text-[11px] tabular-nums",
                        isDone ? "text-emerald-600" : "text-[#94A3B8]",
                      )}
                    >
                      {section.hint}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="mb-3 sm:hidden">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-medium text-[#1E293B]">{active?.label}</p>
            {active?.hint && (
              <p
                className={cn(
                  "text-[13px] tabular-nums",
                  active.status === "done" ? "text-emerald-600" : "text-[#64748B]",
                )}
                aria-live="polite"
              >
                {active.hint}
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {courseSections.map((section) => {
              const isActive = section.id === activeId;
              const isDone = section.status === "done";
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`${section.label}${section.hint ? `, ${section.hint}` : ""}`}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    isActive
                      ? "bg-[#4C81E0]"
                      : isDone
                        ? "bg-emerald-400"
                        : "bg-[#E2E8F0]",
                    focusRing,
                  )}
                />
              );
            })}
          </div>
        </div>

        {/* The summary is one tap away at all times on mobile, instead of
            living at the far end of a horizontally scrolling rail. */}
        <button
          type="button"
          onClick={() =>
            setActiveSection(
              activeId === SUMMARY_SECTION ? courseSections[0]?.id : SUMMARY_SECTION,
            )
          }
          className={cn(
            "mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#4C81E0] transition-colors hover:border-[#4C81E0]/50 sm:hidden",
            focusRing,
          )}
        >
          {activeId === SUMMARY_SECTION ? (
            "Back to courses"
          ) : (
            <>
              <ListChecks size={15} />
              Review your menu
              <span className="font-medium text-[#64748B]">
                ({chosenCount} of {requiredCount} chosen)
              </span>
            </>
          )}
        </button>

        <Card className="p-4">
          {active?.course && (
            <>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                <h3 className="text-sm font-semibold text-[#1E293B]">
                  {active.course.label}
                </h3>
                {!active.course.unavailable && (
                  <p
                    className={cn(
                      "text-[13px] font-medium tabular-nums",
                      active.course.satisfied
                        ? "text-emerald-600"
                        : "text-[#64748B]",
                    )}
                    aria-live="polite"
                  >
                    Choose {active.course.required}
                    {" · "}
                    {active.course.selectedCount} of {active.course.required}{" "}
                    selected
                  </p>
                )}
              </div>

              {active.course.satisfied && (
                <p className="mb-3 text-[13px] text-[#64748B]">
                  Done. Tap a selected dish to swap it.
                </p>
              )}

              <DishGrid
                items={active.course.available}
                isSelected={isSelected}
                isDisabled={(item) =>
                  !isSelected(item) && active.course.satisfied
                }
                onToggle={(item) => toggleInCourse(item, active.course)}
                emptyMessage={`No ${active.course.label.toLowerCase()} are on the menu today. Tell us what you would like under Your menu and we will price it.`}
              />
            </>
          )}

          {active?.id === DRINKS_SECTION && (
            <>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#E2E8F0] pb-2">
                <h3 className="text-sm font-semibold text-[#1E293B]">Drinks</h3>
                <p className="text-[13px] text-[#64748B]" aria-live="polite">
                  Optional
                  {selectedDrinks.length > 0
                    ? ` · ${selectedDrinks.length} chosen`
                    : ""}
                </p>
              </div>

              <p className="mb-3 text-[13px] text-[#64748B]">
                Water is already included for every guest. Add any other drinks
                you want served. We confirm serving quantities on your quotation.
              </p>

              <DishGrid
                items={drinks}
                isSelected={isSelected}
                onToggle={toggle}
                emptyMessage="No drinks are on the menu today. Tell us what you would like under Your menu and we will price it."
              />
            </>
          )}

          {active?.id === SUMMARY_SECTION && (
            <>
              <h3 className="mb-3 border-b border-[#E2E8F0] pb-2 text-sm font-semibold text-[#1E293B]">
                Your menu
              </h3>

              <dl className="space-y-3">
                {courses.map((course) => (
                  <div key={course.key}>
                    <dt className="mb-1.5 flex items-baseline gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                      {course.label}
                      {!course.unavailable && !course.satisfied && (
                        <span className="font-medium normal-case tracking-normal text-amber-600">
                          {course.selectedCount} of {course.required} chosen
                        </span>
                      )}
                    </dt>
                    <dd className="flex flex-wrap gap-2">
                      {course.selected.length > 0 ? (
                        course.selected.map((item) => (
                          <PickChip
                            key={item._id}
                            label={item.name}
                            onRemove={() => remove(item)}
                          />
                        ))
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveSection(course.key)}
                          className={cn(
                            "rounded text-[13px] font-medium text-[#4C81E0] underline",
                            focusRing,
                          )}
                        >
                          Choose {course.label.toLowerCase()}
                        </button>
                      )}
                    </dd>
                  </div>
                ))}

                <div>
                  <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Water
                  </dt>
                  <dd className="flex items-center gap-2 text-[13px] text-[#64748B]">
                    <Droplets size={14} className="shrink-0 text-[#4C81E0]" />
                    Included free for every guest
                    {waterNames ? ` (${waterNames})` : ""}. Nothing to select.
                  </dd>
                </div>

                <div>
                  <dt className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                    Drinks
                  </dt>
                  <dd className="flex flex-wrap gap-2">
                    {selectedDrinks.length > 0 ? (
                      selectedDrinks.map((item) => (
                        <PickChip
                          key={item._id}
                          label={item.name}
                          onRemove={() => remove(item)}
                        />
                      ))
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B]">
                        <GlassWater size={14} className="text-[#94A3B8]" />
                        None beyond the included water
                      </span>
                    )}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 border-t border-[#E2E8F0] pt-4">
                {requestsField(
                  "e.g. Please serve the kids' table first, and we would like pork barbecue if you can source it",
                )}
              </div>
            </>
          )}
        </Card>

        {/* Menu choices do not move the per-guest rate, so the full cost panel
            would be a distraction here. One line keeps the number in view. */}
        <EstimateSummary
          estimate={estimate}
          variant="bar"
          note="Your price is per guest, so these menu choices do not change it."
          className="mt-4"
        />
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
        sub="Prices are per guest, so your estimate is the dishes you pick times your guest count."
      />

      <Card className="p-4">
        {/* Running selection, so picks stay visible and removable without
            scrolling back through the catalogue. */}
        {selected.length > 0 && (
          <div className="mb-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
              {selected.length} {selected.length === 1 ? "dish" : "dishes"} selected
            </p>
            <div className="flex flex-wrap gap-2">
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

        <div
          className="-mx-1 mb-4 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] sm:[mask-image:none]"
          role="group"
          aria-label="Filter dishes by course"
        >
          {[{ id: "all", label: "All dishes" }, ...groupedItems].map((group) => (
            <button
              key={group.id}
              type="button"
              aria-pressed={activeGroup === group.id}
              className={cn(
                "shrink-0 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors",
                activeGroup === group.id
                  ? "border-[#4C81E0] bg-[#4C81E0]/5 text-[#1E293B]"
                  : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#4C81E0]/40",
                focusRing,
              )}
              onClick={() => setActiveGroup(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>

        {visibleGroups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[#CBD5E1] py-8 text-center text-sm text-[#94A3B8]">
            No dishes are available right now. Describe what you want in the
            notes below and we will price it for you.
          </p>
        ) : (
          <div className="space-y-5">
            {visibleGroups.map((group) => (
              <section key={group.id}>
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8]">
                  {group.label}
                </h3>
                <DishGrid
                  items={group.items}
                  isSelected={isSelected}
                  onToggle={toggle}
                  emptyMessage="No dishes in this course."
                />
              </section>
            ))}
          </div>
        )}

        <div className="mt-4 border-t border-[#E2E8F0] pt-4">
          {requestsField(
            "e.g. We would like pork barbecue if you can source it, and keep the pancit separate",
          )}
        </div>
      </Card>
    </StepShell>
  );
}
