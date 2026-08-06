import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export default function Modal({ title, children, onClose, className = "" }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`flex flex-col ${className}`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-2xl font-serif text-[#D4AF37]">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}