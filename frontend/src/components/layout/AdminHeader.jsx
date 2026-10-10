import React from "react";
import { useLocation } from "react-router-dom";
import { Menu, Sparkles, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

import assistantVideo from "@/assets/animations/ireserve-ai-assistant-icon.mp4";
import assistantAvatar from "@/assets/images/zelle-avatar.png";

// Route name mapping for clear breadcrumb hierarchy
const ROUTE_MAP = {
  "/admin/dashboard": { section: "Overview", title: "Dashboard" },
  "/admin/customers": { section: "Directory", title: "Customers" },
  "/admin/messages": { section: "Communications", title: "Messages" },
  "/admin/payments": { section: "Finance", title: "Payments" },
  "/admin/refunds": { section: "Finance", title: "Refunds" },
  "/admin/bookings/inquiries": { section: "Bookings", title: "Inquiries" },
  "/admin/quotes": { section: "Bookings", title: "Inquiries" },
  "/admin/bookings/reservations": { section: "Bookings", title: "Reservations" },
  "/admin/bookings/ocular": { section: "Bookings", title: "Ocular Visits" },
  "/admin/bookings/history": { section: "Bookings", title: "Event History" },
  "/admin/packages": { section: "Service Management", title: "Packages" },
  "/admin/menu": { section: "Service Management", title: "Food Menu" },
  "/admin/gallery": { section: "Service Management", title: "Gallery" },
  "/admin/addons": { section: "Service Management", title: "Addons" },
  "/admin/inventory": { section: "Service Management", title: "Inventory" },
  "/admin/staff": { section: "Management", title: "Staff & Managers" },
  "/admin/analytics": { section: "System", title: "Analytics" },
  "/admin/business-info": { section: "System", title: "Business Info" },
  "/admin/logs": { section: "System", title: "Audit Logs" },
  "/admin/profile": { section: "Account", title: "Profile Settings" },
  "/admin/notifications": { section: "System", title: "Notifications" },
};

function getRouteMeta(pathname) {
  if (ROUTE_MAP[pathname]) return ROUTE_MAP[pathname];
  for (const [route, meta] of Object.entries(ROUTE_MAP)) {
    if (pathname.startsWith(route)) return meta;
  }
  return { section: "Admin", title: "Management" };
}

export default function AdminHeader({ onOpenMobileMenu, onOpenCopilot }) {
  const location = useLocation();
  const routeMeta = getRouteMeta(location.pathname);

  const handleOpenCopilot = () => {
    if (onOpenCopilot) {
      onOpenCopilot();
    } else {
      window.dispatchEvent(new CustomEvent("open-admin-copilot"));
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 select-none items-center justify-between border-b border-border/70 bg-card/90 px-3.5 sm:px-6 backdrop-blur-md transition-all">
      {/* Left side: Mobile menu toggle + Contextual Breadcrumb */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden flex items-center justify-center w-8 h-8 rounded-lg border border-border/80 bg-card text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all cursor-pointer"
          title="Open Menu"
          aria-label="Open Menu"
        >
          <Menu className="w-4.5 h-4.5" />
        </button>

        {/* Breadcrumb Hierarchy */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span className="hidden sm:inline font-medium text-muted-foreground/70">
            {routeMeta.section}
          </span>
          <ChevronRight className="hidden sm:inline w-3 h-3 text-muted-foreground/40 shrink-0" />
          <span className="font-semibold text-foreground truncate">
            {routeMeta.title}
          </span>
        </div>
      </div>

      {/* Right side: 'Ask Zelle AI' Trigger with character avatar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleOpenCopilot}
          className={cn(
            "group relative inline-flex items-center gap-2 pl-3 pr-1 py-1 rounded-full text-xs font-semibold",
            "bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]",
            "border border-slate-700/60 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer"
          )}
          title="Open Zelle AI Assistant"
          aria-label="Open Zelle AI Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110" />
          <span className="tracking-tight">Ask Zelle AI</span>
          <div className="w-7 h-7 rounded-full bg-white border border-white/90 shadow-2xs overflow-hidden shrink-0 flex items-center justify-center">
            <video
              src={assistantVideo}
              poster={assistantAvatar}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-125 select-none pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </button>
      </div>
    </header>
  );
}
