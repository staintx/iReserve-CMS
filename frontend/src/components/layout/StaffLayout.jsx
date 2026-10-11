import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StaffSidebar from "./StaffSidebar";
import PortalMobileDrawer from "./PortalMobileDrawer";
import logo from "../../assets/images/logo.jpg";
import { UserCheck, Menu } from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import ConfirmDialog from "../common/ConfirmDialog";
import useAuth from "../../hooks/useAuth";
import { initialsOf } from "../../utils/format";

export default function StaffLayout({ children }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const user = auth.user || null;

  const initials = initialsOf(user?.full_name || user?.email, "ST");

  return (
    <div className="admin-layout admin-shell staff-portal fixed inset-0 flex overflow-hidden bg-background text-foreground font-sans">
      {/* Desktop Sidebar */}
      <StaffSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-14 shrink-0 select-none items-center justify-between border-b border-border/80 bg-card/95 px-3.5 backdrop-blur md:hidden">
          {/* Left: Hamburger menu + Brand */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-border text-foreground hover:bg-muted transition-colors cursor-pointer"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            <button
              type="button"
              onClick={() => navigate("/staff/dashboard")}
              className="flex items-center gap-2 text-left cursor-pointer"
            >
              <img
                src={logo}
                alt="Logo"
                className="h-7 w-7 rounded-full border border-border object-cover shadow-2xs"
              />
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold leading-none text-foreground">
                  Staff Portal
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-wider text-[#4C81E0]">
                  <UserCheck size={10} className="shrink-0 text-[#4C81E0]" /> Operations Crew
                </span>
              </div>
            </button>
          </div>

          {/* Right: Notifications icon with unread badge */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <div
              className="w-7 h-7 rounded-full bg-[#D6E4F7] text-[#4C81E0] text-[11px] font-bold flex items-center justify-center border border-[#4C81E0]/20 shrink-0"
              title={user?.full_name || "Staff Member"}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="portal-scroll flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto max-w-5xl space-y-4">{children}</div>
        </main>

        {/* Mobile Hamburger Drawer: Dashboard, Bookings, Sign Out only */}
        <PortalMobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          portalTitle="Staff Portal"
          roleLabel="Operations Crew"
          roleIcon={UserCheck}
          roleColor="text-[#4C81E0]"
          logo={logo}
          dashboardTo="/staff/dashboard"
          bookingsTo="/staff/bookings"
          user={user}
          initials={initials}
          onSignOut={() => setConfirmSignOut(true)}
        />
      </div>

      {/* Sign Out Confirmation */}
      {confirmSignOut && (
        <ConfirmDialog
          title="Sign Out"
          message="Are you sure you want to sign out of the Staff Portal?"
          confirmText="Sign Out"
          confirmVariant="danger"
          onConfirm={() => {
            setConfirmSignOut(false);
            auth.logout?.();
          }}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </div>
  );
}
