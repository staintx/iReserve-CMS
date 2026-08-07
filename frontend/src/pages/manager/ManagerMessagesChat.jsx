import ManagerLayout from "../../components/layout/ManagerLayout";
import InboxHub from "../../components/chat/InboxHub";

export default function ManagerMessagesChat() {
  return (
    <ManagerLayout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Event Messages & Support</h1>
          <p className="text-xs text-muted-foreground">Communicate directly with clients for your assigned bookings and inquiries.</p>
        </div>
        <InboxHub basePath="/manager/messages" />
      </div>
    </ManagerLayout>
  );
}
