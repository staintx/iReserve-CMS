import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import StaffSidebar from "./StaffSidebar";
import logo from "../../assets/images/logo.jpg";
import { 
  Menu, 
  ClipboardList, 
  CalendarDays, 
  UserCheck
} from "lucide-react";
import NotificationBell from "../common/NotificationBell";
import { cn } from "@/lib/utils";

export default function StaffLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="admin-layout admin-shell fixed inset-0 overflow-hidden bg-background flex text-foreground">
      <StaffSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Top Header Bar */}
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-12 px-3.5 bg-card/95 backdrop-blur border-b border-border/80 shrink-0 select-none">
          <div 
            className="flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => navigate("/staff/dashboard")}
          >
            <img 
              src={logo} 
              alt="Caezelle's logo" 
              className="w-7 h-7 rounded-full object-cover border border-border shadow-2xs shrink-0" 
            />
            <div className="min-w-0">
              <div className="font-bold text-xs text-foreground leading-none tracking-tight truncate">Staff Portal</div>
              <div className="text-[9.5px] font-semibold text-amber-700 uppercase tracking-wider mt-0.5 truncate flex items-center gap-0.5">
                <UserCheck size={10} className="text-amber-600 shrink-0" /> Operations Crew
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted border border-border/70 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              title="Open Navigation Drawer"
              aria-label="Open Navigation Drawer"
            >
              <Menu size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-3 pb-20 sm:p-5 sm:pb-5 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur border-t border-border/80 px-2 py-1 flex items-center justify-around h-14 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-lg select-none">
          <NavLink
            to="/staff/dashboard"
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-medium transition-colors cursor-pointer rounded-md",
              location.pathname === "/staff/dashboard"
                ? "text-primary font-bold" 
                : "text-muted-foreground hover:text-foreground active:scale-95"
            )}
          >
            <div className={cn(
              "w-8 h-5 flex items-center justify-center rounded-full transition-all",
              location.pathname === "/staff/dashboard" && "bg-primary/10 text-primary"
            )}>
              <ClipboardList size={16} />
            </div>
            <span className="mt-0.5 tracking-tight">My Shifts</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 text-[10.5px] font-medium text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer rounded-md"
          >
            <div className="w-8 h-5 flex items-center justify-center rounded-full">
              <Menu size={16} />
            </div>
            <span className="mt-0.5 tracking-tight">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
