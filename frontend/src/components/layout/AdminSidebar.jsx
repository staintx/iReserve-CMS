import { useState, useMemo } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import { 
  Menu, 
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
  // (Quotations lives at /admin/quotes, not /admin/bookings/quotes, and
  // Addons was previously missing here — both meant their parent category
  // failed to auto-expand on direct navigation/refresh.)
  const dropdownRoutePrefixes = useMemo(() => ({
    finance: ["/admin/payments", "/admin/refunds"],
    bookings: ["/admin/bookings", "/admin/quotes"],
    service: ["/admin/packages", "/admin/menu", "/admin/gallery", "/admin/addons", "/admin/inventory"],
  }), []);

  // Derived synchronously from the current route on every render, so the
  // correct category is expanded immediately on mount/refresh/direct link —
  // no effect-driven lag, no stale state to fall out of sync.
  const activeDropdownKey = useMemo(
    () => Object.keys(dropdownRoutePrefixes).find((key) =>
      dropdownRoutePrefixes[key].some((prefix) => location.pathname.startsWith(prefix))
    ) || null,
    [location.pathname, dropdownRoutePrefixes]
  );

  // Explicit user toggles layered on top of the route-derived default, so a
  // manual expand/collapse still works. Cleared whenever the active category
  // actually changes, so an unrelated category a user opened earlier doesn't
  // stay expanded forever after they've navigated away from it. Adjusted
  // during render (React's sanctioned pattern for resetting state when a
  // derived value changes) rather than in an effect, so it takes effect in
  // the same render pass instead of triggering an extra commit.
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
  // Every row (leaf link, category button, notification bell) shares one
  // base so heights, radius, gap and type stay identical. Heights are fixed
  // (h-10 / h-9) rather than padding-derived, so differing font sizes can't
  // drift the row rhythm. Padding never changes between active/inactive —
  // the accent rail is an absolutely-positioned pseudo-element inside the
  // item box — so labels don't shift horizontally when a route activates.
  const NAV_ROW =
    "group relative flex items-center gap-3 rounded-md text-[13.5px] whitespace-nowrap " +
    "transition-colors duration-150 cursor-pointer outline-none " +
    "focus-visible:ring-2 focus-visible:ring-primary/40";

  const navRowSize = isCollapsed ? "h-10 w-10 mx-auto justify-center" : "h-10 w-full px-3";

  const ACTIVE_RAIL =
    "before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] " +
    "before:-translate-y-1/2 before:rounded-r-full before:bg-primary";

  // Selected page: powder fill + royal-blue rail + primary-weight label.
  const linkClass = ({ isActive }) =>
    cn(
      NAV_ROW,
      navRowSize,
      isActive
        ? cn("bg-powder text-foreground font-semibold", !isCollapsed && ACTIVE_RAIL)
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

  const iconClass = (isActive) => cn("w-[18px] h-[18px] shrink-0", isActive && "text-primary");

  // Category button when one of its children is the current page: expanded,
  // it's emphasised via weight + blue icon only, deliberately WITHOUT the
  // powder fill/rail so the child below stays the unambiguous "you are here"
  // marker. Collapsed, the children aren't rendered at all, so the parent
  // takes the full active treatment — otherwise nothing on the rail would
  // indicate the current location.
  const dropdownBtnClass = (key) => {
    const isGroupActive = activeDropdownKey === key;
    return cn(
      NAV_ROW,
      navRowSize,
      isGroupActive
        ? isCollapsed
          ? "bg-powder text-foreground font-semibold"
          : "text-foreground font-semibold hover:bg-muted"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );
  };

  // Children sit against a guide line placed exactly under the parent icon's
  // centre (nav 12 + item 12 + half of 18px icon = 21px), and their labels
  // land at the same 54px offset as parent labels for a single text column.
  const subNavWrapClass = "mt-0.5 mb-1 ml-[21px] border-l border-border pl-3 space-y-0.5";

  const subLinkClass = ({ isActive }) =>
    cn(
      "flex items-center h-9 w-full rounded-md px-2 text-[13px] truncate",
      "transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      isActive
        ? "bg-powder text-primary font-semibold"
        : "text-muted-foreground font-medium hover:bg-muted hover:text-foreground"
    );

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
      <div className="flex items-center justify-between p-6 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/admin/dashboard")}>
        {!isCollapsed ? (
          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            <img src={logo} alt="Caezelle's logo" className="w-10 h-10 rounded-full object-cover border border-border shadow-sm shrink-0" />
            <div>
              <div className="font-serif font-bold text-foreground leading-tight">Admin Portal</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Management</div>
            </div>
          </div>
        ) : (
          <img src={logo} alt="Caezelle's logo" className="w-8 h-8 rounded-full object-cover border border-border shadow-sm mx-auto" />
        )}
      </div>

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

      {/* Global, not a nav category: notifications apply across the whole admin
          portal, so this sits above "Menu" in its own zone with its own
          divider rather than reading as just another link inside a category. */}
      <div className="px-3 pt-1 pb-2 border-b border-border">
        <NotificationBell isSidebarItem isCollapsed={isCollapsed} onCloseSidebar={() => setMobileOpen && setMobileOpen(false)} />
      </div>

      <nav className="flex flex-col flex-1 px-3 pt-1 pb-6 space-y-0.5 overflow-y-auto hide-scrollbar">
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
              <NavLink to="/admin/bookings/calendar" className={subLinkClass}>Availability Calendar</NavLink>
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

      <div className="p-4 border-t border-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors w-full">
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">{user?.full_name || "Admin"}</div>
              <div className="text-xs text-muted-foreground capitalize">{role}</div>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center cursor-pointer hover:bg-muted" title={user?.full_name || "Admin"}>
              {initials}
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
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