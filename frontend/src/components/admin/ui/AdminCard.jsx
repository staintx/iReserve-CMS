/**
 * The surface every operational panel sits on.
 *
 * `as` exists so a card can *be* the interactive element rather than wrap
 * one. A tappable KPI tile needs its whole surface to be the hit area, and
 * stretching a nested button across a div with an overlay gives the same
 * pixels while losing the semantics a keyboard and a screen reader need.
 */
export default function AdminCard({ as = "div", children, className = "", ...props }) {
  const Tag = as;
  return (
    <Tag className={`bg-card rounded-md border border-border/80 shadow-2xs p-4 sm:p-4.5 transition-all ${className}`} {...props}>
      {children}
    </Tag>
  );
}
