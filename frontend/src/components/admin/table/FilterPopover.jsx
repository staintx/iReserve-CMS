import { useState } from "react";
import { Filter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

/**
 * Shared "advanced filters" trigger + popover (design standard §03, rule 4).
 * Never a modal — filters refine content already on screen and must stay
 * non-blocking so they never compete with the Detail Drawer for the same
 * overlay space.
 */
export default function FilterPopover({ label = "Filters", activeCount = 0, onApply, onClear, children }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white text-[#374151] border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Filter size={13} />
          {label}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-[#111827] text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          {children}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                onClear?.();
                setOpen(false);
              }}
              className="text-xs font-semibold text-[#6B7280] hover:text-[#111827]"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onApply?.();
                setOpen(false);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#111827] text-white hover:bg-[#1F2937] transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
