import { useEffect, useState } from "react";
import { AdminAPI } from "../../api/admin";
import AdminLayout from "../../components/layout/AdminLayout";
import AdminSystemLogsTable from "../../components/tables/AdminSystemLogsTable";

export default function AdminSystemLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    AdminAPI.getLogs().then((res) => setLogs(res.data));
  }, []);

  return (
    <AdminLayout>
      <h1>System Logs</h1>
      <div className="panel">
        <AdminSystemLogsTable logs={logs} />
      </div>
    </AdminLayout>
  );
}   