import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";
import InboxHub from "../../components/chat/InboxHub";

export default function CustomerMessages() {
  return (
    <CustomerDashboardLayout fullBleed>
      <InboxHub basePath="/customer/messages" />
    </CustomerDashboardLayout>
  );
}
