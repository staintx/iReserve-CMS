import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
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
import { offerMenuRules, offerRuleProgress } from "@/lib/specialOffers";

/** One selectable dish. Price is never shown here — the per-guest rate is
    quotation-based, not a fixed number, so it is only ever summarised in the
    estimate panel rather than promised per dish. */
function DishTile({ item, selected, onToggle }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border text-left transition-colors",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/5"
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
      </span>
    </button>
  );
}

function DishGrid({ items, isSelected, onToggle, emptyMessage }) {
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
  offer = null,
  offerRules = [],
  errors = {},
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

  // ---------------------------------------------------------------------------
  // Open browsing, grouped so the list reads like a menu. No required counts
  // and no cap — a customer picks as many or as few dishes as they like,
  // whether this is a Food Only booking, a Food + Event Setup booking, or a
  // package with catering added.
  // ---------------------------------------------------------------------------
  const [activeGroup, setActiveGroup] = useState("all");

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

  const dishBrowser = (
    <>
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
    </>
  );

  // ---------------------------------------------------------------------------
  // Special Offer
  // ---------------------------------------------------------------------------
  // The one path with required courses, because the offer's per-person price
  // buys a specific meal. Every course, every count and every allowed dish here
  // comes from the offer's own configuration — nothing about which dishes fit
  // which course is decided in this file.
  //
  // There is also no "skip catering" toggle: the food *is* the offer.
  if (offer) {
    const selectedIds = selected.map((item) => String(item._id));
    // The full rule list (including the courses that are simply included and
    // never chosen), so the customer sees everything the price covers.
    const allRules = offerMenuRules(offer);
    const includedRules = allRules.filter(
      (rule) => rule.selectable === false || !Number(rule.required_count),
    );

    const itemById = new Map(
      (menuItems || []).map((item) => [String(item._id), item]),
    );
    // Rules arrive with their allowed items populated by the API; the loaded
    // catalogue is preferred so availability and images are current.
    const itemsForRule = (rule) =>
      (rule.menu_items || [])
        .map((entry) => itemById.get(String(entry?._id || entry)) || entry)
        .filter((item) => item && item._id);

    return (
      <StepShell aside={<EstimateSummary estimate={estimate} />}>
        <SH
          title={`Choose your ${offer.name} menu`}
          sub="Pick the courses your offer includes. Your price per person stays the same whichever dishes you choose."
        />

        {errors.selected_menu && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
          >
            {errors.selected_menu}
          </p>
        )}

        <div className="space-y-4">
          {offerRules.map((rule, index) => {
            const progress = offerRuleProgress(rule, selectedIds);
            const items = itemsForRule(rule);

            return (
              <Card key={rule._id || `${rule.label}-${index}`} className="p-4">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#1E293B]">
                    {rule.label}
                  </h3>
                  {/* Says what is still needed, not just what is wrong — the
                      count is the whole rule, so it is stated plainly. */}
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      progress.complete
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700",
                    )}
                  >
                    {progress.complete
                      ? `${progress.required} of ${progress.required} chosen`
                      : `Choose ${progress.remaining} more of ${progress.required}`}
                  </span>
                </div>

                {rule.note && (
                  <p className="mb-3 text-[13px] text-[#64748B]">{rule.note}</p>
                )}

                <DishGrid
                  items={items}
                  isSelected={isSelected}
                  onToggle={toggle}
                  emptyMessage="No dishes are configured for this course yet. Tell us in the notes below and we'll sort it on your quotation."
                />
              </Card>
            );
          })}

          {includedRules.length > 0 && (
            <Card className="p-4">
              <h3 className="mb-2 text-base font-semibold text-[#1E293B]">
                Also included
              </h3>
              <ul className="space-y-1.5 text-[13px] text-[#64748B]">
                {includedRules.map((rule, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <Check size={14} className="mt-0.5 shrink-0 text-[#4C81E0]" />
                    <span>
                      {rule.label}
                      {rule.note ? ` — ${rule.note}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-4">
            {requestsField(
              "e.g. One guest is allergic to shellfish — please keep their serving separate",
            )}
          </Card>
        </div>
      </StepShell>
    );
  }

  // ---------------------------------------------------------------------------
  // Full service (Food + Event Setup, or a package with catering added): a
  // customer still chooses whether to add food at all, but once they do, the
  // dish picker works exactly like Food Only — no required courses, no cap.
  // ---------------------------------------------------------------------------
  if (isFullService) {
    const isFoodIncluded = form.include_food !== false;

    return (
      <StepShell aside={isFoodIncluded ? <EstimateSummary estimate={estimate} /> : undefined}>
        <SH
          title="Food Catering Menu"
          sub="Choose any dishes you'd like for your guests — as many or as few as you want. Your per-guest price is confirmed on your official quotation."
        />

        {/* Catering Toggle: Include Food vs Setup Only */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, include_food: true }))}
            className={cn(
              "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
              isFoodIncluded
                ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm ring-1 ring-[#4C81E0]"
                : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
              focusRing,
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  isFoodIncluded
                    ? "bg-[#4C81E0] text-white"
                    : "border border-[#CBD5E1] bg-white text-transparent",
                )}
              >
                ✓
              </span>
              <span className="font-semibold text-[#1E293B] text-sm">
                Add Catering / Food Menu
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B] pl-7">
              Choose any dishes you like. Setup and catering are priced
              separately, and your per-guest rate is quoted by our team.
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
              "flex flex-col items-start rounded-xl border p-4 text-left transition-all",
              !isFoodIncluded
                ? "border-[#4C81E0] bg-[#4C81E0]/5 shadow-sm ring-1 ring-[#4C81E0]"
                : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/40",
              focusRing,
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  !isFoodIncluded
                    ? "bg-[#4C81E0] text-white"
                    : "border border-[#CBD5E1] bg-white text-transparent",
                )}
              >
                ✓
              </span>
              <span className="font-semibold text-[#1E293B] text-sm">
                Skip Catering (Event Setup Only)
              </span>
            </div>
            <p className="mt-1 text-xs text-[#64748B] pl-7">
              No food catering needed. Proceed with Event Setup package only.
            </p>
          </button>
        </div>

        {!isFoodIncluded ? (
          <Card className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#4C81E0] mb-3">
              <Check size={24} />
            </div>
            <h3 className="text-base font-semibold text-[#1E293B]">
              Event Setup Only Selected
            </h3>
            <p className="mt-1.5 text-sm text-[#64748B] max-w-md mx-auto">
              No food catering will be added to this booking. You can click Continue below to proceed to extras and contact details.
            </p>
            <div className="mt-6 border-t border-[#E2E8F0] pt-4 text-left">
              {requestsField(
                "Optional setup notes or special requests for our team",
              )}
            </div>
          </Card>
        ) : (
          <Card className="p-4">{dishBrowser}</Card>
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
        sub="Select your dishes for catering — as many or as few as you want. Your per-guest catering rate will be confirmed on your official quotation."
      />

      <Card className="p-4">{dishBrowser}</Card>
    </StepShell>
  );
}
