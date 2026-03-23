import ManagerSidebar from "./ManagerSidebar";
import ManagerHeader from "./ManagerHeader";

export default function ManagerLayout({ children }) {
  return (
    <div className="page-shell">
      <div className="flex min-h-screen bg-slate-50">
        <ManagerSidebar />
        <div className="flex-1">
          <ManagerHeader />
          <div className="px-6 pt-8 pb-12 sm:px-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
