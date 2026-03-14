export default function AdminSystemLogsTable({ logs }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((l) => (
          <tr key={l._id}>
            <td>{l.action}</td>
            <td>{l.details}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
