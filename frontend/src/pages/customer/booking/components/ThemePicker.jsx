import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { TInput } from "./BookingSharedUI";
import { focusRing } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import {
  COLOR_PALETTES,
  OTHER_PALETTE_ID,
  findPaletteByColors,
} from "../lib/eventThemes";

/** Shared card shell for a theme or palette option — a swatch strip, a name, a selected check. */
function SwatchCard({ selected, swatches, title, subtitle, dashed = false, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border p-2 sm:p-2.5 text-left transition-all cursor-pointer",
        dashed && "border-dashed",
        selected
          ? "border-[#4C81E0] bg-[#4C81E0]/5 ring-1 ring-[#4C81E0]"
          : cn(
              dashed ? "border-slate-300" : "border-slate-200",
              "bg-white hover:border-slate-300 hover:bg-slate-50",
            ),
        focusRing,
      )}
    >
      {swatches && (
        <span className="flex shrink-0" aria-hidden="true">
          {swatches.map((swatch, index) => (
            <span
              key={swatch + index}
              className={cn(
                "h-4 w-4 rounded-full ring-1 ring-black/15",
                index > 0 && "-ml-1.5",
              )}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-800 leading-tight truncate">{title}</span>
        {subtitle && (
          <span className="block text-[10px] text-slate-400 leading-tight">{subtitle}</span>
        )}
      </span>

      {selected && <Check size={14} className="shrink-0 text-[#4C81E0]" />}
    </button>
  );
}

/**
 * Theme only — the overall styling direction. Selecting a card writes just
 * `event_theme`; it never touches the colour palette, which the customer
 * picks (or skips) separately below.
 */
export default function ThemePicker({ value, onChange }) {
  return (
    <TInput
      placeholder="e.g. Vintage garden, rustic elegance, or royal blue"
      value={value || ""}
      onChange={(next) => onChange(next)}
    />
  );
}

/**
 * Colour palette only — independent of theme. Selecting a card writes the
 * preset's colour names (never its own label) into `event_palette`, the same
 * array shape the free-text path and the Admin Quotation Builder both use.
 */
export function ColorPalettePicker({ value, onChange }) {
  const list = Array.isArray(value) ? value : [];
  const matched = findPaletteByColors(list);
  const valueImpliesOther = !matched && list.length > 0;
  const [otherMode, setOtherMode] = useState(valueImpliesOther);
  // The text box holds its own draft rather than `list.join(", ")` directly —
  // splitting on every keystroke and rejoining would drop the trailing ", "
  // a customer is mid-typing between two colour names.
  const [otherText, setOtherText] = useState(() => list.join(", "));

  useEffect(() => {
    if (valueImpliesOther) setOtherMode(true);
    else if (matched) setOtherMode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list.join("|")]);

  const activeId = matched?.id || (otherMode ? OTHER_PALETTE_ID : null);

  const toggleOther = () => {
    if (activeId === OTHER_PALETTE_ID) {
      setOtherMode(false);
      setOtherText("");
      onChange([]);
    } else {
      setOtherMode(true);
      setOtherText("");
      onChange([]);
    }
  };

  const handleTextChange = (next) => {
    setOtherText(next);
    onChange(
      next
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  };

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {COLOR_PALETTES.map((palette) => {
          const selected = activeId === palette.id;
          return (
            <SwatchCard
              key={palette.id}
              selected={selected}
              swatches={palette.swatches}
              title={palette.colors.join(" · ")}
              onClick={() => {
                setOtherMode(false);
                onChange(selected ? [] : palette.colors);
              }}
            />
          );
        })}

        <SwatchCard
          selected={activeId === OTHER_PALETTE_ID}
          dashed
          title="Something else"
          subtitle="Type your own colours"
          onClick={toggleOther}
        />
      </div>

      {activeId === OTHER_PALETTE_ID && (
        <div className="mt-2">
          <TInput
            placeholder="e.g. Sage green, cream, dusty gold"
            value={otherText}
            onChange={handleTextChange}
          />
        </div>
      )}
    </div>
  );
}
