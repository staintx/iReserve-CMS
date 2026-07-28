import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";
import NotificationBell from "../common/NotificationBell";
import { Button } from "../ui/button";
import { LogOut, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AdminHeader() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 px-4 sm:px-6 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-1 text-muted-foreground md:hidden">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <img src={logo} alt="Caezelle's logo" className="h-8 w-8 rounded-full object-cover border border-border shadow-sm" />
          <span className="text-sm font-bold font-serif hidden sm:inline-block">Caezelle's Catering</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2" onClick={() => setShowLogoutConfirm(true)}>
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
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