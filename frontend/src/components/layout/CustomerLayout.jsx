import { NavLink, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navClass = ({ isActive }) =>
    `text-sm font-semibold transition ${isActive ? "text-ink-900" : "text-ink-700 hover:text-ink-900"}`;
  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <div className="page-shell">
      <header className="sticky top-0 z-40 px-6 py-4 border-b border-white/80 bg-white/80 backdrop-blur sm:px-10">
        <div className="flex items-center justify-between max-w-6xl gap-6 mx-auto">
          <div className="text-lg font-semibold cursor-pointer" onClick={() => navigate("/")}
            onKeyDown={(event) => event.key === "Enter" && navigate("/")}
            role="button"
            tabIndex={0}
          >
            Caezelle's Catering
          </div>

          <nav className="items-center hidden gap-6 md:flex">
            <NavLink to="/" className={navClass}>Home</NavLink>
            <NavLink to="/packages" className={navClass}>Packages</NavLink>
            <NavLink to="/menu" className={navClass}>Menu</NavLink>
            <NavLink to="/gallery" className={navClass}>Gallery</NavLink>
            {user && <NavLink to="/customer/book" className={navClass}>Book Now</NavLink>}
          </nav>

          <div className="flex items-center gap-3">
            {!user && (
              <>
                <NavLink className="btn-ghost" to="/login">Login</NavLink>
                <button className="btn" onClick={() => navigate("/customer/book")}>Book Now</button>
              </>
            )}

            {user && (
              <div className="flex items-center gap-3 px-3 py-2 bg-white border rounded-full border-slate-200">
                <div className="grid text-xs text-white rounded-full h-9 w-9 place-items-center bg-ink-900">{initials}</div>
                <span className="text-sm font-medium text-ink-800">{user.full_name || "Customer"}</span>
                <button className="btn-ghost" onClick={logout} type="button">Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl px-6 pt-10 pb-16 mx-auto sm:px-10">{children}</main>
      <button className="chat-fab" type="button">💬</button>
    </div>
  );
}