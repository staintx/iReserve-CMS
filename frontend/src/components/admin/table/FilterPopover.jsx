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
          className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-white text-foreground border border-border/80 hover:bg-muted/80 shadow-2xs transition-colors cursor-pointer"
        >
          <Filter size={13} />
          {label}
          {activeCount > 0 && (
            <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-md border border-border/80 shadow-lg">
        <div className="space-y-4">
          {children}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => {
                onClear?.();
                setOpen(false);
              }}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                onApply?.();
                setOpen(false);
              }}
              className="px-3 py-1.5 rounded-md text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-2xs transition-colors cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
