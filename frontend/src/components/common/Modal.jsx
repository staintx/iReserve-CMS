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
          {/* Deep Navy, not the old champagne gold. Gold is decoration-only in
              this system and its contrast on white is too weak to carry a
              heading; navy is the documented colour for structural text that
              needs more weight than slate. Set literally rather than through a
              token because Radix renders this in a body portal, outside the
              shell wrappers that define the theme variables. */}
          <DialogTitle className="text-2xl font-serif text-[#16264A]">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}