import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  const linkClass = ({ isActive }) =>
    `block rounded-xl px-4 py-2 text-sm font-medium transition ${
      isActive
        ? "bg-white text-ink-900 shadow-soft"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <aside className="hidden w-72 flex-col bg-ink-900 px-6 py-8 text-white lg:flex">
      <div className="mb-8">
        <div className="text-lg font-semibold tracking-tight">Caezelle's Admin</div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">System Management</span>
      </div>

      <nav className="flex flex-1 flex-col gap-5">
        <div className="space-y-1">
          <NavLink to="/admin/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/admin/inquiries" className={linkClass}>Inquiries</NavLink>
          <NavLink to="/admin/payment-approvals" className={linkClass}>Payment Approvals</NavLink>
          <NavLink to="/admin/messages" className={linkClass}>Messages</NavLink>
          <NavLink to="/admin/gallery" className={linkClass}>Gallery Manager</NavLink>
        </div>

        <div className="space-y-2">
          <span className="px-4 text-xs uppercase tracking-[0.2em] text-slate-400">Bookings</span>
          <NavLink to="/admin/bookings/active" className={linkClass}>Active Bookings</NavLink>
          <NavLink to="/admin/bookings/history" className={linkClass}>Event History</NavLink>
        </div>

        <div className="space-y-2">
          <span className="px-4 text-xs uppercase tracking-[0.2em] text-slate-400">Service Management</span>
          <NavLink to="/admin/packages" className={linkClass}>Packages</NavLink>
          <NavLink to="/admin/menu" className={linkClass}>Food Menu</NavLink>
          <NavLink to="/admin/inventory" className={linkClass}>Inventory</NavLink>
        </div>

        <div className="space-y-2">
          <span className="px-4 text-xs uppercase tracking-[0.2em] text-slate-400">Manager & Staff</span>
          <NavLink to="/admin/managers" className={linkClass}>Managers</NavLink>
          <NavLink to="/admin/staff" className={linkClass}>Staff</NavLink>
        </div>

        <div className="space-y-1">
          <NavLink to="/admin/reports" className={linkClass}>Reports & Analytics</NavLink>
          <NavLink to="/admin/ratings" className={linkClass}>Ratings</NavLink>
          <NavLink to="/admin/business-info" className={linkClass}>Business Info</NavLink>
          <NavLink to="/admin/logs" className={linkClass}>System Logs</NavLink>
        </div>
      </nav>

      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-900">JA</div>
        <div>
          <strong className="block text-sm">Jeffrey Aguasan</strong>
          <small className="text-xs text-slate-300">Admin</small>
        </div>
      </div>
    </aside>
  );
}