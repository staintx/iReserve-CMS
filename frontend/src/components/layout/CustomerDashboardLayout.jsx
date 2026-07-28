import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";
import NotificationBell from "../common/NotificationBell";
import { LayoutDashboard, Calendar, CreditCard, MessageSquare, LogOut, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const navItems = [
  { to: "/customer/dashboard", label: "Dashboard", desc: "Overview of your events", icon: LayoutDashboard },
  { to: "/customer/bookings", label: "My Bookings", desc: "Track your event status", icon: Calendar },
  { to: "/customer/payments", label: "Payment History", desc: "View transactions", icon: CreditCard },
  { to: "/customer/messages", label: "Messages", desc: "Chat with our team", icon: MessageSquare }
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
    <div className="min-h-screen bg-accent/5 flex">
      {/* Sidebar */}
      <aside className="w-72 bg-card border-r border-border hidden md:flex flex-col h-screen sticky top-0">
        <div 
          className="p-6 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => navigate("/")}
          onKeyDown={(event) => event.key === "Enter" && navigate("/")}
          role="button"
          tabIndex={0}
        >
          <img src={logo} alt="Caezelle's logo" className="w-12 h-12 rounded-full object-cover border border-border shadow-sm" />
          <div>
            <div className="font-serif font-bold text-foreground leading-tight">Caezelle's Catering</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">Customer Portal</div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink 
              key={item.to} 
              to={item.to} 
              className={({ isActive }) => cn(
                "flex items-center gap-3 p-3 rounded-xl transition-all",
                isActive 
                  ? "bg-accent/10 text-accent" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <div>
                <div className="font-medium text-sm text-foreground">{item.label}</div>
                <div className="text-xs opacity-80">{item.desc}</div>
              </div>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border">
          <div 
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer" 
            onClick={() => navigate('/customer/profile')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate('/customer/profile')}
          >
            <div className="w-10 h-10 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-foreground truncate">{user?.full_name || "Customer"}</div>
              <div className="text-xs text-muted-foreground">Customer</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2 text-muted-foreground md:hidden">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hidden md:flex text-muted-foreground gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {(title || subtitle) && (
            <div className="mb-8">
              {title && <h1 className="text-3xl font-serif font-bold text-foreground mb-2">{title}</h1>}
              {subtitle && <p className="text-muted-foreground text-lg">{subtitle}</p>}
            </div>
          )}
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
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
