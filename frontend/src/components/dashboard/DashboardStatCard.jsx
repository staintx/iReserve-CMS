export default function DashboardStatCard({ label, value, helper }) {
  return (
    <div className="dashboard-card">
      <p>{label}</p>
      <h3>{value}</h3>
      {helper && <small>{helper}</small>}
    </div>
  );
}
