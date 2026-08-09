/**
 * Moves focus to the first field that failed validation so a keyboard or screen
 * reader user lands on the problem instead of hunting for it.
 *
 * @param {Record<string, string>} errors  message keyed by the input's DOM id
 * @param {string[]} order                 ids in visual/tab order
 */
export function focusFirstError(errors, order) {
  const firstInvalid = order.find((id) => errors[id]);
  if (firstInvalid) {
    requestAnimationFrame(() => document.getElementById(firstInvalid)?.focus());
  }
}
