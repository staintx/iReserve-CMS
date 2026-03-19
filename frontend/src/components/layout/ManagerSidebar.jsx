import { NavLink } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function ManagerSidebar() {
  const { user } = useAuth();
  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 rounded-2xl px-4 py-2 text-sm font-semibold transition ${
      isActive
        ? "bg-white text-ink-900 shadow-soft"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "MA";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <aside className="hidden w-72 flex-col bg-ink-900 px-6 py-8 text-white lg:flex">
      <div className="mb-8">
        <div className="text-lg font-semibold tracking-tight">Caezelle&apos;s Manager</div>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-300">System Management</span>
      </div>

      <nav className="flex flex-1 flex-col gap-4">
        <NavLink to="/manager/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/manager/bookings" className={linkClass}>Bookings</NavLink>
        <NavLink to="/manager/staff" className={linkClass}>Staff List</NavLink>
      </nav>

      <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-white text-ink-900">
          {initials}
        </div>
        <div>
          <strong className="block text-sm">{user?.full_name || "Manager"}</strong>
          <small className="text-xs text-slate-300">{user?.role || "manager"}</small>
        </div>
      </div>
    </aside>
  );
}
