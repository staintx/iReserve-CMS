import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navClass = ({ isActive }) =>
    `text-sm font-semibold transition ${isActive ? "text-ink-900" : "text-ink-700 hover:text-ink-900"}`;

  const scrollToSection = (sectionId) => {
    if (sectionId === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const sectionLinkClass = (sectionId) => {
    const isLanding = location.pathname === "/";
    const activeHash = location.hash || "";

    const isActive =
      isLanding &&
      ((sectionId === "top" && (!activeHash || activeHash === "#top")) || activeHash === `#${sectionId}`);

    return navClass({ isActive });
  };

  const handleSectionNav = (sectionId) => (event) => {
    event.preventDefault();
    setMenuOpen(false);

    const destination = sectionId === "top" ? "/#top" : `/#${sectionId}`;

    if (location.pathname !== "/") {
      navigate(destination);
      return;
    }

    if ((location.hash || "") !== `#${sectionId}`) {
      navigate(destination);
    }

    scrollToSection(sectionId);
  };

  const handleLogoutClick = () => {
    setMenuOpen(false);
    setShowLogoutConfirm(true);
  };
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
            <a href="/#top" className={sectionLinkClass("top")} onClick={handleSectionNav("top")}>Home</a>
            <a href="/#packages" className={sectionLinkClass("packages")} onClick={handleSectionNav("packages")}>Packages</a>
            <a href="/#gallery" className={sectionLinkClass("gallery")} onClick={handleSectionNav("gallery")}>Gallery</a>
            <a href="/#testimonials" className={sectionLinkClass("testimonials")} onClick={handleSectionNav("testimonials")}>About Us</a>
            <a href="/#contact" className={sectionLinkClass("contact")} onClick={handleSectionNav("contact")}>Contact</a>
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
                    <button className="dropdown-link logout" type="button" onClick={handleLogoutClick}>Logout</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl px-6 pt-10 pb-16 mx-auto sm:px-10">{children}</main>
      <button className="chat-fab" type="button">💬</button>
      {showLogoutConfirm && (
        <ConfirmDialog
          message="Are you sure you want to log out?"
          onCancel={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            logout();
          }}
        />
      )}
    </div>
  );
}