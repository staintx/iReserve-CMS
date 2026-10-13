const Inventory = require("../models/Inventory");
const InventoryReservation = require("../models/InventoryReservation");
const writeInventoryLog = require("./writeInventoryLog");

/**
 * Idempotently reconciles equipment turnover for a booking:
 * - Releases/updates InventoryReservation records for returned/accounted equipment.
 * - Deducts damaged & missing quantities from active Inventory.quantity.
 * - Tracks Inventory.damaged_quantity and Inventory.missing_quantity.
 * - Updates booking.equipment_returns with quantity_returned, quantity_damaged,
 *   quantity_missing, and reconciled_* tracking fields.
 * - Idempotent: repeated calls with unchanged counts produce zero net delta.
 *
 * @param {Object} params
 * @param {Object} params.booking - Mongoose Booking document
 * @param {Array}  [params.returns] - Array of return items: { inventory_id, quantity_returned, quantity_damaged, quantity_missing, notes }
 * @param {boolean} [params.markClean=false] - If true, mark all items 100% returned in good condition
 * @param {string|ObjectId} params.actorId - User performing action
 * @param {string} [params.notes=""] - General inspection/turnover notes
 * @param {boolean} [params.isManagerVerification=false] - Whether this is manager/admin verification
 * @returns {Promise<{ booking: Object, summary: Array }>}
 */
