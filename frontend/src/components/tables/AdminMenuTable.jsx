export default function AdminMenuTable({ items, onEdit, onToggleAvailability, onDelete }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Category</th>
          <th>Availability</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((m) => (
          <tr key={m._id}>
            <td>{m.name}</td>
            <td>{m.category}</td>
            <td>
              <span className={`badge-status ${m.available ? "active" : "inactive"}`}>
                {m.available ? "Available" : "Unavailable"}
              </span>
            </td>
            <td>
              {m._id?.startsWith("mock-") ? null : (
                <>
                  <button className="btn-outline" onClick={() => onEdit(m)}>Edit</button>
                  <button className="btn-outline" onClick={() => onToggleAvailability(m)}>
                    {m.available ? "Disable" : "Enable"}
                  </button>
                  <button className="btn-danger" onClick={() => onDelete(m._id)}>Delete</button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
