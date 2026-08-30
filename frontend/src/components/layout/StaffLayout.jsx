import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StaffSidebar from "./StaffSidebar";
import PortalMobileNav from "./PortalMobileNav";
import logo from "../../assets/images/logo.jpg";
import { ClipboardList, CalendarDays, UserCheck } from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import ConfirmDialog from "../common/ConfirmDialog";
import useAuth from "../../hooks/useAuth";
import { initialsOf } from "../../utils/format";

/* Two destinations plus More. The second is not a route: setting off-duty
   days is the crew's other recurring job and it lived three taps deep, as
   a button at the top of the shifts page that opened a dialog. The tab
   deep-links the same dialog through a query the dashboard already reads,
   so no route, guard or permission changes. */
const NAV_ITEMS = [
  {
    label: "My Shifts",
    to: "/staff/dashboard",
    icon: ClipboardList,
    activeWhen: (loc) =>
      loc.pathname.startsWith("/staff") && !new URLSearchParams(loc.search).get("availability"),
  },
  {
    label: "Availability",
    to: "/staff/dashboard?availability=1",
    icon: CalendarDays,
    activeWhen: (loc) => Boolean(new URLSearchParams(loc.search).get("availability")),
  },
];

export default function StaffLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const user = auth.user || null;

  return (
    <div className="admin-layout admin-shell fixed inset-0 flex overflow-hidden bg-background text-foreground">
      <StaffSidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar: identity and notifications. Navigation lives at
            the bottom, within thumb reach, not behind a top-left hamburger. */}
        <header className="sticky top-0 z-30 flex h-13 shrink-0 select-none items-center justify-between border-b border-border/80 bg-card/95 px-3.5 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => navigate("/staff/dashboard")}
            className="-ml-1 flex h-11 min-w-0 items-center gap-2.5 rounded-md px-1 text-left cursor-pointer"
          >
            <img
              src={logo}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-border object-cover shadow-2xs"
            />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold leading-none tracking-tight text-foreground">
                Staff Portal
              </span>
              <span className="mt-1 flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wider text-primary">
                <UserCheck size={10} className="shrink-0 text-primary" /> Operations Crew
              </span>
            </span>
          </button>

          <NotificationBell />
        </header>

        <main className="portal-scroll flex-1 overflow-y-auto p-3 sm:p-5">
          <div className="mx-auto max-w-[1600px] space-y-4">{children}</div>
        </main>

        <PortalMobileNav
          open={menuOpen}
          onOpenChange={setMenuOpen}
          items={NAV_ITEMS}
          portalName="Staff Portal"
          roleLabel="Operations Crew"
          roleIcon={UserCheck}
          logo={logo}
          user={user}
          initials={initialsOf(user?.full_name || user?.email, "ST")}
          userSubtitle={user?.position || "Catering Staff"}
          onSignOut={() => setConfirmSignOut(true)}
          notificationSlot={
            <NotificationBell isSidebarItem placement="top" onCloseSidebar={() => setMenuOpen(false)} />
          }
        />
      </div>

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
