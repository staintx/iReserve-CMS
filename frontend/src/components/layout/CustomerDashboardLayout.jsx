import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";
import NotificationBell from "../common/NotificationBell";
import { LayoutDashboard, Calendar, MessageSquare, LogOut, ChevronLeft, FileText, Menu, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const navItems = [
  { to: "/customer/dashboard", label: "Dashboard", desc: "Overview of your events", icon: LayoutDashboard },
  { to: "/customer/assistant", label: "Zelle AI Assistant", desc: "Concierge, Quotes & Pay", icon: Sparkles, isAi: true },
  { to: "/customer/inquiries", label: "My Inquiries", desc: "View quote requests", icon: FileText },
  { to: "/customer/bookings", label: "My Bookings", desc: "Track your event status", icon: Calendar },
  { to: "/customer/messages", label: "Messages", desc: "Chat with our team", icon: MessageSquare }
];

export default function CustomerDashboardLayout({ title, subtitle, actions, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const navLinks = (onNavigate) => (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) => cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
            isActive
              ? "bg-powder text-primary before:absolute before:left-0 before:top-1/2 before:h-6 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {({ isActive }) => (
            <>
              <span className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:text-foreground"
              )}>
                <item.icon className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <div className={cn("font-semibold text-sm", isActive ? "text-primary" : "text-foreground")}>{item.label}</div>
                <div className="text-xs text-muted-foreground truncate">{item.desc}</div>
              </div>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );

  const profileChip = (
    <div className="p-4 border-t border-border">
      <div
        className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer"
        onClick={() => { setMobileOpen(false); navigate('/customer/profile'); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && navigate('/customer/profile')}
      >
        <div className="w-10 h-10 rounded-full bg-accent/15 text-accent border border-accent/30 font-bold flex items-center justify-center shrink-0">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-foreground truncate">{user?.full_name || "Customer"}</div>
          <div className="text-xs text-muted-foreground">Customer</div>
        </div>
      </div>
    </div>
  );

  const brandHeader = (onNavigate) => (
    <div
      className="p-6 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => { onNavigate?.(); navigate("/"); }}
      onKeyDown={(event) => event.key === "Enter" && navigate("/")}
      role="button"
      tabIndex={0}
    >
      <img src={logo} alt="Caezelle's logo" className="w-12 h-12 rounded-full object-cover border border-border shadow-sm" />
      <div>
        <div className="font-serif font-bold text-foreground leading-tight">Caezelle's Catering</div>
        <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-0.5">Customer Portal</div>
      </div>
    </div>
  );

  return (
    <div className="customer-shell fixed inset-0 overflow-hidden bg-background flex">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — sticky column on desktop, slide-in drawer on mobile */}
      <aside className={cn(
        "w-72 bg-card border-r border-border flex flex-col h-screen fixed md:sticky top-0 z-50 transition-transform duration-300 ease-in-out",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between md:block">
          <div className="flex-1">{brandHeader(() => setMobileOpen(false))}</div>
          <Button variant="ghost" size="icon" className="mr-4 text-muted-foreground md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        {navLinks(() => setMobileOpen(false))}
        {profileChip}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 sticky top-0 z-10">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-muted-foreground md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-muted-foreground md:hidden">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hidden md:flex text-muted-foreground gap-1 hover:text-foreground">
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

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {/* One page header for the whole portal: where am I, and what can I do here. */}
            {(title || subtitle || actions) && (
              <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                  {title && (
                    <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
                  )}
                  {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
                </div>
                {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
              </div>
            )}
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
