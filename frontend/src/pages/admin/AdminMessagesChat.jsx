import AdminLayout from "../../components/layout/AdminLayout";
import InboxHub from "../../components/chat/InboxHub";

export default function AdminMessagesChat() {
  return (
    <AdminLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Messages & Customer Support</h1>
          <p className="text-xs text-muted-foreground">Manage customer inquiries, event messaging, and support requests in real-time.</p>
        </div>
        <InboxHub basePath="/admin/messages" />
      </div>
    </AdminLayout>
  );
}