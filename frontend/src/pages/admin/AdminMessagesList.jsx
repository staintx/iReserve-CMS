import AdminLayout from "../../components/layout/AdminLayout";
import InboxHub from "../../components/chat/InboxHub";

export default function AdminMessagesList() {
  return (
    <AdminLayout fullBleed>
      <div className="flex-1 flex flex-col min-h-0 h-full space-y-2">
        <div className="shrink-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Messages &amp; Customer Support</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage customer inquiries, event messaging, and support requests in real-time.</p>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs">
          <InboxHub basePath="/admin/messages" />
        </div>
      </div>
    </AdminLayout>
  );
}