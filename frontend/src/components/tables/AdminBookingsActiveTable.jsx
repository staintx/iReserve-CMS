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

const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

const STATUS_LABELS = {
  "pending deposit": "Pending Deposit",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ongoing: "Ongoing",
  completed: "Completed",
  cancelled: "Cancelled"
};

const STATUS_VARIANT = {
  "pending deposit": "warning",
  confirmed: "success",
  preparing: "info",
  ongoing: "default",
  completed: "success",
  cancelled: "destructive"
};

export default function AdminBookingsActiveTable({ bookings, onMarkDone, onCancel, onView }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Event</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-center">Guests</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bookings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No active bookings found.
              </TableCell>
            </TableRow>
          ) : (
            bookings.map((b) => (
              <TableRow key={b._id}>
                <TableCell className="font-medium capitalize">{b.event_type}</TableCell>
                <TableCell>{b.customer_id?.full_name || "Customer"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(b.event_date)}</TableCell>
                <TableCell className="text-center">{b.guest_count}</TableCell>
                <TableCell>
                  <div className="text-xs space-y-1">
                    <div className="font-medium text-foreground">Total: ₱{(Number(b.total_price) || 0).toLocaleString()}</div>
                    <div className="text-emerald-600 font-medium">Paid: ₱{(Number(b.totalPaid) || 0).toLocaleString()}</div>
                    <div className={b.balanceDue > 0 ? "text-destructive font-semibold" : "text-emerald-600 font-medium"}>
                      Bal: ₱{(Number(b.balanceDue) || 0).toLocaleString()}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={STATUS_VARIANT[b.status] || "secondary"} className="whitespace-nowrap">
                    {STATUS_LABELS[b.status] || b.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onView?.(b)}>View</Button>
                    <Button size="sm" onClick={() => onMarkDone?.(b)}>Mark Done</Button>
                    <Button variant="destructive" size="sm" onClick={() => onCancel?.(b)}>Cancel</Button>
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
