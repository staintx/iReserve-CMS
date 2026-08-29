import { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminCopilotPanel from "../admin/ui/AdminCopilotPanel";
import { Menu } from "lucide-react";
import { Button } from "../ui/button";

export default function AdminLayout({ children, fullBleed = false }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout admin-shell fixed inset-0 overflow-hidden bg-background flex text-foreground">
      <AdminSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      {/* Floating Menu Button for mobile */}
      {!mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-6 left-6 z-40 md:hidden flex items-center justify-center w-12 h-12 rounded-full bg-card border border-border shadow-lg text-muted-foreground hover:text-foreground active:scale-95 transition-all"
          title="Open Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
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


      {/* Global Admin AI Copilot Panel */}
      <AdminCopilotPanel />
    </div>
  );
}