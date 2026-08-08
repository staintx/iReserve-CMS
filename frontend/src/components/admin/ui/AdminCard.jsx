export default function AdminCard({ children, className = "", ...props }) {
  return (
    <div className={`bg-card rounded-2xl border border-border shadow-sm p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
