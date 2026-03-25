import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";

const navItems = [
  { to: "/customer/dashboard", label: "Dashboard", desc: "Overview of your events" },
  { to: "/customer/inquiries", label: "My Inquiries", desc: "View quote requests" },
  { to: "/customer/bookings", label: "My Bookings", desc: "Track your event status" },
  { to: "/customer/payments", label: "Payment History", desc: "View transactions" },
  { to: "/customer/messages", label: "Messages", desc: "Chat with our team" },
  { to: "/customer/profile", label: "Profile", desc: "Manage your account" }
];

export default function CustomerDashboardLayout({ title, subtitle, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  return (
    <div className="customer-dashboard">
      <aside className="customer-sidebar">
        <div className="customer-brand" onClick={() => navigate("/")}
          onKeyDown={(event) => event.key === "Enter" && navigate("/")}
          role="button"
          tabIndex={0}
        >
          <div className="brand-mark">Caezelle's</div>
        </div>
        <nav className="customer-nav">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              `customer-nav-link ${isActive ? "active" : ""}`
            }
            >
              <div className="customer-nav-label">{item.label}</div>
              <div className="customer-nav-desc">{item.desc}</div>
            </NavLink>
          ))}
        </nav>
        <div className="customer-profile-chip">
          <div className="chip-avatar">{initials}</div>
          <div>
            <div className="chip-name">{user?.full_name || "Customer"}</div>
            <div className="chip-role">Customer</div>
          </div>
        </div>
      </aside>

      <div className="customer-main">
        <header className="customer-topbar">
          <div className="topbar-left">
            <button className="topbar-back" type="button" onClick={() => navigate(-1)}>←</button>
            <img src={logo} alt="Caezelle's logo" className="h-8 w-8 rounded-2xl object-cover" />
            <div className="topbar-title">Caezelle's Catering</div>
          </div>
          <div className="topbar-actions">
            <button className="topbar-icon" type="button" aria-label="Notifications">🔔</button>
            <button className="topbar-link" type="button" onClick={() => setShowLogoutConfirm(true)}>Sign out</button>
          </div>
        </header>

        <main className="customer-content">
          {(title || subtitle) && (
            <div className="customer-page-title">
              {title && <h1>{title}</h1>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          )}
          {children}
        </main>
      </div>
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
