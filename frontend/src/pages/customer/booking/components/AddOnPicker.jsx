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
      <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
        <Info className="mx-auto mb-2 h-5 w-5 text-slate-400" />
        <p className="text-xs font-bold text-slate-800">{emptyTitle}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <div className="mt-2.5">
      {/* Said once, for the whole list, instead of on every item. */}
      <p className="text-xs leading-relaxed text-slate-500">
        Tap an add-on to include it in your request. Anything marked{" "}
        <strong className="font-semibold text-slate-700">On quotation</strong> is
        priced by our team on your official quotation.
      </p>

      {isSearchable && (
        <div className="relative mt-2">
          <Search
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${items.length} add-ons...`}
            aria-label="Search add-ons"
            className={cn(
              "h-8.5 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4C81E0]/20 focus:border-[#4C81E0]",
              focusRing,
            )}
          />
        </div>
      )}

      {visible.length === 0 ? (
        <p className="mt-2.5 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
          No add-on matches “{query.trim()}”.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {visible.map((item) => {
            const quantity = quantityOf(item) || 0;
            const isSelected = quantity > 0;
            const hasPrice = Number(item.price) > 0;

            return (
              <li
                key={item.key}
                className={cn(
                  "flex items-stretch rounded-lg border transition-all select-none",
                  isSelected
                    ? "border-[#4C81E0] bg-[#4C81E0]/[0.04] ring-1 ring-[#4C81E0]/50"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onToggle(item)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2.5 py-2 text-left cursor-pointer",
                    focusRing,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-[#4C81E0] bg-[#4C81E0] text-white"
                        : "border-slate-300 bg-white text-transparent",
                    )}
                  >
                    <Check size={10} strokeWidth={3} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold leading-snug text-slate-800">
                      {item.name}
                    </span>
                    {item.description && (
                      <span className="line-clamp-1 block text-[11px] leading-tight text-slate-400">
                        {item.description}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "shrink-0 text-right text-xs",
                      hasPrice
                        ? "font-bold tabular-nums text-slate-900"
                        : "font-medium text-slate-400",
                    )}
                  >
                    {hasPrice
                      ? `+${formatPeso(item.price)}${item.isQuantity ? " ea" : ""}`
                      : "On quotation"}
                  </span>
                </button>

                {item.isQuantity && isSelected && (
                  <div className="flex shrink-0 items-center border-l border-[#4C81E0]/20 px-2 bg-blue-50/30">
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
