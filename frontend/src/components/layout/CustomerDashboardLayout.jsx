import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import useAuth from "../../hooks/useAuth";
import logo from "../../assets/images/logo.jpg";
import ConfirmDialog from "../common/ConfirmDialog";
import NotificationBell from "../common/NotificationBell";
import { 
  LayoutDashboard, 
  Calendar, 
  MessageSquare, 
  LogOut, 
  ChevronLeft, 
  FileText, 
  Menu, 
  X, 
  Search, 
  Utensils, 
  Layers, 
  UserRound, 
  Plus,
  Sparkles,
  Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { CustomerAPI } from "../../api/customer";
import useRealTimeRefresh from "../../hooks/useRealTimeRefresh";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const navGroups = [
  {
    title: "Main",
    items: [
      { to: "/customer/dashboard", label: "Dashboard", desc: "Overview of your events", icon: LayoutDashboard },
      { to: "/customer/agent", label: "Agent", desc: "AI catering concierge", icon: Sparkles },
      { to: "/customer/inquiries", label: "My Inquiries", desc: "View quote requests", icon: FileText },
      { to: "/customer/bookings", label: "My Bookings", desc: "Track your event status", icon: Calendar },
      { to: "/customer/messages", label: "Messages", desc: "Chat with our team", icon: MessageSquare, hasBadge: "messages" }
    ]
  },
  {
    title: "Explore & Services",
    items: [
      { to: "/packages", label: "Packages & Menus", desc: "Browse catering tiers", icon: Utensils },
      { to: "/gallery", label: "Gallery & Themes", desc: "Event setup inspiration", icon: Layers }
    ]
  },
  {
    title: "Account",
    items: [
      { to: "/customer/profile", label: "Profile & Security", desc: "Personal info and settings", icon: UserRound }
    ]
  }
];

export default function CustomerDashboardLayout({ title, subtitle, actions, fullBleed = false, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnreadCounts = async () => {
    try {
      const convoRes = await CustomerAPI.getConversations().catch(() => ({ data: [] }));
      const convos = convoRes.data || [];
      const unread = convos.filter(c => {
        const p = c.participants?.find(part => String(part.user._id || part.user) === String(user?._id));
        return p && p.unread_count > 0;
      }).length;
      setUnreadMessages(unread);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCounts();
  }, [user]);

  useRealTimeRefresh(fetchUnreadCounts);

  const initials = (() => {
    const name = user?.full_name || user?.email || "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "CU";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase().trim();
    if (q.includes("book") || q.includes("event") || q.includes("reserv")) {
      navigate("/customer/bookings");
    } else if (q.includes("inquir") || q.includes("quote")) {
      navigate("/customer/inquiries");
    } else if (q.includes("pack") || q.includes("menu")) {
      navigate("/packages");
    } else if (q.includes("msg") || q.includes("chat") || q.includes("message")) {
      navigate("/customer/messages");
    } else {
      navigate(`/customer/inquiries`);
    }
  };

  const navLinks = (onNavigate) => (
    <nav className="flex-1 px-3 py-3 space-y-6 overflow-y-auto">
      {navGroups.map((group) => (
        <div key={group.title} className="space-y-1">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {group.title}
          </div>
          <div className="space-y-0.5 pt-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) => cn(
                  "group relative flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all",
                  isActive
                    ? "bg-[#2C4B8A]/10 text-[#2C4B8A] font-semibold"
                    : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors",
                        isActive ? "bg-[#2C4B8A] text-white shadow-xs" : "text-slate-500 group-hover:text-slate-800"
                      )}>
                        <item.icon className="w-4 h-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.hasBadge === "messages" && unreadMessages > 0 && (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[11px] font-bold leading-none text-white bg-[#2C4B8A] rounded">
                        {unreadMessages}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );

  const profileChip = (
    <div className="p-3 border-t border-slate-200 bg-white">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className="flex items-center gap-2.5 p-2 rounded-md hover:bg-slate-50 transition-colors cursor-pointer group"
            role="button"
            tabIndex={0}
          >
            <div className="w-8 h-8 rounded-full bg-[#2C4B8A]/10 text-[#2C4B8A] border border-slate-200 font-bold flex items-center justify-center shrink-0 text-xs">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-xs text-slate-900 truncate">{user?.full_name || "Customer Account"}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email || "customer@ireserve.com"}</div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLogoutConfirm(true);
              }}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-56 bg-white border border-slate-200 shadow-lg p-1 z-50">
          <div className="px-2.5 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-bold text-slate-900 truncate">{user?.full_name || "Customer"}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
          </div>
          <DropdownMenuItem
            onClick={() => {
              setMobileOpen(false);
              navigate("/customer/profile");
            }}
            className="text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <UserRound className="w-3.5 h-3.5 mr-2 text-slate-400" />
            Profile & Security
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setMobileOpen(false);
              navigate("/customer/bookings");
            }}
            className="text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 mr-2 text-slate-400" />
            My Bookings
          </DropdownMenuItem>
          <div className="h-px bg-slate-100 my-1" />
          <DropdownMenuItem
            onClick={() => setShowLogoutConfirm(true)}
            className="text-xs text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer font-semibold"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  const brandHeader = (onNavigate) => (
    <div
      className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-200"
      onClick={() => { onNavigate?.(); navigate("/"); }}
      onKeyDown={(event) => event.key === "Enter" && navigate("/")}
      role="button"
      tabIndex={0}
    >
      <img src={logo} alt="Caezelle's logo" className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs" />
      <div className="min-w-0">
        <div className="font-sans font-bold text-sm text-slate-900 tracking-tight leading-none">Caezelle's Catering</div>
        <div className="text-[10px] font-semibold text-[#D2B67C] uppercase tracking-wider mt-1">Customer Portal</div>
      </div>
    </div>
  );

  return (
    <div className="customer-shell fixed inset-0 overflow-hidden bg-white flex text-slate-900 font-sans">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — Stripe Minimalist Style */}
      <aside className={cn(
        "w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed md:sticky top-0 z-50 transition-transform duration-200 ease-in-out shrink-0",
        mobileOpen ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="flex items-center justify-between md:block">
          <div className="flex-1">{brandHeader(() => setMobileOpen(false))}</div>
          <Button variant="ghost" size="icon" className="mr-2 text-slate-500 md:hidden" onClick={() => setMobileOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        {navLinks(() => setMobileOpen(false))}
        
        {profileChip}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Stripe-style Modern Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)} className="text-slate-600 md:hidden -ml-2">
              <Menu className="w-5 h-5" />
            </Button>

            {/* Stripe Sleek Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search bookings, inquiries, packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-lg border border-transparent focus:border-[#2C4B8A]/40 focus:ring-2 focus:ring-[#2C4B8A]/10 outline-none transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                ↵
              </span>
            </form>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <NotificationBell />
          </div>
        </header>

        {/* Scrollable Page Body */}
        {fullBleed ? (
          <main className="flex-1 overflow-hidden bg-white">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto bg-white p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-6xl">
              {/* Page Header (if title/actions passed) */}
              {(title || subtitle || actions) && (
                <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between border-b border-slate-100 pb-5">
                  <div className="min-w-0">
                    {title && (
                      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl font-sans">{title}</h1>
                    )}
                    {subtitle && <p className="mt-1 text-sm text-slate-500 sm:text-base">{subtitle}</p>}
                  </div>
                  {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
                </div>
              )}
              {children}
            </div>
          </main>
        )}
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          message="Are you sure you want to log out of your customer account?"
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

