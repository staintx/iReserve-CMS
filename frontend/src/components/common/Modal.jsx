import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { cn } from "@/lib/utils";

export default function Modal({ title, children, onClose, className = "" }) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={cn("flex flex-col max-w-[calc(100vw-1.5rem)] sm:max-w-xl max-h-[92vh] p-3.5 sm:p-5 overflow-hidden rounded-xl sm:rounded-lg shadow-xl", className)}>
        <DialogHeader className="shrink-0 pb-1 border-b border-border/40 text-left">
          <DialogTitle className="font-sans text-base sm:text-lg font-bold tracking-tight text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden pt-1">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}