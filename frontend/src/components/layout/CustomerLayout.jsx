import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export default function CustomerLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
      (isLanding &&
        ((sectionId === "top" && (!activeHash || activeHash === "#top")) || activeHash === `#${sectionId}`)) ||
      (location.pathname === "/gallery" && sectionId === "gallery");

    return navClass({ isActive });
  };

  const handleSectionNav = (sectionId) => (event) => {
    event.preventDefault();

    if (sectionId === "packages") {
      navigate("/packages");
      return;
    }

    if (sectionId === "gallery") {
      navigate("/gallery");
      return;
    }

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

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <div className="page-shell">
      <header className="sticky top-0 z-40 border-b bg-white/80 px-6 py-4 backdrop-blur sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <div
            className="flex cursor-pointer items-center gap-3 text-lg font-semibold"
            onClick={() => navigate("/")}
            onKeyDown={(event) => event.key === "Enter" && navigate("/")}
            role="button"
            tabIndex={0}
          >
            <img src={logo} alt="Caezelle's logo" className="h-9 w-9 rounded-2xl object-cover" />
            <span>Caezelle's Catering</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="/#top" className={sectionLinkClass("top")} onClick={handleSectionNav("top")}>Home</a>
            <a href="/packages" className={sectionLinkClass("packages")} onClick={handleSectionNav("packages")}>Packages</a>
            <a href="/gallery" className={sectionLinkClass("gallery")} onClick={handleSectionNav("gallery")}>Gallery</a>
            <a href="/#testimonials" className={sectionLinkClass("testimonials")} onClick={handleSectionNav("testimonials")}>About Us</a>
            <a href="/#contact" className={sectionLinkClass("contact")} onClick={handleSectionNav("contact")}>Contact</a>
          </nav>

          <div className="flex items-center gap-3">
            {!user && (
              <>
                <Button variant="ghost" onClick={() => navigate("/login")}>Login</Button>
                <Button onClick={() => navigate("/customer/book")}>Book Now</Button>
              </>
            )}

            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="user-menu-trigger" type="button">
                    <span className="user-menu-avatar">{initials}</span>
                    <span className="user-menu-name">{user.full_name || "Customer"}</span>
                    <span className="user-menu-caret">▾</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/customer/dashboard")}>Dashboard</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/customer/bookings")}>My Bookings</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/customer/payments")}>Payment History</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/customer/messages")}>Messages</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/customer/profile")}>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={() => setShowLogoutConfirm(true)}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16 pt-10 sm:px-10">{children}</main>
      
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
      >
        💬
      </Button>

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