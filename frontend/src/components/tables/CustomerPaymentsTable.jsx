import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";

export default function CustomerPaymentsTable({ payments, formatCurrency }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200">Approved</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">Pending</Badge>;
      case "rejected":
      case "cancelled":
      case "failed":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-200">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Event</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                No payment transactions yet.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => (
              <TableRow key={p._id} className="hover:bg-muted/50 transition-colors">
                <TableCell className="font-medium text-foreground">{p.booking_id?.event_type || "Event"}</TableCell>
                <TableCell className="text-muted-foreground">{p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{p.payment_type || "Payment"}</TableCell>
                <TableCell className="text-muted-foreground">{p.method || "-"}</TableCell>
                <TableCell className="font-bold text-foreground">{formatCurrency(p.amount)}</TableCell>
                <TableCell>{getStatusBadge(p.status)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
