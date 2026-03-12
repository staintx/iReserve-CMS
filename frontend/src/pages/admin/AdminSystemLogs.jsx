import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    AdminAPI.getLogs().then((res) => setLogs(res.data));
  }, []);

  return (
    <AdminLayout>
      <h1>System Logs</h1>
      <div className="panel">
        <table className="table">
          <thead><tr><th>Action</th><th>Details</th></tr></thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l._id}>
                <td>{l.action}</td>
                <td>{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}   