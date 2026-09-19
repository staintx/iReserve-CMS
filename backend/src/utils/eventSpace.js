/**
 * The event space a booking is for, as one label.
 *
 * "Event space size" and "scaffold size" are the same thing said two ways: the
 * footprint the customer picked off the package, stored on the request as
 * `scaffold_width` / `scaffold_length` with the chosen option's id beside them.
 * They are resolved to a single string here so nothing downstream can grow two
 * fields for one fact and let them disagree.
 *
 * `frontend/src/lib/packageDisplay.js#eventSpaceLabel` is a line-for-line
 * mirror, used to show the admin the same label live in the Quotation Builder.
 * Change one, change the other.
 */

const dimension = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const scaffoldOptions = (pkg) =>
  Array.isArray(pkg?.scaffold_size_options) ? pkg.scaffold_size_options : [];

/**
 * Read in the order the booking itself decided it: the dimensions stored on the
 * request, because that is what the customer chose and what they were priced
 * on; then the package option those dimensions came from, for a request that
 * saved only the id; then the option's own free-text label.
 *
 * Returns "" when the booking has no event space at all — a combo pack sells
 * food, and food has no footprint — which is the signal to show nothing rather
 * than an empty row.
 */
function eventSpaceLabel(request, pkg) {
  if (!request) return "";

  // If already formatted label exists on request/snapshot
  if (request.event_space_label && typeof request.event_space_label === "string" && request.event_space_label.trim()) {
    const lbl = request.event_space_label.trim();
    const match = lbl.match(/(\d+)\s*(?:ft)?\s*[xX×]\s*(\d+)\s*(?:ft)?/i);
    if (match) return `${match[1]}×${match[2]}`;
    return lbl;
  }

  const resolvedPkg = (pkg && typeof pkg === "object")
    ? pkg
    : (request.package_id && typeof request.package_id === "object" ? request.package_id : null);

  const options = scaffoldOptions(resolvedPkg);

  let option = null;
  if (request.selected_scaffold_option_id) {
    option = options.find(
      (entry, idx) =>
        String(entry?._id) === String(request.selected_scaffold_option_id) ||
        String(entry?.id) === String(request.selected_scaffold_option_id) ||
        String(idx) === String(request.selected_scaffold_option_id)
    );
  }

  if (!option && request.scaffold_width && request.scaffold_length) {
    option = options.find(
      (entry) =>
        Number(entry.width_ft) === Number(request.scaffold_width) &&
        Number(entry.length_ft) === Number(request.scaffold_length)
    );
  }

  if (!option && resolvedPkg?.default_scaffold_option_id != null) {
    option = options.find(
      (entry, idx) =>
        String(entry?._id) === String(resolvedPkg.default_scaffold_option_id) ||
        String(idx) === String(resolvedPkg.default_scaffold_option_id)
    );
  }

  if (!option && options.length > 0) {
    const guests = Number(request.guest_count);
    if (guests > 0) {
      const guestMatched = options.find(
        (entry) =>
          Number(entry.guest_min) <= guests &&
          (!entry.guest_max || Number(entry.guest_max) >= guests)
      );
      if (guestMatched) option = guestMatched;
    }
    if (!option) option = options[0];
  }

  const width = dimension(request.scaffold_width) ?? dimension(option?.width_ft);
  const length = dimension(request.scaffold_length) ?? dimension(option?.length_ft);
  if (width && length) return `${width}×${length}`;

  const label = String(option?.label || "").trim();
  if (label) {
    const match = label.match(/(\d+)\s*(?:ft)?\s*[xX×]\s*(\d+)\s*(?:ft)?/i);
    if (match) return `${match[1]}×${match[2]}`;
    return label;
  }

  const area = dimension(request.scaffold_base_area) ?? dimension(option?.area_ft2);
  return area ? `${area} sq ft` : "";
}

module.exports = { eventSpaceLabel };

