import AdminLayout from "../../components/layout/AdminLayout";
import BusinessInfoPanel from "../../components/admin/BusinessInfoPanel";

export default function AdminBusinessInfo() {
  return (
    <AdminLayout>
      <div className="space-y-4 bg-background min-h-screen">
        <div className="pb-1 border-b border-border/40">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Business Settings &amp; Info</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Update contact details, operating hours, policies, and booking pricing rules.</p>
        </div>
        <BusinessInfoPanel />
      </div>
    </AdminLayout>
  );
}