import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { CreditCard, CheckCircle2, Clock, XCircle, Calendar } from "lucide-react";

export default function CustomerPaymentsTable({ payments, formatCurrency }) {
  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300 inline-flex items-center gap-1">
            <Clock className="w-3 h-3" /> Pending
          </Badge>
        );
      case "rejected":
      case "cancelled":
      case "failed":
        return (
          <Badge variant="destructive" className="bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 inline-flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card shadow-xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Transaction ID / Type</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Date & Time</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Payment Method</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Amount</TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CreditCard className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No transaction records found</p>
                    <p className="text-xs text-muted-foreground">Payments made for this booking will appear here.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p._id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium text-foreground">
                    <div>
                      <span className="font-semibold text-foreground capitalize">{p.payment_type || "Payment"}</span>
                      {p.reference_number && (
                        <p className="text-xs text-muted-foreground font-mono">{p.reference_number}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground font-medium text-sm capitalize">
                    <span className="inline-flex items-center gap-1.5 bg-muted/60 px-2 py-0.5 rounded-md text-xs font-mono">
                      <CreditCard className="w-3 h-3 text-muted-foreground" />
                      {p.method || p.payment_method || "PayMongo"}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-foreground text-sm">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {getStatusBadge(p.status)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
