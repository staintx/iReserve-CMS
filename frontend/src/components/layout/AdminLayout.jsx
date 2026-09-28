import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import AdminCopilotPanel from "../admin/ui/AdminCopilotPanel";

export default function AdminLayout({ children, fullBleed = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout admin-shell fixed inset-0 overflow-hidden bg-background flex text-foreground">
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Persistent Top Header with breadcrumb and Ask Zelle AI trigger */}
        <AdminHeader onOpenMobileMenu={() => setMobileOpen(true)} />

        {fullBleed ? (
          <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden p-3 sm:p-4 lg:p-5">
            {children}
          </main>
        ) : (
          <main className="flex-1 p-4 sm:p-6 lg:p-7 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto space-y-5">
              {children}
            </div>
          </main>
        )}
      </div>

      {/* Global Admin AI Copilot Flyout Panel */}
      <AdminCopilotPanel />
    </div>
  );
}