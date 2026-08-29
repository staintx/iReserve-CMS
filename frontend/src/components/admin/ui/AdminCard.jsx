export default function AdminCard({ children, className = "", ...props }) {
  return (
    <div className={`bg-card rounded-lg border border-border/80 shadow-2xs p-3.5 sm:p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}