async function reconcileEquipmentTurnover({
  booking,
  returns,
  markClean = false,
  actorId,
  notes = "",
  isManagerVerification = false,
}) {
  const currentReturns = Array.isArray(booking.equipment_returns) ? [...booking.equipment_returns] : [];
  const inventoryItems = Array.isArray(booking.inventory_items) ? booking.inventory_items : [];

  // Ensure each assigned inventory item has a record in currentReturns
  inventoryItems.forEach((item) => {
    if (!item.inventory_id) return;
    const invIdStr = String(item.inventory_id._id || item.inventory_id);
    const existing = currentReturns.find(
      (r) => String(r.inventory_id?._id || r.inventory_id) === invIdStr
    );
    if (!existing) {
      currentReturns.push({
        inventory_id: item.inventory_id,
        name: item.name || "Equipment Item",
        quantity_booked: Number(item.quantity || 1),
        quantity_returned: 0,
        quantity_damaged: 0,
        quantity_missing: 0,
        reconciled_returned: 0,
        reconciled_damaged: 0,
        reconciled_missing: 0,
        notes: "",
      });
    }
  });

  // Ensure checklist items (package inclusions) also have a record in currentReturns
  const checklistItems = Array.isArray(booking.equipment_checklist) ? booking.equipment_checklist : [];
  checklistItems.forEach((item) => {
    if (!item.name) return;
    const cleanName = item.name.trim().toLowerCase();
    const existing = currentReturns.find(
      (r) => (r.name && r.name.trim().toLowerCase() === cleanName) ||
             (r._id && item._id && String(r._id) === String(item._id))
    );
    if (!existing) {
      const bookedQty = Number(item.quantity || 1);
      currentReturns.push({
        name: item.name,
        quantity_booked: bookedQty,
        quantity_returned: item.status === "inspected_ok" || item.status === "complete" ? bookedQty : 0,
        quantity_damaged: item.issue_type === "damaged" ? bookedQty : 0,
        quantity_missing: item.issue_type === "missing" ? bookedQty : 0,
        reconciled_returned: 0,
        reconciled_damaged: 0,
        reconciled_missing: 0,
        notes: item.notes || "",
        verification_status: item.status === "inspected_ok" || item.status === "complete" ? "verified_ok" : ((item.status === "incomplete" || item.status === "issue_reported") ? "issue_recorded" : "pending"),
        issue_category: item.issue_type === "damaged" ? "damaged" : (item.issue_type === "missing" ? "missing" : ""),
        verified_at: item.completed_at || null,
        verified_by: item.completed_by || null,
      });
    }
  });

  const summary = [];

  for (let i = 0; i < currentReturns.length; i++) {
    const record = currentReturns[i];
    const invId = record.inventory_id?._id || record.inventory_id;
    const invIdStr = invId ? String(invId) : null;

    const bookedItem = invIdStr ? inventoryItems.find(
      (it) => String(it.inventory_id?._id || it.inventory_id) === invIdStr
    ) : null;
    const bookedQty = Number(record.quantity_booked || bookedItem?.quantity || 1);

    let newReturned, newDamaged, newMissing, itemNotes;

    if (markClean) {
      newReturned = bookedQty;
      newDamaged = 0;
      newMissing = 0;
      itemNotes = notes || "Returned in good condition";
    } else if (Array.isArray(returns)) {
      const match = returns.find(
        (r) =>
          (invIdStr && String(r.inventory_id?._id || r.inventory_id) === invIdStr) ||
          (r._id && record._id && String(r._id) === String(record._id)) ||
          (r.name && record.name && r.name.trim().toLowerCase() === record.name.trim().toLowerCase())
      );
      if (match) {
        var itemStatus = match.verification_status || (match.notes ? "issue_recorded" : (match.verified_at ? "verified_ok" : "pending"));
        var itemCategory = match.issue_category || "";
        itemNotes = match.notes !== undefined ? match.notes : (record.notes || "");

        if (itemStatus === "pending") {
          newReturned = 0;
          newDamaged = 0;
          newMissing = 0;
          itemNotes = "";
          itemCategory = "";
        } else if (itemStatus === "verified_ok") {
          newReturned = bookedQty;
          newDamaged = 0;
          newMissing = 0;
        } else if (itemStatus === "issue_recorded") {
          if (match.quantity_damaged !== undefined || match.quantity_missing !== undefined) {
            newDamaged = Math.max(0, Number(match.quantity_damaged || 0));
            newMissing = Math.max(0, Number(match.quantity_missing || 0));
            newReturned = Math.max(0, bookedQty - (newDamaged + newMissing));
          } else {
            newReturned = bookedQty;
            newDamaged = 0;
            newMissing = 0;
          }
        } else {
          newReturned = Math.max(0, Number(match.quantity_returned !== undefined ? match.quantity_returned : (record.quantity_returned || 0)));
          newDamaged = Math.max(0, Number(match.quantity_damaged !== undefined ? match.quantity_damaged : (record.quantity_damaged || 0)));
          newMissing = match.quantity_missing !== undefined
            ? Math.max(0, Number(match.quantity_missing))
            : Math.max(0, bookedQty - (newReturned + newDamaged));
        }
      } else {
        newReturned = Number(record.quantity_returned || 0);
        newDamaged = Number(record.quantity_damaged || 0);
        newMissing = record.quantity_missing !== undefined
          ? Number(record.quantity_missing)
          : Math.max(0, bookedQty - (newReturned + newDamaged));
        itemNotes = record.notes || "";
        var itemStatus = record.verification_status || (itemNotes ? "issue_recorded" : "pending");
        var itemCategory = record.issue_category || "";
      }
    } else {
      newReturned = Number(record.quantity_returned || 0);
      newDamaged = Number(record.quantity_damaged || 0);
      newMissing = record.quantity_missing !== undefined
        ? Number(record.quantity_missing)
        : Math.max(0, bookedQty - (newReturned + newDamaged));
      itemNotes = record.notes || "";
      var itemStatus = record.verification_status || (itemNotes ? "issue_recorded" : "pending");
      var itemCategory = record.issue_category || "";
    }

    if (itemStatus !== "pending") {
      // Sanity check: sum cannot exceed bookedQty
      if (newReturned + newDamaged > bookedQty) {
        newReturned = Math.max(0, bookedQty - newDamaged);
      }
      newMissing = Math.max(0, bookedQty - (newReturned + newDamaged));
    } else {
      newReturned = 0;
      newDamaged = 0;
      newMissing = 0;
    }

    // Persisted previous reconciled state
    const prevReconciledReturned = Number(record.reconciled_returned || 0);
    const prevReconciledDamaged = Number(record.reconciled_damaged || 0);
    const prevReconciledMissing = Number(record.reconciled_missing || 0);

    const deltaReturned = newReturned - prevReconciledReturned;
    const deltaDamaged = newDamaged - prevReconciledDamaged;
    const deltaMissing = newMissing - prevReconciledMissing;

    const prevAccounted = prevReconciledReturned + prevReconciledDamaged + prevReconciledMissing;
    const newAccounted = newReturned + newDamaged + newMissing;
    const deltaReservationRelease = newAccounted - prevAccounted;

    // 1. Reconcile InventoryReservation (Only if linked to warehouse inventory)
    if (invId && deltaReservationRelease !== 0) {
      const reservations = await InventoryReservation.find({
        booking_id: booking._id,
        inventory_id: invId,
      });

      if (deltaReservationRelease > 0) {
        let remainingToRelease = deltaReservationRelease;
        for (const res of reservations) {
          if (remainingToRelease <= 0) break;
          if (res.quantity <= remainingToRelease) {
            remainingToRelease -= res.quantity;
            await InventoryReservation.deleteOne({ _id: res._id });
          } else {
            res.quantity -= remainingToRelease;
            remainingToRelease = 0;
            await res.save();
          }
        }
        await writeInventoryLog({
          inventory_id: invId,
          event_type: "reservation_released",
          delta: deltaReservationRelease,
          actor_id: actorId,
          booking_id: booking._id,
          reason: `Equipment accounted for booking #${booking.reference || booking._id} (${newReturned} returned, ${newDamaged} damaged, ${newMissing} missing)`,
        });
      } else {
        const needToAdd = Math.abs(deltaReservationRelease);
        if (reservations.length > 0) {
          reservations[0].quantity += needToAdd;
          await reservations[0].save();
        } else {
          await InventoryReservation.create({
            inventory_id: invId,
            booking_id: booking._id,
            event_date: booking.event_date || new Date(),
            quantity: needToAdd,
          });
        }
        await writeInventoryLog({
          inventory_id: invId,
          event_type: "reservation_allocated",
          delta: -needToAdd,
          actor_id: actorId,
          booking_id: booking._id,
          reason: `Turnover correction for booking #${booking.reference || booking._id}`,
        });
      }
    }

    // 2. Reconcile Inventory physical counts (Only if linked to warehouse inventory)
    if (invId && (deltaDamaged !== 0 || deltaMissing !== 0)) {
      const invItem = await Inventory.findById(invId);
      if (invItem) {
        if (deltaDamaged !== 0) {
          invItem.quantity = Math.max(0, (invItem.quantity || 0) - deltaDamaged);
          invItem.damaged_quantity = Math.max(0, (invItem.damaged_quantity || 0) + deltaDamaged);

          if (deltaDamaged > 0) {
            await writeInventoryLog({
              inventory_id: invId,
              event_type: "damage_loss",
              delta: -deltaDamaged,
              actor_id: actorId,
              booking_id: booking._id,
              reason: `Equipment damage logged (${deltaDamaged} units): ${itemNotes || "Damaged during event"}`,
            });
          } else {
            await writeInventoryLog({
              inventory_id: invId,
              event_type: "adjustment",
              delta: Math.abs(deltaDamaged),
              actor_id: actorId,
              booking_id: booking._id,
              reason: `Equipment damage corrected (-${Math.abs(deltaDamaged)} damaged)`,
            });
          }
        }

        if (deltaMissing !== 0) {
          invItem.quantity = Math.max(0, (invItem.quantity || 0) - deltaMissing);
          invItem.missing_quantity = Math.max(0, (invItem.missing_quantity || 0) + deltaMissing);

          if (deltaMissing > 0) {
            await writeInventoryLog({
              inventory_id: invId,
              event_type: "damage_loss",
              delta: -deltaMissing,
              actor_id: actorId,
              booking_id: booking._id,
              reason: `Equipment missing logged (${deltaMissing} units): ${itemNotes || "Missing after event"}`,
            });
          } else {
            await writeInventoryLog({
              inventory_id: invId,
              event_type: "adjustment",
              delta: Math.abs(deltaMissing),
              actor_id: actorId,
              booking_id: booking._id,
              reason: `Missing equipment recovered (+${Math.abs(deltaMissing)} found)`,
            });
          }
        }

        await invItem.save();
      }
    }

    // 3. Update record values on booking.equipment_returns
    record.quantity_returned = newReturned;
    record.quantity_damaged = newDamaged;
    record.quantity_missing = newMissing;
    record.reconciled_returned = newReturned;
    record.reconciled_damaged = newDamaged;
    record.reconciled_missing = newMissing;
    record.notes = itemNotes;
    if (typeof itemStatus !== "undefined") record.verification_status = itemStatus;
    if (typeof itemCategory !== "undefined") record.issue_category = itemCategory;
    record.verified_at = itemStatus === "pending" ? null : new Date();
    record.verified_by = itemStatus === "pending" ? null : actorId;

    summary.push({
      inventory_id: invIdStr || (record._id ? String(record._id) : `eq_${i}`),
      name: record.name,
      booked: bookedQty,
      newReturned,
      newDamaged,
      newMissing,
      deltaReturned,
      deltaDamaged,
      deltaMissing,
      deltaReservationRelease,
    });
  }

  booking.equipment_returns = currentReturns;

  if (isManagerVerification) {
    booking.equipment_manager_verified = {
      confirmed: true,
      confirmed_by: actorId,
      confirmed_at: new Date(),
      additional_notes: notes || "Equipment return inspection completed.",
    };
  }

  return { booking, summary };
}

module.exports = { reconcileEquipmentTurnover };
