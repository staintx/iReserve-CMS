import { X } from "lucide-react";

/** Removable chip representing one active advanced filter (design standard §03, rule 4). */
export default function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="p-0.5 rounded-full hover:bg-border text-muted-foreground transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}
