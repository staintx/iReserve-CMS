import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navClass = ({ isActive }) =>
    `text-sm font-semibold transition ${isActive ? "text-ink-900" : "text-ink-700 hover:text-ink-900"}`;
  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  useEffect(() => {
    const handleClick = (event) => {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="page-shell">
      <header className="sticky top-0 z-40 px-6 py-4 border-b border-white/80 bg-white/80 backdrop-blur sm:px-10">
        <div className="flex items-center justify-between max-w-6xl gap-6 mx-auto">
          <div className="flex items-center gap-3 text-lg font-semibold cursor-pointer" onClick={() => navigate("/")}
            onKeyDown={(event) => event.key === "Enter" && navigate("/")}
            role="button"
            tabIndex={0}
          >
            <img src={logo} alt="Caezelle's logo" className="h-9 w-9 rounded-2xl object-cover" />
            <span>Caezelle's Catering</span>
          </div>

          <nav className="items-center hidden gap-6 md:flex">
            <NavLink to="/" className={navClass}>Home</NavLink>
            <NavLink to="/packages" className={navClass}>Packages</NavLink>
            <NavLink to="/gallery" className={navClass}>Gallery</NavLink>
            <a className={navClass({ isActive: false })} href="/#about">About Us</a>
            <a className={navClass({ isActive: false })} href="/#contact">Contact</a>
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
              <div className="user-menu" ref={menuRef}>
                <button className="user-menu-trigger" type="button" onClick={() => setMenuOpen((prev) => !prev)}>
                  <span className="user-menu-avatar">{initials}</span>
                  <span className="user-menu-name">{user.full_name || "Customer"}</span>
                  <span className="user-menu-caret">▾</span>
                </button>
                {menuOpen && (
                  <div className="user-dropdown">
                    <button className="dropdown-link" type="button" onClick={() => navigate("/customer/dashboard")}>Dashboard</button>
                    <button className="dropdown-link" type="button" onClick={() => navigate("/customer/inquiries")}>My Inquiries</button>
                    <button className="dropdown-link" type="button" onClick={() => navigate("/customer/bookings")}>My Bookings</button>
                    <button className="dropdown-link" type="button" onClick={() => navigate("/customer/payments")}>Payment History</button>
                    <button className="dropdown-link" type="button" onClick={() => navigate("/customer/messages")}>Messages</button>
                    <button className="dropdown-link" type="button" onClick={() => navigate("/customer/profile")}>Profile</button>
                    <button className="dropdown-link logout" type="button" onClick={logout}>Logout</button>
                  </div>
                )}
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