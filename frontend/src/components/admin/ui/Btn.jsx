export default function Btn({ children, variant = "primary", onClick, size = "md", className = "" }) {
  const base = "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-all cursor-pointer select-none";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "bg-[#111827] text-white hover:bg-[#1F2937]",
    secondary: "bg-white text-[#374151] border border-gray-200 hover:bg-gray-50",
    danger: "bg-[#EF4444] text-white hover:bg-[#DC2626]",
    ghost: "text-[#6B7280] hover:text-[#111827] hover:bg-gray-100",
    gold: "bg-[#D4AF37] text-[#111111] hover:bg-[#C09B2A]",
  };
  return <button onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>{children}</button>;
}
