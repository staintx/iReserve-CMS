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

  const summary = [];

  for (let i = 0; i < currentReturns.length; i++) {
    const record = currentReturns[i];
    const invId = record.inventory_id?._id || record.inventory_id;
    if (!invId) continue;
    const invIdStr = String(invId);

    const bookedItem = inventoryItems.find(
      (it) => String(it.inventory_id?._id || it.inventory_id) === invIdStr
    );
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
          String(r.inventory_id?._id || r.inventory_id) === invIdStr ||
          (r._id && String(r._id) === String(record._id))
      );
      if (match) {
        newReturned = Math.max(0, Number(match.quantity_returned !== undefined ? match.quantity_returned : (record.quantity_returned || 0)));
        newDamaged = Math.max(0, Number(match.quantity_damaged !== undefined ? match.quantity_damaged : (record.quantity_damaged || 0)));
        if (match.quantity_missing !== undefined) {
          newMissing = Math.max(0, Number(match.quantity_missing));
        } else {
          newMissing = Math.max(0, bookedQty - (newReturned + newDamaged));
        }
        itemNotes = match.notes !== undefined ? match.notes : (record.notes || "");
      } else {
        newReturned = Number(record.quantity_returned || 0);
        newDamaged = Number(record.quantity_damaged || 0);
        newMissing = record.quantity_missing !== undefined
          ? Number(record.quantity_missing)
          : Math.max(0, bookedQty - (newReturned + newDamaged));
        itemNotes = record.notes || "";
      }
    } else {
      newReturned = Number(record.quantity_returned || 0);
      newDamaged = Number(record.quantity_damaged || 0);
      newMissing = record.quantity_missing !== undefined
        ? Number(record.quantity_missing)
        : Math.max(0, bookedQty - (newReturned + newDamaged));
      itemNotes = record.notes || "";
    }

    // Sanity check: sum cannot exceed bookedQty
    if (newReturned + newDamaged > bookedQty) {
      newReturned = Math.max(0, bookedQty - newDamaged);
    }
    newMissing = Math.max(0, bookedQty - (newReturned + newDamaged));

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

    // 1. Reconcile InventoryReservation
    if (deltaReservationRelease !== 0) {
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

    // 2. Reconcile Inventory physical counts (Damaged and Missing)
    if (deltaDamaged !== 0 || deltaMissing !== 0) {
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
    record.verified_at = new Date();
    record.verified_by = actorId;

    summary.push({
      inventory_id: invIdStr,
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
