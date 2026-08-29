export default function AdminCard({ children, className = "", ...props }) {
  return (
    <div className={`bg-card rounded-md border border-border/80 shadow-2xs p-4 sm:p-4.5 transition-all ${className}`} {...props}>
      {children}
    </div>
  );
}


