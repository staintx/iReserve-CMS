export default function Btn({ children, variant = "primary", onClick, size = "md", className = "", type = "button", disabled = false }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-all shadow-2xs cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-3 py-1.5 text-xs h-8", md: "px-4 py-2 text-xs sm:text-sm h-9" };
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover active:scale-[0.98]",
    secondary: "bg-white text-foreground border border-border/80 hover:bg-muted/80 text-foreground",
    danger: "bg-destructive text-white hover:opacity-90",
    ghost: "text-muted-foreground hover:text-foreground hover:bg-muted shadow-none",
    // Decorative/premium accent only — never used as a primary CTA (design_updated.md)
    gold: "bg-transparent text-accent border border-accent hover:bg-accent/10",
  };
  return (
    <button 
      type={type} 
      onClick={onClick} 
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
