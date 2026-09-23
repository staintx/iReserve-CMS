import { useEffect } from "react";
import { X, UtensilsCrossed } from "lucide-react";
import { resolveGroup } from "@/lib/menuCategories";

/**
 * Mobile slide-up bottom sheet for reviewing and removing selected catering dishes.
 * Closes without a "Done" button; selections update immediately on remove/clear.
 */
export default function SelectedDishesBottomSheet({
  isOpen,
  onClose,
  selected = [],
  onRemove,
  onClearAll,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="selected-dishes-sheet-title"
      className="fixed inset-0 z-50 flex flex-col justify-end overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel */}
      <div className="relative z-10 mx-auto w-full max-w-lg bg-white rounded-t-2xl shadow-2xl border-t border-slate-200 flex flex-col max-h-[82dvh] overflow-hidden animate-in slide-in-from-bottom duration-250 ease-out">
        {/* Drag handle */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="h-1 w-10 rounded-full bg-slate-300" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5 bg-white">
          <div>
            <h2
              id="selected-dishes-sheet-title"
              className="text-sm sm:text-base font-bold text-slate-900 leading-tight"
            >
              Selected Dishes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {selected.length} {selected.length === 1 ? "dish" : "dishes"} chosen for catering
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            {selected.length > 0 && onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1 rounded transition-colors cursor-pointer"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-2.5 divide-y divide-slate-100">
          {selected.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <UtensilsCrossed size={18} />
              </span>
              <p className="text-xs font-semibold text-slate-700">No dishes selected yet</p>
              <p className="text-[11px] text-slate-400 max-w-[220px] mx-auto">
                Browse categories and tap any dish to add it to your catering menu.
              </p>
            </div>
          ) : (
            selected.map((item, idx) => {
              const group = resolveGroup(item.category);
              return (
                <div
                  key={item._id || item.id || idx}
                  className="flex items-center justify-between gap-3 pt-2.5 first:pt-0"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-cover border border-slate-200/80 bg-slate-100"
                      />
                    ) : (
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400 border border-slate-200/60">
                        <UtensilsCrossed size={16} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug break-words">
                        {item.name}
                      </p>
                      {group?.label && (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {group.label}
                        </span>
                      )}
                    </div>
                  </div>

                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                      aria-label={`Remove ${item.name}`}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
