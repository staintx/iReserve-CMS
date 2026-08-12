import { Check } from "lucide-react";
import { TInput } from "./BookingSharedUI";
import { focusRing } from "../lib/bookingUI";
import { cn } from "@/lib/utils";
import {
  EVENT_THEMES,
  CUSTOM_THEME_ID,
  findThemeByName,
} from "../lib/eventThemes";

/**
 * Theme and palette in one choice.
 *
 * Selecting a card writes the theme name to `event_theme` and its colour names
 * to `event_palette`. "Something else" keeps the old free-text path for anyone
 * with their own direction, so nothing is lost by making the common case a
 * single tap.
 */
export default function ThemePicker({ value, onChange }) {
  const matched = findThemeByName(value);
  // Anything with a value that is not one of ours is a custom description.
  const isCustom = !matched && Boolean(value);
  const activeId = matched?.id || (isCustom ? CUSTOM_THEME_ID : null);

  const select = (theme) =>
    onChange({ theme: theme.name, palette: theme.colors });

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {EVENT_THEMES.map((theme) => {
          const selected = activeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              aria-pressed={selected}
              onClick={() => (selected ? onChange({ theme: "", palette: [] }) : select(theme))}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                selected
                  ? "border-[#4C81E0] bg-[#4C81E0]/5"
                  : "border-[#E2E8F0] bg-white hover:border-[#4C81E0]/50",
                focusRing,
              )}
            >
              <span className="flex shrink-0" aria-hidden="true">
                {theme.swatches.map((swatch, index) => (
                  <span
                    key={swatch + index}
                    className={cn(
                      "h-6 w-6 rounded-full ring-1 ring-black/10",
                      index > 0 && "-ml-2",
                    )}
                    style={{ backgroundColor: swatch }}
                  />
                ))}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-[#1E293B]">
                  {theme.name}
                </span>
                {/* Colour names, not hex. The customer never types a value. */}
                <span className="block text-xs text-[#64748B]">
                  {theme.colors.join(" · ")}
                </span>
              </span>

              {selected && (
                <Check size={16} className="shrink-0 text-[#4C81E0]" />
              )}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={activeId === CUSTOM_THEME_ID}
          onClick={() =>
            activeId === CUSTOM_THEME_ID
              ? onChange({ theme: "", palette: [] })
              : onChange({ theme: " ", palette: [] })
          }
          className={cn(
            "flex items-center gap-3 rounded-xl border border-dashed p-3 text-left transition-colors",
            activeId === CUSTOM_THEME_ID
              ? "border-[#4C81E0] bg-[#4C81E0]/5"
              : "border-[#CBD5E1] bg-white hover:border-[#4C81E0]/50",
            focusRing,
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-[#1E293B]">
              Something else
            </span>
            <span className="block text-xs text-[#64748B]">
              Describe the look you want
            </span>
          </span>
          {activeId === CUSTOM_THEME_ID && (
            <Check size={16} className="shrink-0 text-[#4C81E0]" />
          )}
        </button>
      </div>

      {activeId === CUSTOM_THEME_ID && (
        <div className="mt-2">
          <TInput
            placeholder="e.g. Vintage garden, muted greens and dusty pink"
            value={value === " " ? "" : value}
            onChange={(next) => onChange({ theme: next, palette: [] })}
          />
        </div>
      )}
    </div>
  );
}
