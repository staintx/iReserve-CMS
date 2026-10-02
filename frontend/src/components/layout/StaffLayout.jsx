import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/images/logo.jpg";
import { UserCheck, LogOut } from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import ConfirmDialog from "../common/ConfirmDialog";
import useAuth from "../../hooks/useAuth";
import { initialsOf } from "../../utils/format";

export default function StaffLayout({ children }) {
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const user = auth.user || null;

  const initials = initialsOf(user?.full_name || user?.email, "ST");

  return (
    <div className="admin-shell staff-portal min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E293B] font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 select-none items-center justify-between border-b border-slate-200/80 bg-white/95 px-3.5 sm:px-6 backdrop-blur">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          <button
            type="button"
            onClick={() => navigate("/staff/dashboard")}
            className="flex items-center gap-2.5 rounded-md text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#4C81E0]/40 shrink-0"
          >
            <img
              src={logo}
              alt="Caezelle's Logo"
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 rounded-full border border-slate-200 object-cover"
            />
            <div className="min-w-0">
              <span className="block truncate text-sm sm:text-base font-bold leading-tight text-[#1E293B]">
                Staff Portal
              </span>
              <span className="flex items-center gap-1 truncate text-[10px] font-semibold uppercase tracking-wider text-[#4C81E0]">
                <UserCheck size={11} className="shrink-0 text-[#4C81E0]" /> Operations Crew
              </span>
            </div>
          </button>
        </div>

        {/* Right: Notifications & User Account */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <NotificationBell />

          {/* User Account / Profile */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full bg-[#D6E4F7] text-[#4C81E0] text-xs font-bold flex items-center justify-center border border-[#4C81E0]/20 shrink-0"
                title={user?.full_name || "Staff Member"}
              >
                {initials}
              </div>
              <div className="hidden md:block text-left min-w-0 max-w-[160px]">
                <div className="text-xs font-semibold text-[#1E293B] truncate leading-tight">
                  {user?.full_name || "Staff Member"}
                </div>
                <div className="text-[10.5px] text-[#64748B] truncate">
                  {user?.position || "Catering Staff"}
                </div>
              </div>
            </div>

            {/* Simple Sign Out Button */}
            <button
              type="button"
              onClick={() => setConfirmSignOut(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-6 pb-12 sm:pb-8">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

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

