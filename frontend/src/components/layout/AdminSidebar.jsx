import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function AdminSidebar() {
  const { user } = useAuth();
  const role = user?.role || "admin";
  const isAdmin = role === "admin";
  const isManager = role === "manager" || isAdmin;
  const linkClass = ({ isActive }) =>
    `block rounded-xl px-4 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-white text-ink-900 shadow-soft"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;
  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "AD";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <aside className="flex-col hidden px-6 py-8 text-white w-72 bg-ink-900 lg:flex">
      <div className="mb-8">
        <div className="text-lg font-semibold tracking-tight">Caezelle's Admin</div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">System Management</span>
      </div>

      <nav className="flex flex-col flex-1 gap-5">
        <div className="space-y-1">
          <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
          {isManager && <NavLink to="/admin/inquiries" className={linkClass}>Inquiries</NavLink>}
          {isManager && <NavLink to="/admin/payment-approvals" className={linkClass}>Payment Approvals</NavLink>}
          <NavLink to="/admin/messages" className={linkClass}>Messages</NavLink>
          {isManager && <NavLink to="/admin/gallery" className={linkClass}>Gallery Manager</NavLink>}
        </div>

        <div className="space-y-2">
          <span className="px-4 text-xs uppercase tracking-[0.2em] text-slate-400">Bookings</span>
          <NavLink to="/admin/bookings/active" className={linkClass}>Active Bookings</NavLink>
          <NavLink to="/admin/bookings/history" className={linkClass}>Event History</NavLink>
          <NavLink to="/admin/bookings/calendar" className={linkClass}>Availability</NavLink>
        </div>

        {isAdmin && (
          <div className="space-y-2">
            <span className="px-4 text-xs uppercase tracking-[0.2em] text-slate-400">Service Management</span>
            <NavLink to="/admin/packages" className={linkClass}>Packages</NavLink>
            <NavLink to="/admin/menu" className={linkClass}>Food Menu</NavLink>
            <NavLink to="/admin/inventory" className={linkClass}>Inventory</NavLink>
          </div>
        )}

        {isAdmin && (
          <div className="space-y-2">
            <span className="px-4 text-xs uppercase tracking-[0.2em] text-slate-400">Manager & Staff</span>
            <NavLink to="/admin/managers" className={linkClass}>Managers</NavLink>
            <NavLink to="/admin/staff" className={linkClass}>Staff</NavLink>
          </div>
        )}

        <div className="space-y-1">
          {isManager && <NavLink to="/admin/reports" className={linkClass}>Reports & Analytics</NavLink>}
          {isAdmin && <NavLink to="/admin/ratings" className={linkClass}>Ratings</NavLink>}
          {isAdmin && <NavLink to="/admin/business-info" className={linkClass}>Business Info</NavLink>}
          {isAdmin && <NavLink to="/admin/logs" className={linkClass}>System Logs</NavLink>}
        </div>
      </nav>

      <div className="flex items-center gap-3 px-4 py-3 mt-6 rounded-2xl bg-white/10">
        <div className="grid w-10 h-10 bg-white rounded-full place-items-center text-ink-900">{initials}</div>
        <div>
          <strong className="block text-sm">{user?.full_name || "Admin"}</strong>
          <small className="text-xs text-slate-300">{user?.role || "admin"}</small>
        </div>
      </div>
    </aside>
  );
}