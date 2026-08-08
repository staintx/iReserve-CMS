export default function Btn({ children, variant = "primary", onClick, size = "md", className = "" }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all cursor-pointer select-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover",
    secondary: "bg-white text-foreground border border-border hover:bg-muted",
    danger: "bg-destructive text-white hover:opacity-90",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
    // Decorative/premium accent only — never used as a primary CTA (design_updated.md)
    gold: "bg-transparent text-accent border border-accent hover:bg-accent/10",
  };
  return <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}
