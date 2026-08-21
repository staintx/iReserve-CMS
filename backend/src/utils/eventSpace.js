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
  const option = scaffoldOptions(pkg).find(
    (entry) => String(entry?._id) === String(request?.selected_scaffold_option_id)
  );

  const width = dimension(request?.scaffold_width) ?? dimension(option?.width_ft);
  const length = dimension(request?.scaffold_length) ?? dimension(option?.length_ft);
  if (width && length) return `${width}ft × ${length}ft`;

  const label = String(option?.label || "").trim();
  if (label) return label;

  // Some requests recorded only the area. It is still the same one fact, so it
  // is stated rather than dropped.
  const area = dimension(request?.scaffold_base_area) ?? dimension(option?.area_ft2);
  return area ? `${area} sq ft` : "";
}

module.exports = { eventSpaceLabel };
