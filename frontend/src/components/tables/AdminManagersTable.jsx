export default function AdminManagersTable({ list, tab, onEdit, onRemove }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {list.map((m, index) => (
          <tr key={m._id}>
            <td>{tab === "managers" ? `MGR-${String(index + 1).padStart(3, "0")}` : `STF-${String(index + 1).padStart(3, "0")}`}</td>
            <td>{m.full_name}</td>
            <td>{m.role}</td>
            <td>
              <span className={`badge-status ${m.is_active ? "active" : "inactive"}`}>
                {m.is_active ? "Active" : "Inactive"}
              </span>
            </td>
            <td>
              {m._id?.startsWith("mock-") ? null : (
                <>
                  <button className="btn-outline" onClick={() => onEdit(m)}>Edit</button>
                  <button className="btn-danger" onClick={() => onRemove(m._id)}>Disable</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
