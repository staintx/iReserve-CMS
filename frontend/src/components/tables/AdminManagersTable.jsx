import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";

export default function AdminManagersTable({ list, tab, onEdit, onToggleStatus, onView }) {
  const formatId = (value, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    if (tab === "customers") return `CUS-${suffix}`;
    if (tab === "staff") return `STF-${suffix}`;
    return `MGR-${suffix}`;
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No users found.
              </TableCell>
            </TableRow>
          ) : (
            list.map((m, index) => (
              <TableRow key={m._id}>
                <TableCell className="font-medium text-muted-foreground">{formatId(m._id, index)}</TableCell>
                <TableCell className="font-medium">{m.full_name}</TableCell>
                <TableCell className="capitalize text-muted-foreground">
                  {tab === "customers" ? "customer" : m.role}
                </TableCell>
                <TableCell>
                  <Badge variant={m.is_active ? "success" : "destructive"}>
                    {m.is_active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {tab !== "customers" && (
                      <Button variant="outline" size="sm" onClick={() => onView?.(m)}>
                        View
                      </Button>
                    )}
                    {tab !== "customers" && (
                      <Button variant="outline" size="sm" onClick={() => onEdit(m)}>
                        Edit
                      </Button>
                    )}
                    <Button 
                      variant={m.is_active ? "destructive" : "default"} 
                      size="sm" 
                      onClick={() => onToggleStatus(m)}
                    >
                      {tab === "customers"
                        ? (m.is_active ? "Block" : "Unblock")
                        : (m.is_active ? "Disable" : "Enable")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
