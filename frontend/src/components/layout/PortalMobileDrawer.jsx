import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Calendar, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Mobile Hamburger Drawer for Staff and Manager Portals.
 * Per specification:
 * - Contains ONLY: Dashboard, Bookings, Sign Out.
 * - Notifications are in the top header, NOT in this menu.
 * - Closes automatically when user navigates.
 * - Accessible Sign Out at the bottom.
 */
export default function PortalMobileDrawer({
  open,
  onClose,
  portalTitle,
  roleLabel,
  roleIcon: RoleIcon,
  roleColor = "text-[#4C81E0]",
  logo,
  dashboardTo,
  bookingsTo,
  user,
  initials,
  onSignOut,
}) {
  const location = useLocation();

  // Close on Escape & lock body scrolling while drawer is open
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  // Close automatically on route change
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!open) return null;

  const NAV_ROW =
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer";

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={`${portalTitle} navigation`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer content */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white text-slate-900 shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200 border-r border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {logo && (
              <img
                src={logo}
                alt="Logo"
                className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0 shadow-2xs"
              />
            )}
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
                {portalTitle}
              </h2>
              <div className={cn("text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 truncate mt-0.5", roleColor)}>
                {RoleIcon && <RoleIcon size={11} className="shrink-0" />}
                <span>{roleLabel}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation items: Dashboard & Bookings only */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-2 pt-1 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-slate-400">
            Navigation
          </div>

          <NavLink
            to={dashboardTo}
            end
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                NAV_ROW,
                isActive
                  ? "bg-[#D6E4F7]/60 text-[#4C81E0] font-bold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <LayoutDashboard size={18} className={isActive ? "text-[#4C81E0]" : "text-slate-500"} />
                <span>Dashboard</span>
              </>
            )}
          </NavLink>

          <NavLink
            to={bookingsTo}
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                NAV_ROW,
                isActive
                  ? "bg-[#D6E4F7]/60 text-[#4C81E0] font-bold"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Calendar size={18} className={isActive ? "text-[#4C81E0]" : "text-slate-500"} />
                <span>Bookings</span>
              </>
            )}
          </NavLink>
        </nav>

        {/* Footer with User info & Sign Out */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2.5">
          <div className="flex items-center gap-2.5 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] text-xs font-bold flex items-center justify-center border border-[#4C81E0]/20 shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-900 truncate leading-tight">
                {user?.full_name || "User"}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {user?.email || user?.position || roleLabel}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border border-rose-200 bg-rose-50/70 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
