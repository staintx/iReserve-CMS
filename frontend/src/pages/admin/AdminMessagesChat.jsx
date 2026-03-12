import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminMessagesChat() {
  return (
    <AdminLayout>
      <h1>Messages Chat</h1>
      <div className="panel">
        <div className="chat-bubble">Customer: Hello po</div>
        <div className="chat-bubble right">Admin: Good day po</div>
        <div className="chat-input">
          <input placeholder="Type your message..." />
          <button className="btn">Send</button>
        </div>
      </div>
    </AdminLayout>
  );
}