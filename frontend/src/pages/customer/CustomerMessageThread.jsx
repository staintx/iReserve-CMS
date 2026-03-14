import { useNavigate, useParams } from "react-router-dom";
import CustomerDashboardLayout from "../../components/layout/CustomerDashboardLayout";

const mockThread = [
  { id: 1, sender: "agent", message: "Thank you for your message! Our team is reviewing your request and will get back to you shortly.", time: "01/05/2026, 10:26am" },
  { id: 2, sender: "agent", message: "Good Day Jeff, ano po 'yon?", time: "01/05/2026, 10:35am" },
  { id: 3, sender: "user", message: "Okay po, chat nalang po ako dito pag may tanong ako", time: "01/05/2026, 10:27am" }
];

export default function CustomerMessageThread() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <CustomerDashboardLayout
      title="Messages"
      subtitle="Communicate with Caezelle's Catering team"
    >
      <div className="message-thread">
        <div className="tile-header">
          <div>
            <strong>Wedding - Apr 24</strong>
            <div><small>{id?.toUpperCase()}</small></div>
          </div>
          <button className="btn-outline" type="button" onClick={() => navigate("/customer/messages")}>Back</button>
        </div>
        {mockThread.map((msg) => (
          <div key={msg.id}>
            <div className={`chat-bubble ${msg.sender === "user" ? "user" : "agent"}`}>
              {msg.message}
            </div>
            <small>{msg.time}</small>
          </div>
        ))}
        <div className="chat-input">
          <input placeholder="Type your message..." />
          <button className="btn" type="button">Send</button>
        </div>
      </div>
    </CustomerDashboardLayout>
  );
}
