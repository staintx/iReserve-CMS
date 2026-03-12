import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);

  const load = () => AdminAPI.getInquiries().then((res) => setInquiries(res.data));

  useEffect(() => {
    load();
  }, []);

  const updateStatus = (id, status) => {
    AdminAPI.updateInquiry(id, { status }).then(load);
  };

  return (
    <AdminLayout>
      <h1>Inquiry Management</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Date</th>
              <th>Guests</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inq) => (
              <tr key={inq._id}>
                <td>{inq.event_type}</td>
                <td>{new Date(inq.event_date).toLocaleDateString()}</td>
                <td>{inq.guest_count}</td>
                <td>{inq.status}</td>
                <td>
                  <button className="btn" onClick={() => updateStatus(inq._id, "approved")}>Approve</button>
                  <button className="btn-danger" onClick={() => updateStatus(inq._id, "rejected")}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}