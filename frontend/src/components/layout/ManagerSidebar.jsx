import { NavLink } from "react-router-dom";
import { LayoutDashboard, Calendar, Users } from "lucide-react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";

export default function ManagerSidebar() {
  const { user } = useAuth();
  const navItemBase = "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200";
  const linkClass = ({ isActive }) =>
    `${navItemBase} ${
      isActive
        ? "bg-white/10 text-white"
        : "text-slate-300 hover:bg-white/10 hover:text-white"
    }`;

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "MA";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <aside className="hidden w-72 flex-col bg-ink-900 text-white lg:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-white/10">
          <img src={logo} alt="Caezelle's logo" className="h-full w-full object-cover" />
        </div>
        <div>
          <div className="text-base font-semibold tracking-tight">Caezelle&apos;s Manager</div>
          <span className="text-[11px] uppercase tracking-[0.2em] text-slate-300">System Management</span>
        </div>
      </div>

      <div className="px-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Menu</div>
      </div>

      <nav className="flex flex-1 flex-col gap-2 px-4 pb-6">
        <NavLink to="/manager/dashboard" className={linkClass}>
          <LayoutDashboard className="h-5 w-5 shrink-0" />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/manager/bookings" className={linkClass}>
          <Calendar className="h-5 w-5 shrink-0" />
          <span>Bookings</span>
        </NavLink>
        <NavLink to="/manager/staff" className={linkClass}>
          <Users className="h-5 w-5 shrink-0" />
          <span>Staff List</span>
        </NavLink>
      </nav>

      <div className="mx-6 mb-6 mt-auto flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3">
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
