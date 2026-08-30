import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The mobile navigation for the Manager and Staff portals: a fixed tab bar
 * plus the sheet its last tab opens.
 *
 * It replaces a left drawer that was the desktop sidebar translated into
 * view. That drawer had four problems, and the pattern change fixes all
 * four rather than patching them:
 *
 * - Tapping a link inside it changed the route but left the drawer open
 *   over the page it had just navigated to.
 * - It carried the sidebar collapse toggle, a control with no meaning on
 *   a phone.
 * - It opened from the top-left hamburger, the furthest point from a
 *   thumb, and duplicated the tab bar already fixed to the bottom.
 * - The page kept scrolling underneath it.
 *
 * A sheet rising from the bottom edge is both the reachable option and
 * the honest one: it is opened by the "More" tab it sits above. The tab
 * bar carries the two or three destinations that are actually used, and
 * the sheet carries the rest: notifications, the account, sign out.
 *
 * `items` are the tab-bar destinations; `menuItems` are the sheet's, and
 * default to the same list so the sheet is never a dead end for a
 * destination the bar could not fit.
 */
export default function PortalMobileNav({
  open,
  onOpenChange,
  items,
  menuItems,
  portalName,
  roleLabel,
  roleIcon: RoleIcon,
  logo,
  user,
  initials,
  userSubtitle,
  onSignOut,
  notificationSlot,
}) {
  const location = useLocation();
  const sheetItems = menuItems || items;

  // Escape closes the sheet, and the page behind it stops scrolling while
  // it is up. Without this a sheet on iOS scrolls the document under it
  // and closes onto somewhere the user never navigated to.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  // Any navigation dismisses the sheet, including a tap on the route the
  // user is already on.
  useEffect(() => {
    onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  // A tab may point at a query on a route another tab already owns (the
  // staff availability sheet lives on the shifts route), so an item can
  // narrow the match rather than relying on the pathname alone.
  const isCurrent = (item) => {
    if (item.activeWhen) return item.activeWhen(location);
    const path = item.to.split("?")[0];
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Fixed tab bar */}
      <nav
        aria-label={`${portalName} navigation`}
        className="portal-tabbar md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch justify-around bg-card/95 backdrop-blur border-t border-border/80 px-1 shadow-[0_-1px_12px_rgba(92,64,43,0.06)] select-none"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = isCurrent(item);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium transition-colors cursor-pointer portal-press",
                active ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-10 items-center justify-center rounded-full transition-colors",
                  active && "bg-primary/10"
                )}
              >
                <Icon size={17} />
              </span>
              <span className="tracking-tight leading-none">{item.label}</span>
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={() => onOpenChange(true)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer portal-press"
        >
          <span className="flex h-6 w-10 items-center justify-center rounded-full">
            <span
              className="grid h-[15px] w-[15px] grid-cols-2 grid-rows-2 gap-[3px]"
              aria-hidden="true"
            >
              {[0, 1, 2, 3].map((dot) => (
                <span key={dot} className="rounded-[1.5px] bg-current" />
              ))}
            </span>
          </span>
          <span className="tracking-tight leading-none">More</span>
        </button>
      </nav>

      {/* Sheet */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-foreground/40 backdrop-blur-[2px] animate-in fade-in duration-150"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${portalName} menu`}
            className="portal-sheet-scroll absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl border-t border-border bg-card shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="sticky top-0 z-10 border-b border-border/60 bg-card px-4 pt-2.5 pb-3">
              <div className="flex justify-center pb-2.5" aria-hidden="true">
                <span className="h-1 w-9 rounded-full bg-border" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <img
                    src={logo}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
                      {portalName}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-amber-700">
                      {RoleIcon && <RoleIcon size={11} className="shrink-0 text-amber-600" />}
                      <span className="truncate">{roleLabel}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close menu"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="space-y-1 px-3 py-3">
              {notificationSlot}

              <p className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Go to
              </p>

              {sheetItems.map((item) => {
                const Icon = item.icon;
                const active = isCurrent(item);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onOpenChange(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-[46px] items-center gap-3 rounded-lg px-2.5 text-[13.5px] transition-colors cursor-pointer",
                      active
                        ? "bg-powder/80 font-semibold text-foreground"
                        : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon size={17} className={cn("shrink-0", active && "text-primary")} />
                    <span className="flex-1">{item.label}</span>
                    {item.hint && (
                      <span className="text-[11px] font-normal text-muted-foreground/80">{item.hint}</span>
                    )}
                  </NavLink>
                );
              })}
            </div>

            <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/40 p-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {user?.full_name || portalName}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{userSubtitle}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onSignOut();
                }}
                className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive cursor-pointer"
              >
                <LogOut size={14} />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
