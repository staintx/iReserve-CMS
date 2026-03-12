import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-transparent text-ink-900">
      <div className="flex min-h-screen">
      <AdminSidebar />
        <div className="flex-1">
          <AdminHeader />
          <div className="px-6 pb-10 pt-6 sm:px-10">{children}</div>
        </div>
      </div>
    </div>
  );
}