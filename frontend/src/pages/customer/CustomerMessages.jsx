import { useNavigate } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";

const threads = [
  {
    id: "inq-024",
    title: "Wedding - Apr 24",
    code: "INQ-024",
    last: "You: Okay na chat nalang po ako dito pag may tanong ako",
    date: "Jan 01"
  },
  {
    id: "evt-002",
    title: "Wedding - Apr 10",
    code: "EVT-002",
    last: "You: Sige po, maraming salamat po",
    date: "Feb 15"
  }
];

export default function CustomerMessages() {
  const navigate = useNavigate();

  return (
    <CustomerDashboardLayout
      title="Messages"
      subtitle="Communicate with Caezelle's Catering team"
    >
      <div className="message-list">
        {threads.map((thread) => (
          <div
            key={thread.id}
            className="list-card"
            onClick={() => navigate(`/customer/messages/${thread.id}`)}
          >
            <div>
              <strong>{thread.title}</strong>
              <div><small>{thread.code}</small></div>
              <div><small>{thread.last}</small></div>
            </div>
            <small>{thread.date}</small>
          </div>
        ))}
      </div>
    </CustomerDashboardLayout>
  );
}
