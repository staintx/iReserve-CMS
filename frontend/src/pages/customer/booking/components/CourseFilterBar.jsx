import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Focus ring utility consistent with the booking flow
 */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C81E0] focus-visible:ring-offset-1";

/**
 * CourseFilterBar
 *
 * Horizontal scrollable category pill bar with:
 * - Left/Right navigation chevron buttons with edge gradient fade masks
 * - Native mousewheel conversion (vertical mousewheel scrolls horizontal categories)
 * - Dish count badges and selected items counters per category
 * - Smooth scroll behavior and auto-scroll on click
 */
export default function CourseFilterBar({
  activeGroup,
  onSelectGroup,
  totalDishCount = 0,
  groups = [],
  selectedCountsByGroup = {},
  showAll = false,
  className = "",
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Allow a small 2px tolerance for sub-pixel zoom/scaling
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    const frameId = requestAnimationFrame(checkScroll);

    const handleWheel = (e) => {
      if (el.scrollWidth > el.clientWidth) {
        // If there is vertical wheel movement, convert it to horizontal scrolling
        if (Math.abs(e.deltaY) > 0) {
          e.preventDefault();
          el.scrollLeft += e.deltaY;
          checkScroll();
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    let resizeObserver = null;
    if (typeof window !== "undefined" && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(checkScroll);
      resizeObserver.observe(el);
    }

    return () => {
      cancelAnimationFrame(frameId);
      el.removeEventListener("wheel", handleWheel);
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [checkScroll, groups]);

  const scrollByAmount = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = 180;
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  };

  const handlePillClick = (groupId, e) => {
    onSelectGroup(groupId);
    if (e?.currentTarget && e.currentTarget.scrollIntoView) {
      e.currentTarget.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }
  };

  return (
    <div className={cn("relative group/filter select-none", className)}>
      {/* Left Scroll Navigation Button & Gradient Mask */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-1 z-10 flex items-center pr-3 bg-gradient-to-r from-white via-white/95 to-transparent">
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            className={cn(
              "pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer",
              focusRing,
            )}
            aria-label="Scroll categories left"
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      )}

      {/* Scrollable Pills Row */}
      <div
        ref={scrollRef}
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 scrollbar-none scroll-smooth touch-pan-x"
        role="tablist"
        aria-label="Food category navigation"
      >
        {showAll && (
          <button
            type="button"
            role="tab"
            aria-selected={activeGroup === "all"}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeGroup === "all"
                ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-2xs"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              focusRing,
            )}
            onClick={(e) => handlePillClick("all", e)}
          >
            <span>All dishes</span>
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                activeGroup === "all"
                  ? "bg-white/20 text-white"
                  : "bg-slate-100 text-slate-500",
              )}
            >
              {totalDishCount}
            </span>
          </button>
        )}

        {groups.map((group) => {
          const countInThis = group.items.length;
          const selectedInThis = selectedCountsByGroup[group.id] || 0;
          const isActive = activeGroup === group.id;

          return (
            <button
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]",
                isActive
                  ? "border-[#4C81E0] bg-[#4C81E0] text-white shadow-xs"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50/80",
                focusRing,
              )}
              onClick={(e) => handlePillClick(group.id, e)}
            >
              <span>{group.label}</span>

              {/* Total items badge */}
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500",
                )}
              >
                {countInThis}
              </span>

              {/* Selected in category badge */}
              {selectedInThis > 0 && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold transition-colors",
                    isActive
                      ? "bg-white text-[#4C81E0]"
                      : "bg-[#4C81E0] text-white shadow-2xs",
                  )}
                  title={`${selectedInThis} selected in ${group.label}`}
                >
                  <Check size={9} strokeWidth={3} />
                  <span>{selectedInThis}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Right Scroll Navigation Button & Gradient Mask */}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-1 z-10 flex items-center pl-3 bg-gradient-to-l from-white via-white/95 to-transparent">
          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            className={cn(
              "pointer-events-auto flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-all cursor-pointer",
              focusRing,
            )}
            aria-label="Scroll categories right"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

