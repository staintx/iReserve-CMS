import StaffHeader from "./StaffHeader";

export default function StaffLayout({ children, onCalendar }) {
  return (
    <div className="page-shell">
      <div className="flex min-h-screen">
        <div className="flex-1">
          <StaffHeader onCalendar={onCalendar} />
          <div className="px-6 pt-8 pb-12 sm:px-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
