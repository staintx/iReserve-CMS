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

export default function AdminMenuTable({ items, onEdit, onToggleAvailability, onDelete }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No menu items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((m) => (
              <TableRow key={m._id}>
                <TableCell className="font-medium">{m.name}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{m.category}</TableCell>
                <TableCell>
                  <Badge variant={m.available ? "success" : "secondary"}>
                    {m.available ? "Available" : "Unavailable"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {m._id?.startsWith("mock-") ? null : (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(m)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onToggleAvailability(m)}>
                        {m.available ? "Disable" : "Enable"}
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(m._id)}>
                        Delete
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
