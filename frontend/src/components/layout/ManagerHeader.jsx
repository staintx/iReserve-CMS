import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import { Bell, LogOut, Menu } from "lucide-react";
import ConfirmDialog from "../common/ConfirmDialog";

export default function ManagerHeader() {
  const { user, logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 border-b border-slate-200 bg-white/80 shadow-soft backdrop-blur">
        <div className="flex items-center gap-4">
          <button className="grid w-10 h-10 border rounded-full place-items-center border-slate-200 text-slate-700 lg:hidden" type="button" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="grid w-10 h-10 overflow-hidden bg-white border place-items-center rounded-2xl border-slate-200">
              <img src={logo} alt="Caezelle's logo" className="object-cover w-full h-full" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-tight text-ink-900">Caezelle&apos;s Manager</div>
              <div className="text-xs text-slate-500">System Management</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="grid w-10 h-10 border rounded-full place-items-center border-slate-200 text-slate-700" type="button" aria-label="Notifications">
            <Bell className="w-5 h-5" />
          </button>
          <div className="hidden text-sm font-semibold text-ink-900 sm:block">
            {user?.full_name || "Manager"}
          </div>
          <span className="hidden w-px h-6 bg-slate-200 sm:block" aria-hidden="true" />
          <button className="inline-flex items-center gap-2 text-sm font-semibold transition text-slate-600 hover:text-ink-900" type="button" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut className="w-4 h-4" />
            Signout
          </button>
        </div>
      </header>
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
    </>
  );
}
