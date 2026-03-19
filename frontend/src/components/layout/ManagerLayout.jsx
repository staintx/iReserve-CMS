import ManagerSidebar from "./ManagerSidebar";
import ManagerHeader from "./ManagerHeader";

export default function ManagerLayout({ children, onCalendar }) {
  return (
    <div className="page-shell">
      <div className="flex min-h-screen">
        <ManagerSidebar />
        <div className="flex-1">
          <ManagerHeader onCalendar={onCalendar} />
          <div className="px-6 pb-12 pt-8 sm:px-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
