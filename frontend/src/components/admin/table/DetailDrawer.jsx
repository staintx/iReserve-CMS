import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../ui/sheet";
import { cn } from "@/lib/utils";

/**
 * Shared read-only record drawer (architecture §04): viewing a record only.
 * Create/edit/confirm/delete stay on Modal/ConfirmDialog — the footer here
 * only hosts buttons that open those, it never edits inline.
 */
export default function DetailDrawer({ open, onOpenChange, title, description, footer, children, className, headerExtra }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("admin-shell admin-layout font-sans text-slate-900 bg-white", className)}>
        <SheetHeader className="px-6 py-4 pr-12 border-b border-slate-100">
          <div className="flex items-center gap-2.5 flex-wrap">
            <SheetTitle className="text-base font-bold text-slate-900 leading-snug">{title}</SheetTitle>
            {headerExtra}
          </div>
          {description && <SheetDescription className="text-xs text-slate-500 mt-0.5">{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto px-6 py-4">{children}</SheetBody>
        {footer && <SheetFooter className="px-6 py-3.5 border-t border-slate-100 bg-white">{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
