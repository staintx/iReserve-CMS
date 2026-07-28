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

const formatAmount = (value) => `PHP ${Number(value || 0).toLocaleString()}`;
const formatId = (value) => (value ? `TXN-${String(value).slice(-6).toUpperCase()}` : "-");
const statusLabel = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "Pending");

export default function AdminPaymentApprovalsTable({ payments, onApprove, onReject, onViewProof }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Transaction</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead className="text-center">Proof</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No payments found.
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => (
              <TableRow key={p._id}>
                <TableCell className="font-medium text-muted-foreground">{formatId(p._id)}</TableCell>
                <TableCell className="font-medium">{p.customer_id?.full_name || "Customer"}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{p.payment_type}</TableCell>
                <TableCell className="font-medium">{formatAmount(p.amount)}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{p.method || "-"}</TableCell>
                <TableCell className="text-center">
                  {p.proof_url || p.checkout_url ? (
                    <Button variant="link" size="sm" onClick={() => onViewProof?.(p)} className="h-auto p-0 text-primary">
                      View
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs italic">None</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={p.status === "approved" ? "success" : p.status === "rejected" ? "destructive" : "secondary"}>
                    {statusLabel(p.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {p.status === "pending" && p.method !== 'paymongo' ? (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => onApprove?.(p)}>
                        Approve
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => onReject?.(p)}>
                        Reject
                      </Button>
                    </div>
                  ) : p.method === 'paymongo' && p.status === 'pending' ? (
                    <span className="text-xs text-muted-foreground">Waiting for customer</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
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
