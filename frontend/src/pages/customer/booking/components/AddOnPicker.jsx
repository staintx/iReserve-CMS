import { useMemo, useState } from "react";
import { Check, Info, Search } from "lucide-react";
import { QtyStepper } from "./BookingSharedUI";
import { focusRing, formatPeso } from "../lib/bookingUI";
import { cn } from "@/lib/utils";

/**
 * The add-on chooser, shared by both add-on steps.
 *
 * It replaces a grid of tiles that each carried a clamped title, a repeated
 * "Priced on official quotation" line and its own full-width "Add to Booking"
 * button. Three add-ons filled the screen, names were cut off mid-word
 * ("Basic Lights &..."), and the only way to tell an added item from an
 * unadded one was to read the button on it.
 *
 * What replaced it is a list of rows, because that is what this is: a set of
 * things to tick. One row is one add-on, the whole row is the control, and the
 * box on the left is the state — so a scan down the left edge answers "what
 * have I added?" without reading anything. The name gets the full width and is
 * never truncated; the price sits on the right where prices line up; and the
 * sentence every tile used to repeat is said once, above the list.
 *
 * Pricing is untouched — this only changes how add-ons are picked. Selections
 * still travel as {name, price, quantity} and reach the estimate and the
 * quotation exactly as before.
 *
 * `items` are normalised by the caller into { key, name, description, price,
 * isQuantity }, so package add-ons and standalone service add-ons — two
 * different shapes in the API — render through one component.
 */
export default function AddOnPicker({
  items = [],
  quantityOf,
  onToggle,
  onQuantityChange,
  emptyTitle = "No add-ons available",
  emptyHint = "You can describe what you need in the notes box.",
}) {
  const [query, setQuery] = useState("");

  // A filter is help on a long list and clutter on a short one, so it appears
  // only once scanning has actually become work.
  const isSearchable = items.length > 6;

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      `${item.name} ${item.description || ""}`.toLowerCase().includes(term),
    );
  }, [items, query]);

  if (items.length === 0) {
    return (
      <div className="mt-2 rounded-2xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC]/60 p-8 text-center">
        <Info className="mx-auto mb-2.5 h-6 w-6 text-[#94A3B8]" />
        <p className="text-sm font-semibold text-[#1E293B]">{emptyTitle}</p>
        <p className="mt-1 text-xs text-[#64748B]">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      {/* Said once, for the whole list, instead of on every item. */}
      <p className="text-xs leading-relaxed text-[#64748B]">
        Tap an add-on to include it. Anything marked{" "}
        <span className="font-medium text-[#475569]">On quotation</span> is
        priced by our team on your official quotation.
      </p>

      {isSearchable && (
        <div className="relative mt-3">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${items.length} add-ons`}
            aria-label="Search add-ons"
            className={cn(
              "h-10 w-full rounded-xl border border-[#E2E8F0] bg-white pl-9 pr-3 text-[13px] text-[#1E293B] placeholder:text-[#94A3B8]",
              focusRing,
            )}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[#E2E8F0] px-3 py-4 text-center text-[13px] text-[#64748B]">
          No add-on matches “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visible.map((item) => {
            const quantity = quantityOf(item) || 0;
            const isSelected = quantity > 0;
            const hasPrice = Number(item.price) > 0;

            return (
              <li
                key={item.key}
                className={cn(
                  "flex items-stretch rounded-xl border transition-colors",
                  isSelected
                    ? "border-[#4C81E0] bg-[#4C81E0]/[0.05]"
                    : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50 hover:bg-[#F8FAFC]",
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(item)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left",
                    focusRing,
                  )}
                >
                  {/* The selected state, as a checkbox rather than as the wording
                      of a button — readable in one pass down the list. */}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0] text-white"
                        : "border-[#CBD5E1] bg-white text-transparent",
                    )}
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug text-[#1E293B]">
                      {item.name}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-[#64748B]">
                        {item.description}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "shrink-0 text-right text-xs",
                      hasPrice
                        ? "font-semibold tabular-nums text-[#1E293B]"
                        : "font-medium text-[#94A3B8]",
                    )}
                  >
                    {hasPrice
                      ? `+${formatPeso(item.price)}${item.isQuantity ? " ea" : ""}`
                      : "On quotation"}
                  </span>
                </button>

                {/* Only ever shown for an add-on that is both counted and
                    chosen: a stepper on an item nobody has added is a control
                    with nothing to adjust. */}
                {item.isQuantity && isSelected && (
                  <div className="flex shrink-0 items-center border-l border-[#4C81E0]/20 px-2">
                    <QtyStepper
                      value={quantity}
                      label={item.name}
                      onDecrease={() => onQuantityChange(item, -1)}
                      onIncrease={() => onQuantityChange(item, 1)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
