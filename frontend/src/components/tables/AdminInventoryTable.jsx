import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";

export default function AdminInventoryTable({ items = [], onEdit, onToggleAvailability }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Item Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-center">Total Quantity</TableHead>
            <TableHead className="text-center">Stock on Hand</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No inventory items found.
              </TableCell>
            </TableRow>
          ) : (
            items.map((i) => {
              const isAvailable = i.available !== false;
              const stockOnHand = i.available_quantity ?? Math.max(0, (i.quantity || 0) - (i.reserved_quantity || 0));
              return (
                <TableRow key={i._id}>
                  <TableCell className="font-medium">{i.item_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{i.category || "General"}</TableCell>
                  <TableCell className="text-center font-semibold">{i.quantity || 0}</TableCell>
                  <TableCell className="text-center font-semibold text-emerald-600">
                    {isAvailable ? stockOnHand : 0}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isAvailable}
                        onClick={() => onToggleAvailability && onToggleAvailability(i)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          isAvailable ? "bg-emerald-600" : "bg-slate-300"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                            isAvailable ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-semibold ${isAvailable ? "text-emerald-700" : "text-slate-500"}`}>
                        {isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {i._id?.startsWith("mock-") ? null : (
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit && onEdit(i)}>
                          Edit
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
