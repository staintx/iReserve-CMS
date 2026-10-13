/**
 * Staff Role Eligibility and Assignment Utility
 * 
 * Centralizes role assignment rules, role eligibility, and dynamic conflict/duplicate
 * filtering for catering events across the Admin Portal.
 */

/**
 * Determines whether a user / staff member is considered an Event Coordinator.
 * 
 * Checks:
 * 1. Account role is 'manager' or 'coordinator'
 * 2. Position text matches or contains 'coordinator', 'event manager', or 'manager'
 * 3. User is designated as the booking's assigned event coordinator (event_manager_id)
 * 
 * @param {Object} person - Staff or user object
 * @param {Object} [booking] - Optional booking object for context
 * @returns {boolean}
 */
export function isEventCoordinator(person, booking = null) {
  if (!person) return false;

  const role = String(person.role || "").toLowerCase().trim();
  const position = String(person.position || "").toLowerCase().trim();
  const personId = String(person._id || person.id || "");
  const bookingManagerId = String(
    booking?.event_manager_id?._id || booking?.event_manager_id || ""
  );

  // 1. Role matches manager / coordinator
  if (role === "manager" || role === "coordinator") {
    return true;
  }

  // 2. Position indicates coordinator / event manager
  if (
    position.includes("coordinator") ||
    position.includes("event manager") ||
    position === "manager"
  ) {
    return true;
  }

  // 3. User is the designated event coordinator for this specific booking
  if (bookingManagerId && personId && bookingManagerId === personId) {
    return true;
  }

  return false;
}

/**
 * Checks whether a given staff member is eligible for a specific event role.
 * 
 * Rules:
 * - "Head Cook" (Kitchen & Culinary Lead):
 *   - Event Coordinators / Managers are strictly prohibited.
 *   - Staff whose roles/positions are non-kitchen (e.g. Server, Setup Crew, Event Stylist, Dishwasher)
 *     cannot be assigned as Head Cook.
 *   - Staff with culinary positions (Head Cook, Cook, Chef, Kitchen Assistant, Buffet Lead)
 *     or general staff with culinary duties are eligible.
 * 
 * - "Server" (Service Staff):
 *   - Event Coordinators are excluded from floor service roles.
 *   - Stylists/decorators are excluded from food service.
 *   - Servers, Buffet Leads, Waitstaff, and general staff assistants are eligible.
 * 
 * - "Setup Crew" (Setup Staff):
 *   - Event Coordinators are excluded from physical setup crew.
 *   - Setup Crew, Stylists, Assistants, and general staff are eligible.
 * 
 * - "Assistant" (Support Staff):
 *   - General assistants, kitchen assistants, dishwashers, runners, and crew.
 *   - If an Event Coordinator is already designated as this booking's event_manager_id,
 *     they cannot occupy a duplicate crew role on the same event.
 * 
 * @param {Object} person - Staff member
 * @param {string} role - Target role ("Head Cook" | "Server" | "Setup Crew" | "Assistant")
 * @param {Object} [booking] - Optional booking context
 * @returns {boolean}
 */
export function isStaffEligibleForRole(person, role, booking = null) {
  if (!person) return false;

  const isCoord = isEventCoordinator(person, booking);

  // An Event Coordinator must NEVER be assigned as Head Cook
  if (role === "Head Cook" && isCoord) {
    return false;
  }

  // If the person is already the assigned Event Coordinator for this event,
  // they cannot occupy any staff crew role for the same event (prevent duplicate roles).
  const personId = String(person._id || person.id || "");
  const bookingManagerId = String(
    booking?.event_manager_id?._id || booking?.event_manager_id || ""
  );
  if (bookingManagerId && personId && bookingManagerId === personId) {
    return false;
  }

  // Event Coordinators / Managers oversee the event; they are not service or setup crew
  if (isCoord && (role === "Server" || role === "Setup Crew" || role === "Assistant")) {
    return false;
  }

  const pos = String(person.position || "").toLowerCase().trim();

  switch (role) {
    case "Head Cook": {
      // Distinct non-culinary positions cannot lead as Head Cook
      const nonCulinaryPositions = [
        "server",
        "waiter",
        "waitress",
        "setup crew",
        "event stylist",
        "stylish",
        "dishwasher",
        "dishwashers",
        "driver"
      ];
      if (nonCulinaryPositions.includes(pos)) {
        return false;
      }

      // Must be a culinary/kitchen role or general staff
      if (
        pos.includes("cook") ||
        pos.includes("chef") ||
        pos.includes("kitchen") ||
        pos.includes("culinary") ||
        pos.includes("buffet") ||
        pos.includes("assistant") ||
        !pos
      ) {
        return true;
      }
      return false;
    }

    case "Server": {
      // Stylists/decorators are dedicated to venue decor/setup, not food service
      const nonServerPositions = ["event stylist", "stylish"];
      if (nonServerPositions.includes(pos)) {
        return false;
      }
      return true;
    }

    case "Setup Crew": {
      // Setup crew, stylists, logistics, and assistants are all eligible
      return true;
    }

    case "Assistant": {
      // General support staff
      return true;
    }

    default:
      return true;
  }
}

/**
 * Filter staff members available for a specific role slot, taking into account
 * role eligibility and staff already assigned to other roles on this event.
 * 
 * @param {Array<Object>} staffList - Full list of staff members
 * @param {Object} options
 * @param {string} options.role - Role for the slot
 * @param {string} [options.currentValue] - ID currently selected in this slot
 * @param {Set<string>|Array<string>} [options.otherAssignedIds] - IDs assigned in other slots
 * @param {Object} [options.booking] - Booking context
 * @returns {Array<Object>} Filtered list of eligible and available staff members
 */
export function getEligibleStaffForSlot(staffList, { role, currentValue = "", otherAssignedIds = new Set(), booking = null }) {
  if (!Array.isArray(staffList)) return [];

  const otherSet = otherAssignedIds instanceof Set ? otherAssignedIds : new Set(otherAssignedIds);
  const currentIdStr = String(currentValue || "");

  return staffList.filter((person) => {
    const personId = String(person._id || person.id || "");

    // If this staff member is currently selected in this specific slot, keep them in options
    if (currentIdStr && personId === currentIdStr) {
      return true;
    }

    // If already assigned to another role in this event, exclude
    if (otherSet.has(personId)) {
      return false;
    }

    // Check role eligibility
    return isStaffEligibleForRole(person, role, booking);
  });
}
