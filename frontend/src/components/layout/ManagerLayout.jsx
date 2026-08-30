import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ManagerSidebar from "./ManagerSidebar";
import PortalMobileNav from "./PortalMobileNav";
import logo from "../../assets/images/logo.jpg";
import {
  LayoutDashboard,
  Calendar,
  Users,
  ShieldCheck,
} from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import ConfirmDialog from "../common/ConfirmDialog";
import useAuth from "../../hooks/useAuth";
import { initialsOf } from "../../utils/format";

const NAV_ITEMS = [
  { label: "Dashboard", to: "/manager/dashboard", icon: LayoutDashboard },
  { label: "Bookings", to: "/manager/bookings", icon: Calendar },
  { label: "Staff", to: "/manager/staff", icon: Users },
];

export default function ManagerLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const user = auth.user || null;

  return (
    <div className="admin-layout admin-shell fixed inset-0 flex overflow-hidden bg-background text-foreground">
      <ManagerSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar. It carries identity and notifications only: the
            hamburger that used to sit here opened the same navigation the
            tab bar already holds, one thumb-length further away. */}
        <header className="sticky top-0 z-30 flex h-13 shrink-0 select-none items-center justify-between border-b border-border/80 bg-card/95 px-3.5 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => navigate("/manager/dashboard")}
            className="-ml-1 flex h-11 min-w-0 items-center gap-2.5 rounded-md px-1 text-left cursor-pointer"
          >
            <img
              src={logo}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-border object-cover shadow-2xs"
            />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold leading-none tracking-tight text-foreground">
                Manager Portal
              </span>
              <span className="mt-1 flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wider text-amber-700">
                <ShieldCheck size={10} className="shrink-0 text-amber-600" /> Event Lead
              </span>
            </span>
          </button>

          <NotificationBell />
        </header>

        {/* The scroll container. `portal-scroll` pads it past the tab bar and
            the home-indicator inset so the last row of a list is reachable. */}
        <main className="portal-scroll flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto max-w-[1600px] space-y-4">{children}</div>
        </main>

        <PortalMobileNav
          open={menuOpen}
          onOpenChange={setMenuOpen}
          items={NAV_ITEMS}
          portalName="Manager Portal"
          roleLabel="Event Lead"
          roleIcon={ShieldCheck}
          logo={logo}
          user={user}
          initials={initialsOf(user?.full_name || user?.email, "MG")}
          userSubtitle={user?.email || "Manager"}
          onSignOut={() => setConfirmSignOut(true)}
          notificationSlot={
            <NotificationBell isSidebarItem placement="top" onCloseSidebar={() => setMenuOpen(false)} />
          }
        />
      </div>

      {confirmSignOut && (
        <ConfirmDialog
          title="Sign Out"
          message="Are you sure you want to sign out of the Manager Portal?"
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
