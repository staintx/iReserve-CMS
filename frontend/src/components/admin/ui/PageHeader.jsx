/**
 * The title block at the top of an operational page.
 *
 * All five Manager and Staff pages had hand-rolled the same flex row, and
 * on a phone it was costing roughly a fifth of the first screen before a
 * single booking appeared: a 24px title, a two-line description, and a row
 * of navigation buttons.
 *
 * What changed for mobile:
 *
 * - The title steps down to 18px on a phone and the description to 11.5px
 *   over two lines. Read once, it orients; read on every visit it is
 *   furniture, so it gets furniture's weight.
 * - `actions` are hidden below `sm` by default. Every one of them —
 *   "Staff Roster", "All Assigned Events", "My Dashboard", "My Availability
 *   Calendar" — is a destination the mobile tab bar now carries, and a
 *   duplicated destination costs a row of screen to say nothing new.
 *   Pass `keepActionsOnMobile` for an action that is genuinely not
 *   reachable another way.
 * - `meta` is the slot for status that *is* worth the space on a phone
 *   (a booking's reference and badge), so it stays at every width.
 */
export default function PageHeader({
  title,
  description,
  actions,
  meta,
  keepActionsOnMobile = false,
  back,
}) {
  return (
    <div className="space-y-2">
      {back}
      <div className="flex flex-col gap-2.5 border-b border-border/40 pb-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pb-1">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {meta}
          </div>
          {description && (
            <p className="mt-1 text-[11.5px] sm:text-xs leading-relaxed text-muted-foreground line-clamp-2 sm:line-clamp-none">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div
            className={`items-center gap-2 self-start sm:self-auto sm:flex ${
              keepActionsOnMobile ? "flex flex-wrap" : "hidden"
            }`}
          >
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
