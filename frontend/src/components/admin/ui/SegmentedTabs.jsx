/**
 * The view switcher used at the top of the operational lists — Assigned
 * Bookings (Pending / Upcoming / Completed) and a staff event's Briefing /
 * Equipment / Report.
 *
 * Both pages had hand-rolled this as an inline scrollable pill row. Two
 * problems it inherited and one it created:
 *
 * - The scroll rail relied on a `no-scrollbar` class that had never been
 *   defined anywhere in the stylesheet, so a scrollbar sat across the
 *   pills on every desktop browser that draws one.
 * - Nothing scrolled the active tab into view, so arriving on
 *   `?tab=equipment` on a phone showed a rail apparently parked on
 *   "Briefing" with the real tab off-screen to the right.
 * - Pills were 26–30px tall, under the touch floor.
 *
 * On a phone with three or fewer tabs the rail becomes an equal-width
 * segmented control instead: three fixed segments read as "these are all
 * the views" where a scroll rail reads as "there may be more", and the
 * former is true here. Above three it stays a scroll rail, which is the
 * honest affordance.
 *
 * Semantics are the ARIA tablist pattern, so arrow keys move between tabs
 * and a screen reader announces "2 of 3" rather than three loose buttons.
 */
export default function SegmentedTabs({ tabs, value, onChange, className = "", ariaLabel = "Views" }) {
  const fitsAsSegments = tabs.length <= 3;

  const focusTab = (index) => {
    const next = (index + tabs.length) % tabs.length;
    onChange(tabs[next].id);
  };

  const handleKeyDown = (event, index) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-1 p-1 sm:p-0.5 bg-muted/80 border border-border/80 rounded-lg sm:rounded-md w-full sm:w-fit flex-nowrap ${
        fitsAsSegments ? "" : "overflow-x-auto no-scrollbar snap-x snap-mandatory scroll-smooth"
      } ${className}`}
    >
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = value === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            ref={(node) => {
              // Keep the selected tab visible when the rail scrolls — a deep
              // link into a non-first tab otherwise lands off-screen.
              if (node && isActive && !fitsAsSegments) {
                node.scrollIntoView({ block: "nearest", inline: "nearest" });
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            onClick={() => onChange(tab.id)}
            className={`snap-start rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-0 px-2.5 sm:px-3 sm:py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              fitsAsSegments ? "flex-1 sm:flex-initial min-w-0" : "shrink-0"
            } ${
              isActive
                ? "bg-card text-foreground shadow-2xs border border-border/80 font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {Icon && (
              /* Three equal segments across a 320px screen leave about 90px
                 each; the icon costs 19px of that and pushed "Upcoming" into
                 an ellipsis. The label is the part that carries meaning, so
                 on the narrowest phones the icon steps aside. */
              <Icon
                size={13}
                className={`shrink-0 ${fitsAsSegments ? "max-[359px]:hidden" : ""} ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              />
            )}
            <span className={fitsAsSegments ? "truncate" : ""}>
              {/* A short label keeps three segments legible at 320px; the
                  full label returns as soon as there is room for it. */}
              {tab.shortLabel ? (
                <>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </>
              ) : (
                tab.label
              )}
            </span>
            {tab.count != null && (
              <span
                className={`shrink-0 rounded px-1 text-[10px] font-bold tabular-nums ${
                  isActive ? "bg-primary/10 text-primary" : "bg-border/70 text-muted-foreground"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
