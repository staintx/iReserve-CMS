import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import { 
  PanelLeftClose,
  PanelLeftOpen,
  LayoutDashboard, 
  CreditCard, 
  Users,
  UserCheck,
  Calendar, 
  ChevronDown, 
  UtensilsCrossed, 
  LineChart, 
  Building2, 
  TerminalSquare,
  MessageSquare,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import ConfirmDialog from "../common/ConfirmDialog";
import NotificationBell from "../common/NotificationBell";

export default function AdminSidebar({ mobileOpen, setMobileOpen }) {
  const auth = useAuth() || {}; 
  const user = auth.user || null;
  const location = useLocation();
  const navigate = useNavigate();
  
  const role = user?.role || "admin";
  const isAdmin = role === "admin";
  const isManager = role === "manager" || isAdmin;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Route ownership for each dropdown — single source of truth for both
  // "which category is the current page in" and "which sub-link is active".
  const dropdownRoutePrefixes = useMemo(() => ({
    finance: ["/admin/payments", "/admin/refunds"],
    bookings: ["/admin/bookings", "/admin/quotes"],
    service: ["/admin/packages", "/admin/menu", "/admin/gallery", "/admin/addons", "/admin/inventory"],
  }), []);

  const activeDropdownKey = useMemo(
    () => Object.keys(dropdownRoutePrefixes).find((key) =>
      dropdownRoutePrefixes[key].some((prefix) => location.pathname.startsWith(prefix))
    ) || null,
    [location.pathname, dropdownRoutePrefixes]
  );

  const [manualOverrides, setManualOverrides] = useState({});
  const [prevActiveKey, setPrevActiveKey] = useState(activeDropdownKey);
  if (activeDropdownKey !== prevActiveKey) {
    setPrevActiveKey(activeDropdownKey);
    setManualOverrides({});
  }

  const isDropdownOpen = (key) =>
    key in manualOverrides ? manualOverrides[key] : key === activeDropdownKey;

  const toggleDropdown = (key) => {
    if (isCollapsed) setIsCollapsed(false);
    setManualOverrides((prev) => ({ ...prev, [key]: !isDropdownOpen(key) }));
  };

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "AD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  // ── Navigation item system ───────────────────────────────────────────
  const NAV_ROW =
    "group relative flex items-center gap-2.5 rounded-lg text-[13px] whitespace-nowrap " +
    "transition-colors duration-150 cursor-pointer outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary/40";

  const navRowSize = isCollapsed ? "h-8.5 w-8.5 mx-auto justify-center" : "h-8.5 w-full px-2.5";

  const ACTIVE_RAIL =
    "before:absolute before:left-0 before:top-1/2 before:h-4.5 before:w-[2.5px] " +
    "before:-translate-y-1/2 before:rounded-r-full before:bg-primary";

  // Selected page: powder fill + royal-blue rail + primary-weight label.
  const linkClass = ({ isActive }) =>
    cn(
      NAV_ROW,
      navRowSize,
      isActive
        ? cn("bg-powder/80 text-foreground font-semibold", !isCollapsed && ACTIVE_RAIL)
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const iconClass = (isActive) => cn("w-4 h-4 shrink-0", isActive && "text-primary");

  // Category button when one of its children is the current page
  const dropdownBtnClass = (key) => {
    const isGroupActive = activeDropdownKey === key;
    return cn(
      NAV_ROW,
      navRowSize,
      isGroupActive
        ? isCollapsed
        ? "bg-powder/80 text-foreground font-semibold"
          : "text-foreground font-semibold hover:bg-muted"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );
  };

  // Sub navigation indent
  const subNavWrapClass = "mt-0.5 mb-1 ml-4 border-l border-border/80 pl-2.5 space-y-0.5";

  const subLinkClass = ({ isActive }) =>
    cn(
      "flex items-center h-7.5 w-full rounded-md px-2 text-[12.5px] truncate",
      "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      isActive
        ? "bg-powder/80 text-primary font-semibold"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

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
                onClick={() => navigate("/admin/dashboard")}
              >
                <img 
                  src={logo} 
                  alt="Caezelle's logo" 
                  className="w-8 h-8 rounded-full object-cover border border-border shadow-2xs shrink-0" 
                />
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground leading-none tracking-tight truncate">Admin Portal</div>
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5 truncate">Management</div>
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
                onClick={() => navigate("/admin/dashboard")}
                title="Caezelle's Admin"
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

        <nav className="flex flex-col flex-1 px-2 py-2 space-y-0.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Notifications item */}
          <NotificationBell isSidebarItem isCollapsed={isCollapsed} onCloseSidebar={() => setMobileOpen && setMobileOpen(false)} />

          <div className={sectionLabelClass}>Menu</div>

          <NavLink to="/admin/dashboard" className={linkClass} title={isCollapsed ? "Dashboard" : undefined}>
            {({ isActive }) => (
              <>
                <LayoutDashboard className={iconClass(isActive)} />
                {!isCollapsed && <span>Dashboard</span>}
              </>
            )}
          </NavLink>

        
        {isManager && (
          <div>
            <button onClick={() => toggleDropdown("finance")} className={dropdownBtnClass("finance")} title={isCollapsed ? "Finance" : undefined} aria-expanded={isDropdownOpen("finance")}>
              <CreditCard className={iconClass(activeDropdownKey === "finance")} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Finance</span>
                  <div className={cn("transition-transform", isDropdownOpen("finance") ? "rotate-180" : "")}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </>
              )}
            </button>
            {isDropdownOpen("finance") && !isCollapsed && (
              <div className={subNavWrapClass}>
                <NavLink to="/admin/payments" className={subLinkClass}>Payments</NavLink>
                <NavLink to="/admin/refunds" className={subLinkClass}>Refunds</NavLink>
              </div>
            )}
          </div>
        )}
        
        <NavLink to="/admin/customers" className={linkClass} title={isCollapsed ? "Customers" : undefined}>
          {({ isActive }) => (
            <>
              <Users className={iconClass(isActive)} />
              {!isCollapsed && <span>Customers</span>}
            </>
          )}
        </NavLink>

        <NavLink to="/admin/messages" className={linkClass} title={isCollapsed ? "Messages" : undefined}>
          {({ isActive }) => (
            <>
              <MessageSquare className={iconClass(isActive)} />
              {!isCollapsed && <span>Messages</span>}
            </>
          )}
        </NavLink>

        <div className={sectionLabelClass}>Bookings</div>
        <div>
          <button onClick={() => toggleDropdown("bookings")} className={dropdownBtnClass("bookings")} title={isCollapsed ? "Bookings" : undefined} aria-expanded={isDropdownOpen("bookings")}>
            <Calendar className={iconClass(activeDropdownKey === "bookings")} />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Bookings</span>
                <div className={cn("transition-transform", isDropdownOpen("bookings") ? "rotate-180" : "")}>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </>
            )}
          </button>
          {isDropdownOpen("bookings") && !isCollapsed && (
            <div className={subNavWrapClass}>
              <NavLink to="/admin/bookings/inquiries" className={subLinkClass}>Inquiries</NavLink>
              <NavLink to="/admin/quotes" className={subLinkClass}>Quotations</NavLink>
              <NavLink to="/admin/bookings/reservations" className={subLinkClass}>Reservations</NavLink>
              {isAdmin && (
                <NavLink to="/admin/bookings/ocular" className={subLinkClass}>Ocular Visits</NavLink>
              )}
              <NavLink to="/admin/bookings/history" className={subLinkClass}>Event History</NavLink>
            </div>
          )}
        </div>

        {/* Calendar is merged into the Dashboard; standalone page removed. */}

        {isAdmin && (
          <>
            <div className={sectionLabelClass}>Service Management</div>
            <div>
              <button onClick={() => toggleDropdown("service")} className={dropdownBtnClass("service")} title={isCollapsed ? "Service Management" : undefined} aria-expanded={isDropdownOpen("service")}>
                <UtensilsCrossed className={iconClass(activeDropdownKey === "service")} />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Service Management</span>
                    <div className={cn("transition-transform", isDropdownOpen("service") ? "rotate-180" : "")}>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                  </>
                )}
              </button>
              {isDropdownOpen("service") && !isCollapsed && (
                <div className={subNavWrapClass}>
                  <NavLink to="/admin/packages" className={subLinkClass}>Packages</NavLink>
                  <NavLink to="/admin/menu" className={subLinkClass}>Food Menu</NavLink>
                  <NavLink to="/admin/gallery" className={subLinkClass}>Gallery</NavLink>
                  <NavLink to="/admin/addons" className={subLinkClass}>Addons</NavLink>
                  <NavLink to="/admin/inventory" className={subLinkClass}>Inventory</NavLink>
                </div>
              )}
            </div>
          </>
        )}

        {isAdmin && (
          <NavLink to="/admin/staff" className={linkClass} title={isCollapsed ? "Staff & Managers" : undefined}>
            {({ isActive }) => (
              <>
                <UserCheck className={iconClass(isActive)} />
                {!isCollapsed && <span>Staff &amp; Managers</span>}
              </>
            )}
          </NavLink>
        )}

        <div className={sectionLabelClass}>System</div>
        {isManager && (
          <NavLink to="/admin/analytics" className={linkClass} title={isCollapsed ? "Analytics" : undefined}>
            {({ isActive }) => (
              <>
                <LineChart className={iconClass(isActive)} />
                {!isCollapsed && <span>Analytics</span>}
              </>
            )}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/business-info" className={linkClass} title={isCollapsed ? "Business Info" : undefined}>
            {({ isActive }) => (
              <>
                <Building2 className={iconClass(isActive)} />
                {!isCollapsed && <span>Business Info</span>}
              </>
            )}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/logs" className={linkClass} title={isCollapsed ? "Audit Logs" : undefined}>
            {({ isActive }) => (
              <>
                <TerminalSquare className={iconClass(isActive)} />
                {!isCollapsed && <span>Audit Logs</span>}
              </>
            )}
          </NavLink>
        )}
      </nav>

      <div className="p-2.5 border-t border-border/60">
        {!isCollapsed ? (
          <div
            className={cn(
              "flex items-center gap-2.5 p-1.5 rounded-lg transition-all duration-150 w-full group cursor-pointer",
              location.pathname === "/admin/profile"
                ? "bg-powder/80 border border-primary/20 text-foreground shadow-2xs"
                : "hover:bg-muted/70 text-foreground"
            )}
            onClick={() => navigate("/admin/profile")}
            title="View Profile Settings"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 border border-primary/20 transition-transform group-hover:scale-105">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                {user?.full_name || "Admin"}
              </div>
              <div className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                <span className="truncate">{role === "admin" ? "System Admin" : role}</span>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLogoutConfirm(true);
              }}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 w-full">
            <button
              onClick={() => navigate("/admin/profile")}
              className={cn(
                "w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center cursor-pointer transition-all hover:scale-105",
                location.pathname === "/admin/profile"
                  ? "bg-primary text-white shadow-2xs ring-2 ring-primary/30"
                  : "bg-primary/10 text-primary hover:bg-primary/20"
              )}
              title={`${user?.full_name || "Admin"} (Profile)`}
            >
              {initials}
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
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
        message="Are you sure you want to log out?"
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          setShowLogoutConfirm(false);
          if (auth.logout) auth.logout();
        }}
      />
    )}
    </>
  );
}