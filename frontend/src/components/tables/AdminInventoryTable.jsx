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

export default function AdminInventoryTable({ items, onEdit, onToggleAvailability }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Item Name</TableHead>
            <TableHead>Unit</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No inventory items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((i) => (
              <TableRow key={i._id}>
                <TableCell className="font-medium">{i.item_name}</TableCell>
                <TableCell>{i.quantity}</TableCell>
                <TableCell>
                  <Badge variant={i.available ? "success" : "secondary"}>
                    {i.available ? "Available" : "Unavailable"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {i._id?.startsWith("mock-") ? null : (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => onEdit(i)}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onToggleAvailability(i)}>
                        {i.available ? "Disable" : "Enable"}
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
