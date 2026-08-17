import { useState } from "react";
import ManagerSidebar from "./ManagerSidebar";
import { Menu } from "lucide-react";

export default function ManagerLayout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="admin-layout admin-shell fixed inset-0 overflow-hidden bg-background flex text-foreground">
      <ManagerSidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
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

      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
