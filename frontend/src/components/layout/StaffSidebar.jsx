import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import { 
  Menu, 
  Calendar, 
  PackageCheck, 
  CalendarDays, 
  LogOut,
  UserCheck,
  Sparkles
} from "lucide-react";

import { cn } from "@/lib/utils";
import ConfirmDialog from "../common/ConfirmDialog";
import NotificationBell from "../common/NotificationBell";

export default function StaffSidebar({ mobileOpen, setMobileOpen }) {
  const auth = useAuth() || {}; 
  const user = auth.user || null;
  const navigate = useNavigate();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "ST";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const NAV_ROW =
    "group relative flex items-center gap-3 rounded-md text-[13.5px] whitespace-nowrap " +
    "transition-colors duration-150 cursor-pointer outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary/40";

  const navRowSize = isCollapsed ? "h-10 w-10 mx-auto justify-center" : "h-10 w-full px-3";

  const ACTIVE_RAIL =
    "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] " +
    "before:-translate-y-1/2 before:rounded-r-full before:bg-primary";

  const linkClass = ({ isActive }) =>
    cn(
      NAV_ROW,
      navRowSize,
      isActive
        ? cn("bg-powder text-foreground font-semibold", !isCollapsed && ACTIVE_RAIL)
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const iconClass = (isActive) => cn("w-[18px] h-[18px] shrink-0", isActive && "text-primary");

  const sectionLabelClass = cn(
    "px-3 pt-5 pb-1.5 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/60 font-semibold",
    isCollapsed ? "opacity-0 hidden" : "opacity-100 block"
  );

  return (
    <>
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed md:sticky top-0 self-start flex flex-col h-screen overflow-y-auto bg-card transition-all duration-300 ease-in-out border-r border-border z-50 shrink-0",
          isCollapsed ? "w-20" : "w-72",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/staff/dashboard")}>
          {!isCollapsed ? (
            <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
              <img src={logo} alt="Caezelle's logo" className="w-10 h-10 rounded-full object-cover border border-border shadow-sm shrink-0" />
              <div>
                <div className="font-serif font-bold text-foreground leading-tight">Staff Portal</div>
                <div className="text-xs text-primary font-semibold uppercase tracking-wider mt-0.5 flex items-center gap-1">
                  <UserCheck size={12} className="text-primary" /> Operations Crew
                </div>
              </div>
            </div>
          ) : (
            <img src={logo} alt="Caezelle's logo" className="w-8 h-8 rounded-full object-cover border border-border shadow-sm mx-auto" />
          )}
        </div>

        {/* Collapse button */}
        <div className="px-3 pb-2">
          <button
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            className={cn(
              "h-10 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center border border-border bg-card outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              isCollapsed ? "mx-auto w-10" : "w-full"
            )}
            title="Toggle Sidebar"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Menu className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span className="ml-2 text-[11px] font-semibold uppercase tracking-[0.12em]">Collapse Sidebar</span>}
          </button>
        </div>

        {/* Notification Bell */}
        <div className="px-3 pt-1 pb-2 border-b border-border">
          <NotificationBell isSidebarItem isCollapsed={isCollapsed} onCloseSidebar={() => setMobileOpen && setMobileOpen(false)} />
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col flex-1 px-3 pt-1 pb-6 space-y-0.5 overflow-y-auto hide-scrollbar">
          <div className={sectionLabelClass}>My Duties</div>

          <NavLink to="/staff/dashboard" className={linkClass} title={isCollapsed ? "My Assigned Events" : undefined}>
            {({ isActive }) => (
              <>
                <Calendar className={iconClass(isActive)} />
                {!isCollapsed && <span>Assigned Events</span>}
              </>
            )}
          </NavLink>
        </nav>


        {/* User Card & Logout */}
        <div className="p-3 border-t border-border mt-auto">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-foreground truncate">{user?.full_name || "Staff Member"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user?.position || "Catering Staff"}</div>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-10 h-10 mx-auto flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Sign Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Sign Out"
          message="Are you sure you want to sign out of the Staff Portal?"
          onConfirm={() => {
            setShowLogoutConfirm(false);
            auth.logout();
          }}
          onCancel={() => setShowLogoutConfirm(false)}
          confirmText="Sign Out"
          confirmVariant="danger"
        />
      )}
    </>
  );
}
