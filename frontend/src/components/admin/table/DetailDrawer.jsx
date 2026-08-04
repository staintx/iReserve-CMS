import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../../ui/sheet";

/**
 * Shared read-only record drawer (architecture §04): viewing a record only.
 * Create/edit/confirm/delete stay on Modal/ConfirmDialog — the footer here
 * only hosts buttons that open those, it never edits inline.
 */
export default function DetailDrawer({ open, onOpenChange, title, description, footer, children }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody>{children}</SheetBody>
        {footer && <SheetFooter>{footer}</SheetFooter>}
      </SheetContent>
    </Sheet>
  );
}
