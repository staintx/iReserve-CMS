import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import { 
  PanelLeftClose,
  PanelLeftOpen,
  Calendar, 
  LogOut,
  UserCheck
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
    "group relative flex items-center gap-2.5 rounded-lg text-[13px] whitespace-nowrap " +
    "transition-colors duration-150 cursor-pointer outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary/40";

  const navRowSize = isCollapsed ? "h-8.5 w-8.5 mx-auto justify-center" : "h-8.5 w-full px-2.5";

  const ACTIVE_RAIL =
    "before:absolute before:left-0 before:top-1/2 before:h-4.5 before:w-[2.5px] " +
    "before:-translate-y-1/2 before:rounded-r-full before:bg-primary";

  const linkClass = ({ isActive }) =>
    cn(
      NAV_ROW,
      navRowSize,
      isActive
        ? cn("bg-powder/80 text-foreground font-semibold", !isCollapsed && ACTIVE_RAIL)
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const iconClass = (isActive) => cn("w-4 h-4 shrink-0", isActive && "text-primary");

  const sectionLabelClass = cn(
    "px-2.5 pt-2.5 pb-1 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold",
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
          "fixed md:sticky top-0 self-start flex flex-col h-screen bg-card transition-all duration-300 ease-in-out border-r border-border z-50 shrink-0 select-none",
          isCollapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Brand Header & Toggle */}
        <div className="px-3 py-3 border-b border-border/60 shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between gap-2">
              <div 
                className="flex items-center gap-2.5 overflow-hidden cursor-pointer min-w-0" 
                onClick={() => navigate("/staff/dashboard")}
              >
                <img 
                  src={logo} 
                  alt="Caezelle's logo" 
                  className="w-8 h-8 rounded-full object-cover border border-border shadow-2xs shrink-0" 
                />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground leading-none tracking-tight truncate">Staff Portal</div>
                  <div className="text-[10px] font-semibold text-primary uppercase tracking-wider mt-0.5 truncate flex items-center gap-1">
                    <UserCheck size={11} className="text-primary shrink-0" /> Operations Crew
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                className="h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-border/60 shrink-0"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <img 
                src={logo} 
                alt="Caezelle's logo" 
                className="w-7.5 h-7.5 rounded-full object-cover border border-border shadow-2xs cursor-pointer hover:scale-105 transition-transform" 
                onClick={() => navigate("/staff/dashboard")}
                title="Caezelle's Staff"
              />
              <button
                type="button"
                onClick={() => setIsCollapsed(false)}
                className="h-6 w-6 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-border/60"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col flex-1 px-2 py-2 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Notifications Item */}
          <NotificationBell isSidebarItem isCollapsed={isCollapsed} onCloseSidebar={() => setMobileOpen && setMobileOpen(false)} />

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
        <div className="p-2.5 border-t border-border/60 mt-auto shrink-0">
          {!isCollapsed ? (
            <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/40 border border-border/60">
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-7.5 h-7.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 border border-primary/20">
                  {initials}
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="text-xs font-semibold text-foreground truncate">{user?.full_name || "Staff Member"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{user?.position || "Catering Staff"}</div>
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0 cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 w-full">
              <div
                className="w-7.5 h-7.5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center border border-primary/20"
                title={user?.full_name || "Staff"}
              >
                {initials}
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
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
