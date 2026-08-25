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
          <Badge variant="default" className="bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 inline-flex items-center gap-1 text-[11px] py-0 px-2 rounded-md font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 inline-flex items-center gap-1 text-[11px] py-0 px-2 rounded-md font-semibold">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </Badge>
        );
      case "rejected":
      case "cancelled":
      case "failed":
        return (
          <Badge variant="destructive" className="bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 inline-flex items-center gap-1 text-[11px] py-0 px-2 rounded-md font-semibold">
            <XCircle className="w-3 h-3 text-rose-600" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="outline" className="capitalize text-[11px] py-0 px-2 rounded-md">{status}</Badge>;
    }
  };

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card shadow-2xs">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3.5">Transaction ID / Type</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3.5">Date & Time</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3.5">Payment Method</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground py-2.5 px-3.5">Amount</TableHead>
              <TableHead className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground text-right py-2.5 px-3.5">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                    <CreditCard className="w-6 h-6 text-muted-foreground/40" />
                    <p className="text-xs font-medium">No transaction records found</p>
                    <p className="text-[11px] text-muted-foreground">Payments made for this booking will appear here.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p._id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="font-medium text-foreground py-2.5 px-3.5">
                    <div>
                      <span className="font-semibold text-xs text-foreground capitalize">{p.payment_type || "Payment"}</span>
                      {p.reference_number && (
                        <p className="text-[11px] text-muted-foreground font-mono">{p.reference_number}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs py-2.5 px-3.5">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span>{p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground font-medium text-xs capitalize py-2.5 px-3.5">
                    <span className="inline-flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded text-[11px] font-mono">
                      <CreditCard className="w-3 h-3 text-muted-foreground" />
                      {p.method || p.payment_method || "PayMongo"}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-foreground text-xs tabular-nums py-2.5 px-3.5">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-right py-2.5 px-3.5">
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
