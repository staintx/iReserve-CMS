export default function AdminInventoryTable({ items, onEdit, onToggleAvailability }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Unit</th>
          <th>Availability</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {items.map((i) => (
          <tr key={i._id}>
            <td>{i.item_name}</td>
            <td>{i.quantity}</td>
            <td>
              <span className={`badge-status ${i.available ? "active" : "inactive"}`}>
                {i.available ? "Available" : "Unavailable"}
              </span>
            </td>
            <td>
              {i._id?.startsWith("mock-") ? null : (
                <>
                  <button className="btn-outline" onClick={() => onEdit(i)}>Edit</button>
                  <button className="btn-outline" onClick={() => onToggleAvailability(i)}>
                    {i.available ? "Disable" : "Enable"}
                  </button>
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
