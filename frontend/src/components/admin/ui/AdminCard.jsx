export default function AdminCard({ children, className = "", ...props }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
