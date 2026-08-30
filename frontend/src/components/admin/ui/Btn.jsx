export default function Btn({ children, variant = "primary", onClick, size = "md", className = "", type = "button", disabled = false }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-all shadow-2xs cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed";
  // Heights are unchanged from the sm breakpoint up. Below it every button
  // gains a touch floor.
  // h-8/h-9 is 32/36px, and these are the confirm and cancel controls at the
  // bottom of every sheet in the app.
  //
  // `xs` is new: several call sites already passed it, and with no entry here
  // the template produced the literal class "undefined", so those buttons
  // shipped with no padding or height at all.
  const sizes = {
    xs: "px-2.5 text-[11px] h-7 max-sm:min-h-[38px]",
    sm: "px-3 py-1.5 text-xs h-8 max-sm:min-h-[40px]",
    md: "px-4 py-2 text-xs sm:text-sm h-9 max-sm:min-h-[44px]",
  };
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
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
