import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";

export default function AdminHeader() {
  const { logout } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/70 bg-white/80 px-6 shadow-soft backdrop-blur">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Caezelle's logo" className="h-8 w-8 rounded-2xl object-cover" />
          <span className="text-sm font-semibold">Caezelle's Catering</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" onClick={() => setShowLogoutConfirm(true)} type="button">Sign out</button>
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