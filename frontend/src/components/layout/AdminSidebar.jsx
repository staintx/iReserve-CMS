import { useState, useEffect } from "react";
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
  
  const [openDropdowns, setOpenDropdowns] = useState({
    finance: ["/admin/payments", "/admin/refunds"].some(p => location.pathname.includes(p)),
    bookings: location.pathname.includes("/admin/bookings"),
    service: ["/admin/packages", "/admin/inventory", "/admin/menu", "/admin/gallery"].some(p => location.pathname.includes(p)),
  });

  useEffect(() => {
    if (["/admin/payments", "/admin/refunds"].some(p => location.pathname.includes(p))) {
      setOpenDropdowns((prev) => ({ ...prev, finance: true }));
    }
    if (location.pathname.includes("/admin/bookings")) {
      setOpenDropdowns((prev) => ({ ...prev, bookings: true }));
    }
    if (["/admin/packages", "/admin/inventory", "/admin/menu", "/admin/gallery"].some(p => location.pathname.includes(p))) {
      setOpenDropdowns((prev) => ({ ...prev, service: true }));
    }
  }, [location.pathname]);

  const toggleDropdown = (key) => {
    if (isCollapsed) setIsCollapsed(false); 
    setOpenDropdowns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "AD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const linkClass = ({ isActive }) =>
    cn(
      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer overflow-hidden whitespace-nowrap",
      isActive
        ? "bg-accent/10 text-accent"
        : "text-muted-foreground hover:bg-muted hover:text-foreground",
      isCollapsed && "justify-center px-0 w-11 h-11 mx-auto"
    );

  const dropdownBtnClass = (isOpen) =>
    cn(
      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer overflow-hidden whitespace-nowrap w-full text-muted-foreground hover:bg-muted hover:text-foreground",
      isOpen && !isCollapsed && "bg-muted/50",
      isCollapsed && "justify-center px-0 w-11 h-11 mx-auto"
    );

  const subLinkClass = ({ isActive }) =>
    cn(
      "block w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 truncate",
      isActive
        ? "bg-accent/10 text-accent"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const sectionLabelClass = cn(
    "px-4 mt-6 mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold transition-opacity duration-300",
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

      <div className="px-6 pb-2">
        <button
          onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
          className={cn("p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition flex items-center justify-center border border-border bg-card shadow-sm", isCollapsed ? "mx-auto w-10 h-10" : "w-full")}
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2 text-xs font-medium uppercase tracking-wider">Collapse Sidebar</span>}
        </button>
      </div>

      <nav className="flex flex-col flex-1 px-4 pt-2 pb-6 space-y-1 overflow-y-auto hide-scrollbar">
        <div className={sectionLabelClass}>Menu</div>
        
        <NotificationBell isSidebarItem isCollapsed={isCollapsed} onCloseSidebar={() => setMobileOpen && setMobileOpen(false)} />
        
        <NavLink to="/admin/dashboard" className={linkClass}>
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        
        {isManager && (
          <div>
            <button onClick={() => toggleDropdown("finance")} className={dropdownBtnClass(openDropdowns.finance)}>
              <CreditCard className="w-5 h-5 shrink-0" />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Finance</span>
                  <div className={cn("transition-transform", openDropdowns.finance ? "rotate-180" : "")}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </>
              )}
            </button>
            {openDropdowns.finance && !isCollapsed && (
              <div className="ml-6 pl-4 mt-1 mb-2 border-l border-border space-y-1 py-1">
                <NavLink to="/admin/payments" className={subLinkClass}>Payments</NavLink>
                <NavLink to="/admin/refunds" className={subLinkClass}>Refunds</NavLink>
              </div>
            )}
          </div>
        )}
        
        <NavLink to="/admin/customers" className={linkClass}>
          <Users className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Customers</span>}
        </NavLink>

        <div className={sectionLabelClass}>Bookings</div>
        <div>
          <button onClick={() => toggleDropdown("bookings")} className={dropdownBtnClass(openDropdowns.bookings)}>
            <Calendar className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Bookings</span>
                <div className={cn("transition-transform", openDropdowns.bookings ? "rotate-180" : "")}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </>
            )}
          </button>
          {openDropdowns.bookings && !isCollapsed && (
            <div className="ml-6 pl-4 mt-1 mb-2 border-l border-border space-y-1 py-1">
              <NavLink to="/admin/bookings/reservations" className={subLinkClass}>Reservations</NavLink>
              <NavLink to="/admin/bookings/ocular" className={subLinkClass}>Ocular Visits</NavLink>
              <NavLink to="/admin/bookings/history" className={subLinkClass}>Event History</NavLink>
            </div>
          )}
        </div>

        {/* Calendar is merged into the Dashboard; standalone page removed. */}

        {isAdmin && (
          <>
            <div className={sectionLabelClass}>Service Management</div>
            <div>
              <button onClick={() => toggleDropdown("service")} className={dropdownBtnClass(openDropdowns.service)}>
                <UtensilsCrossed className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Service Management</span>
                    <div className={cn("transition-transform", openDropdowns.service ? "rotate-180" : "")}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </>
                )}
              </button>
              {openDropdowns.service && !isCollapsed && (
                <div className="ml-6 pl-4 mt-1 mb-2 border-l border-border space-y-1 py-1">
                  <NavLink to="/admin/packages" className={subLinkClass}>Packages</NavLink>
                  <NavLink to="/admin/menu" className={subLinkClass}>Food Menu</NavLink>
                  <NavLink to="/admin/gallery" className={subLinkClass}>Gallery</NavLink>
                  <NavLink to="/admin/inventory" className={subLinkClass}>Inventory</NavLink>
                </div>
              )}
            </div>
          </>
        )}

        {isAdmin && (
          <NavLink to="/admin/staff" className={linkClass}>
            <UserCheck className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Staff</span>}
          </NavLink>
        )}

        <div className={sectionLabelClass}>System</div>
        {isManager && (
          <NavLink to="/admin/analytics" className={linkClass}>
            <LineChart className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Analytics</span>}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/business-info" className={linkClass}>
            <Building2 className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Business Info</span>}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/logs" className={linkClass}>
            <TerminalSquare className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Audit Logs</span>}
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