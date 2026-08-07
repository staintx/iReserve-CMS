import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import InboxHub from "../../components/chat/InboxHub";

export default function CustomerMessages() {
  return (
    <CustomerDashboardLayout
      title="Messages"
      subtitle="Communicate directly with your event manager and Caezelle's support team"
    >
      <InboxHub basePath="/customer/messages" />
    </CustomerDashboardLayout>
  );
}
