const cron = require('node-cron');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { notifyAdmins, createNotification } = require('../utils/notify');
const { createCheckoutSession } = require('../services/payment.service');
const { sendFinalInvoiceEmail } = require('../utils/booking-emails');

const ACTIVE_UPCOMING_STATUSES = [
    "confirmed",
    "Confirmed",
    "preparing",
    "Ready for Event",
    "ready for event",
    "Deposit Pending",
    "deposit pending",
    "deposit_paid"
];

const startCronJobs = (io) => {
    // Run every day at midnight — 3-day final invoicing + upcoming event notifications
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running daily cron job: Upcoming events notification and final invoicing...');
            const inThreeDaysStart = new Date();
            inThreeDaysStart.setDate(inThreeDaysStart.getDate() + 3);
            inThreeDaysStart.setHours(0, 0, 0, 0);

            const inThreeDaysEnd = new Date(inThreeDaysStart);
            inThreeDaysEnd.setHours(23, 59, 59, 999);

            const upcomingBookings = await Booking.find({
                event_date: { $gte: inThreeDaysStart, $lte: inThreeDaysEnd },
                status: { $in: ACTIVE_UPCOMING_STATUSES }
            }).populate("customer_id");

            let count = 0;
            let invoiceCount = 0;
            for (const booking of upcomingBookings) {
                // Skip if ocular visit is requested/scheduled but not completed with 'proceed'
                if (booking.ocular_visit?.status && (booking.ocular_visit.status !== "completed" || booking.ocular_visit.outcome !== "proceed")) {
                    continue;
                }

                // 1. Notify Admins
                await notifyAdmins({
                    title: "Upcoming Event",
                    body: `An event (${booking.event_type || "Event"}) is coming up in 3 days on ${inThreeDaysStart.toLocaleDateString()}.`,
                    type: "info",
                    link: "/admin/bookings",
                    meta: { booking_id: booking._id }
                }, io);

                // 2. Generate Final Invoice if not fully paid
                if (booking.payment_status !== "fully_paid") {
                    const payments = await Payment.find({ booking_id: booking._id, status: "approved" });
                    const amountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                    const balance = (Number(booking.total_price) || 0) - amountPaid;

                    if (balance > 0) {
                        const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
                        const successUrl = `${appBaseUrl}/customer/payments?status=success`;
                        const cancelUrl = `${appBaseUrl}/customer/payments?status=cancelled`;

                        let payment = await Payment.findOne({
                            booking_id: booking._id,
                            payment_type: "balance",
                            status: "pending",
                            gateway: "paymongo"
                        }).sort({ updatedAt: -1 });

                        if (payment) {
                            payment.amount = balance;
                            payment.customer_id = booking.customer_id?._id || booking.customer_id;
                            await payment.save();
                        } else {
                            payment = await Payment.create({
                                booking_id: booking._id,
                                customer_id: booking.customer_id?._id || booking.customer_id,
                                amount: balance,
                                currency: "PHP",
                                payment_type: "balance",
                                method: "paymongo",
                                status: "pending",
                                gateway: "paymongo"
                            });
                        }

                        const checkout = await createCheckoutSession({
                            amount: balance,
                            currency: "PHP",
                            paymentMethodTypes: ["gcash", "paymaya", "card"],
                            description: `Final Balance for Booking ${booking.reference || booking._id}`,
                            successUrl,
                            cancelUrl,
                            metadata: {
                                local_payment_id: String(payment._id),
                                booking_id: String(booking._id),
                                customer_id: String(booking.customer_id?._id || booking.customer_id),
                                payment_type: "balance"
                            }
                        });

                        const checkoutData = checkout?.data || {};
                        const checkoutAttributes = checkoutData.attributes || {};

                        payment.gateway_checkout_id = checkoutData.id;
                        payment.checkout_url = checkoutAttributes.checkout_url;
                        payment.metadata = checkoutAttributes.metadata || payment.metadata;
                        await payment.save();

                        const customerId = booking.customer_id?._id || booking.customer_id;
                        await createNotification({
                            userId: customerId,
                            title: "Upcoming Event in 3 Days",
                            body: `Your event is in 3 days! As a reminder, your remaining balance of ₱${balance.toFixed(2)} is due the same day after your event has been completed (payable online or in cash to your event manager).`,
                            type: "info",
                            link: payment.checkout_url || "/customer/payments",
                            meta: { payment_id: payment._id, booking_id: booking._id }
                        }, io);

                        // Send final invoice email with note on post-event settlement
                        const customerEmail = booking.contact_email || booking.customer_id?.email;
                        if (customerEmail) {
                            sendFinalInvoiceEmail({
                                booking,
                                balance,
                                checkoutUrl: payment.checkout_url,
                                customerEmail
                            }).catch(() => {});
                        }

                        invoiceCount++;
                    }
                }
                count++;
            }

            console.log(`Sent notifications for ${count} upcoming bookings. Generated ${invoiceCount} final invoices.`);
        } catch (error) {
            console.error('Error in upcoming events cron job:', error);
        }
    });

    // Run every day at 9 AM — Follow-up on completed events with unpaid balances
    cron.schedule('0 9 * * *', async () => {
        try {
            console.log('Running post-event balance follow-up cron...');

            const completedUnpaidBookings = await Booking.find({
                status: { $in: ["completed", "Completed"] },
                payment_status: { $ne: "fully_paid" }
            }).populate("customer_id");

            for (const booking of completedUnpaidBookings) {
                const payments = await Payment.find({ booking_id: booking._id, status: "approved" });
                const amountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const balance = (Number(booking.total_price) || 0) - amountPaid;

                if (balance > 0) {
                    const customerId = booking.customer_id?._id || booking.customer_id;

                    await createNotification({
                        userId: customerId,
                        title: "Balance Settlement Due",
                        body: `Your event has concluded! Please settle your remaining balance of ₱${balance.toFixed(2)} today online via your portal or in cash to your event manager.`,
                        type: "warning",
                        link: `/customer/bookings/${booking._id}`,
                        meta: { booking_id: booking._id, balance }
                    }, io);

                    // If completed more than 1 day ago and still unpaid, inform admins
                    const completedDate = booking.completed_at ? new Date(booking.completed_at) : null;
                    const oneDayAgo = new Date();
                    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

                    if (completedDate && completedDate < oneDayAgo) {
                        await notifyAdmins({
                            title: "Unsettled Balance on Completed Event",
                            body: `Booking ${booking.reference || booking._id} completed on ${completedDate.toLocaleDateString()} still has an unpaid balance of ₱${balance.toFixed(2)}.`,
                            type: "warning",
                            link: `/admin/bookings/${booking._id}/details`,
                            meta: { booking_id: booking._id, balance }
                        }, io);
                    }
                }
            }

            console.log(`Post-event balance follow-up completed for ${completedUnpaidBookings.length} bookings.`);
        } catch (error) {
            console.error('Error in post-event balance follow-up cron:', error);
        }
    });

    // Run every day at 6 AM — Auto-status transitions
    cron.schedule('0 6 * * *', async () => {
        try {
            console.log('Running auto-status transition cron...');

            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setHours(23, 59, 59, 999);

            // Events happening today → ongoing
            const todayResult = await Booking.updateMany(
                { event_date: { $gte: todayStart, $lte: todayEnd }, status: { $in: ACTIVE_UPCOMING_STATUSES } },
                { $set: { status: "ongoing" } }
            );

            if (todayResult.modifiedCount > 0) {
                console.log(`Transitioned ${todayResult.modifiedCount} bookings to 'ongoing'.`);
            }

            // Events from yesterday → completed (guarded against unverified equipment returns)
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            const yesterdayEnd = new Date(yesterdayStart);
            yesterdayEnd.setHours(23, 59, 59, 999);

            const yesterdayCandidates = await Booking.find({
                event_date: { $gte: yesterdayStart, $lte: yesterdayEnd },
                status: { $in: ["ongoing", "Ready for Event", "ready for event", "confirmed", "Confirmed", "preparing"] }
            });

            let completedCount = 0;
            for (const b of yesterdayCandidates) {
                const hasPendingEquipment = (Array.isArray(b.inventory_items) && b.inventory_items.length > 0) &&
                    (!b.equipment_manager_verified?.confirmed &&
                     Array.isArray(b.equipment_returns) &&
                     b.equipment_returns.some(eq => !eq.verified_at));

                if (!hasPendingEquipment) {
                    b.status = "Completed";
                    b.completed_at = new Date();
                    await b.save();
                    completedCount++;
                }
            }

            if (completedCount > 0) {
                console.log(`Transitioned ${completedCount} bookings to 'Completed'.`);
            }
        } catch (error) {
            console.error('Error in auto-status transition cron:', error);
        }
    });

};

module.exports = startCronJobs;
