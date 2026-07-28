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

const statusVariant = (status) => {
  if (!status || status === "new") return "secondary";
  if (status === "under review" || status === "negotiating") return "info";
  if (status === "awaiting confirmation") return "warning";
  if (status === "confirmed") return "success";
  if (["declined", "abandoned", "expired", "spam", "cancelled"].includes(status)) return "destructive";
  return "secondary";
};

const statusLabel = (status) => {
  if (!status || status === "new") return "New";
  if (status === "under review") return "Under Review";
  if (status === "awaiting confirmation") return "Awaiting Confirmation";
  if (status === "negotiating") return "Negotiating";
  if (status === "confirmed") return "Confirmed";
  if (status === "declined") return "Declined";
  if (status === "abandoned") return "Abandoned";
  if (status === "expired") return "Expired";
  if (status === "spam") return "Spam";
  if (status === "cancelled") return "Cancelled";
  return status;
};

export default function AdminInquiriesTable({ inquiries, onReview }) {
  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Inquiry ID</TableHead>
            <TableHead>Client Name</TableHead>
            <TableHead>Event Type</TableHead>
            <TableHead>Selected Package</TableHead>
            <TableHead>Event Date</TableHead>
            <TableHead>Request Type</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inquiries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                No inquiries found.
              </TableCell>
            </TableRow>
          ) : (
            inquiries.map((inq) => (
              <TableRow key={inq._id}>
                <TableCell className="font-medium text-muted-foreground">{inq._id?.slice(-6).toUpperCase() || "-"}</TableCell>
                <TableCell className="font-medium">
                  {inq.contact_first_name ? `${inq.contact_first_name} ${inq.contact_last_name || ""}` : (inq.customer_id?.full_name || "Customer")}
                </TableCell>
                <TableCell className="capitalize">{inq.event_type || "-"}</TableCell>
                <TableCell>{inq.package_id?.name || "Custom"}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(inq.event_date)}</TableCell>
                <TableCell className="text-muted-foreground">{inq.service_type || (inq.include_food ? "Food & Event" : "Event Setup")}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={statusVariant(inq.status)} className="whitespace-nowrap">
                    {statusLabel(inq.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onReview(inq)}>
                    Review
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
