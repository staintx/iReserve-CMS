import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";

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

export default function AdminBookingsCalendarTable({ items }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Event</TableHead>
            <TableHead>Guests</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Venue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No bookings for this date.
              </TableCell>
            </TableRow>
          ) : (
            items.map((booking) => (
              <TableRow key={booking._id}>
                <TableCell className="font-medium capitalize">{booking.event_type}</TableCell>
                <TableCell>{booking.guest_count}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[booking.status] || "secondary"} className="whitespace-nowrap">
                    {STATUS_LABELS[booking.status] || booking.status}
                  </Badge>
                </TableCell>
                <TableCell className="capitalize">{booking.venue_type || "-"}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
