import AdminLayout from "../../components/layout/AdminLayout";

export default function AdminManagers() {
  return (
    <AdminLayout>
      <h1>Managers Directory</h1>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Manager ID</th>
              <th>Name</th>
              <th>Active Events</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>MGR-001</td>
              <td>James Rodriguez</td>
              <td>3</td>
              <td>Active</td>
            </tr>
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}