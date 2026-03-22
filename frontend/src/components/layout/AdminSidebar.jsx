import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
import { 
  Menu, 
  LayoutDashboard, 
  MessageCircleQuestion, 
  CreditCard, 
  MessageSquare, 
  Images, 
  Calendar, 
  ChevronDown, 
  UtensilsCrossed, 
  Users, 
  LineChart, 
  Star, 
  Building2, 
  TerminalSquare 
} from "lucide-react";

export default function AdminSidebar() {
  const auth = useAuth() || {}; 
  const user = auth.user || null;
  const location = useLocation();
  
  const role = user?.role || "admin";
  const isAdmin = role === "admin";
  const isManager = role === "manager" || isAdmin;

  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const [openDropdowns, setOpenDropdowns] = useState({
    bookings: location.pathname.includes("/admin/bookings"),
    service: ["/admin/packages", "/admin/menu", "/admin/inventory"].some(p => location.pathname.includes(p)),
    staff: ["/admin/managers", "/admin/staff"].some(p => location.pathname.includes(p)),
  });

  useEffect(() => {
    if (location.pathname.includes("/admin/bookings")) {
      setOpenDropdowns((prev) => ({ ...prev, bookings: true }));
    }
    if (["/admin/packages", "/admin/menu", "/admin/inventory"].some(p => location.pathname.includes(p))) {
      setOpenDropdowns((prev) => ({ ...prev, service: true }));
    }
    if (["/admin/managers", "/admin/staff"].some(p => location.pathname.includes(p))) {
      setOpenDropdowns((prev) => ({ ...prev, staff: true }));
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

  const navItemBase = "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200 cursor-pointer overflow-hidden whitespace-nowrap";
  
  const linkClass = ({ isActive }) =>
    `${navItemBase} ${
      isActive
        ? "bg-white text-ink-900 shadow-soft"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    } ${isCollapsed ? "justify-center px-0 w-11 h-11 mx-auto" : ""}`;

  const dropdownBtnClass = (isOpen) =>
    `${navItemBase} w-full text-slate-300 hover:bg-white/10 hover:text-white ${
      isOpen && !isCollapsed ? "bg-white/5" : ""
    } ${isCollapsed ? "justify-center px-0 w-11 h-11 mx-auto" : ""}`;

  
  const subLinkClass = ({ isActive }) =>
    `block w-full rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 truncate ${
      isActive
        ? "bg-white text-ink-900 shadow-soft"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const sectionLabelClass = `px-4 mt-6 mb-2 text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold transition-opacity duration-300 ${
    isCollapsed ? "opacity-0 hidden" : "opacity-100 block"
  }`;

  return (
    <aside
      className={`flex flex-col h-screen text-white bg-ink-900 transition-all duration-300 ease-in-out border-r border-white/5 z-50 shrink-0 ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      
      <div className="flex items-center justify-between px-6 py-6">
        {!isCollapsed && (
          <div className="overflow-hidden whitespace-nowrap">
            <div className="text-lg font-semibold tracking-tight">Caezelle's Admin</div>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-300">System Management</span>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white transition ${isCollapsed ? "mx-auto" : ""}`}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex flex-col flex-1 px-4 overflow-y-auto space-y-2 pb-6 pt-2" style={{ scrollbarWidth: "none" }}>
        
        
        <div className={`px-4 mb-2 text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold transition-opacity duration-300 ${isCollapsed ? "opacity-0 hidden" : "opacity-100 block"}`}>Menu</div>
        
        <NavLink to="/admin/dashboard" className={linkClass}>
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Dashboard</span>}
        </NavLink>
        
        {isManager && (
          <NavLink to="/admin/inquiries" className={linkClass}>
            <MessageCircleQuestion className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Inquiries</span>}
          </NavLink>
        )}

        {isManager && (
          <NavLink to="/admin/payment-approvals" className={linkClass}>
            <CreditCard className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Payment Approvals</span>}
          </NavLink>
        )}
        
        <NavLink to="/admin/messages" className={linkClass}>
          <MessageSquare className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span>Messages</span>}
        </NavLink>

        {isManager && (
          <NavLink to="/admin/gallery" className={linkClass}>
            <Images className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Gallery Manager</span>}
          </NavLink>
        )}

        
        <div className={sectionLabelClass}>Bookings</div>
        <div>
          <button onClick={() => toggleDropdown("bookings")} className={dropdownBtnClass(openDropdowns.bookings)}>
            <Calendar className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">Bookings</span>
                <div className={`transition-transform ${openDropdowns.bookings ? "rotate-180" : ""}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </>
            )}
          </button>
          {openDropdowns.bookings && !isCollapsed && (
            
            <div className="ml-[26px] pl-2 mt-1 mb-2 border-l border-white/10 space-y-1 py-1">
              <NavLink to="/admin/bookings/active" className={subLinkClass}>Active Bookings</NavLink>
              <NavLink to="/admin/bookings/history" className={subLinkClass}>Event History</NavLink>
              <NavLink to="/admin/bookings/calendar" className={subLinkClass}>Availability</NavLink>
            </div>
          )}
        </div>

        
        {isAdmin && (
          <>
            <div className={sectionLabelClass}>Service Management</div>
            <div>
              <button onClick={() => toggleDropdown("service")} className={dropdownBtnClass(openDropdowns.service)}>
                <UtensilsCrossed className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Service Management</span>
                    <div className={`transition-transform ${openDropdowns.service ? "rotate-180" : ""}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </>
                )}
              </button>
              {openDropdowns.service && !isCollapsed && (
                <div className="ml-[26px] pl-2 mt-1 mb-2 border-l border-white/10 space-y-1 py-1">
                  <NavLink to="/admin/packages" className={subLinkClass}>Packages</NavLink>
                  <NavLink to="/admin/menu" className={subLinkClass}>Food Menu</NavLink>
                  <NavLink to="/admin/inventory" className={subLinkClass}>Inventory</NavLink>
                </div>
              )}
            </div>
          </>
        )}

      
        {isAdmin && (
          <>
            <div className={sectionLabelClass}>Manager & Staff</div>
            <div>
              <button onClick={() => toggleDropdown("staff")} className={dropdownBtnClass(openDropdowns.staff)}>
                <Users className="w-5 h-5 shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left">Team</span>
                    <div className={`transition-transform ${openDropdowns.staff ? "rotate-180" : ""}`}>
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </>
                )}
              </button>
              {openDropdowns.staff && !isCollapsed && (
                <div className="ml-[26px] pl-2 mt-1 mb-2 border-l border-white/10 space-y-1 py-1">
                  <NavLink to="/admin/managers" className={subLinkClass}>Managers</NavLink>
                  <NavLink to="/admin/staff" className={subLinkClass}>Staff</NavLink>
                </div>
              )}
            </div>
          </>
        )}

        
        <div className={sectionLabelClass}>System</div>
        {isManager && (
          <NavLink to="/admin/reports" className={linkClass}>
            <LineChart className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Reports & Analytics</span>}
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin/ratings" className={linkClass}>
            <Star className="w-5 h-5 shrink-0" />
            {!isCollapsed && <span>Ratings</span>}
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
            {!isCollapsed && <span>System Logs</span>}
          </NavLink>
        )}
      </nav>
      
      <div className="p-4 border-t border-white/5 mt-auto">
        <div className={`flex items-center gap-3 p-2 rounded-2xl bg-white/5 transition-all ${isCollapsed ? "justify-center" : ""}`}>
          <div className="grid shrink-0 w-10 h-10 bg-white rounded-full place-items-center text-ink-900 font-bold">
            {initials}
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <strong className="block text-sm truncate">{user?.full_name || "Admin"}</strong>
              <small className="text-xs text-slate-300 capitalize truncate">{user?.role || "admin"}</small>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}