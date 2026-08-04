const cron = require('node-cron');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { notifyAdmins, createNotification } = require('../utils/notify');
const { createCheckoutSession } = require('../services/payment.service');
const { sendFinalInvoiceEmail, sendAutoCancelEmail } = require('../utils/booking-emails');

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
                status: { $in: ["confirmed", "preparing"] }
            }).populate("customer_id");

            let count = 0;
            let invoiceCount = 0;
            for (const booking of upcomingBookings) {
                // 1. Notify Admins
                await notifyAdmins({
                    title: "Upcoming Event",
                    body: `An event is coming up in 3 days on ${inThreeDaysStart.toLocaleDateString()}.`,
                    type: "info",
                    link: "/admin/bookings",
                    meta: { booking_id: booking._id }
                }, io);

                // 2. Generate Final Invoice if not fully paid
                if (booking.payment_status !== "fully_paid") {
                    const payments = await Payment.find({ booking_id: booking._id, status: "approved" });
                    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                    const balance = booking.total_price - amountPaid;

                    if (balance > 0) {
                        const appBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
                        const successUrl = `${appBaseUrl}/customer/payments?status=success`;
                        const cancelUrl = `${appBaseUrl}/customer/payments?status=cancelled`;

                        const payment = await Payment.create({
                            booking_id: booking._id,
                            customer_id: booking.customer_id?._id || booking.customer_id,
                            amount: balance,
                            currency: "PHP",
                            payment_type: "balance",
                            method: "paymongo",
                            status: "pending",
                            gateway: "paymongo"
                        });

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
                            title: "Final Payment Due",
                            body: `Your event is in 3 days! Please pay the remaining balance of ₱${balance.toFixed(2)}.`,
                            type: "warning",
                            link: payment.checkout_url || "/customer/payments",
                            meta: { payment_id: payment._id, booking_id: booking._id }
                        }, io);

                        // Send final invoice email
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

    // Run every day at 9 AM — Payment follow-up reminders (2 days and 1 day before)
    cron.schedule('0 9 * * *', async () => {
        try {
            console.log('Running payment follow-up reminder cron...');

            for (const daysOut of [2, 1]) {
                const targetStart = new Date();
                targetStart.setDate(targetStart.getDate() + daysOut);
                targetStart.setHours(0, 0, 0, 0);
                const targetEnd = new Date(targetStart);
                targetEnd.setHours(23, 59, 59, 999);

                const unpaidBookings = await Booking.find({
                    event_date: { $gte: targetStart, $lte: targetEnd },
                    status: { $in: ["confirmed", "preparing"] },
                    payment_status: { $ne: "fully_paid" }
                }).populate("customer_id");

                for (const booking of unpaidBookings) {
                    const payments = await Payment.find({ booking_id: booking._id, status: "approved" });
                    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
                    const balance = booking.total_price - amountPaid;

                    if (balance > 0) {
                        const customerId = booking.customer_id?._id || booking.customer_id;
                        const urgency = daysOut === 1 ? "URGENT" : "Reminder";

                        await createNotification({
                            userId: customerId,
                            title: `${urgency}: Payment Due`,
                            body: `Your event is in ${daysOut} day${daysOut > 1 ? "s" : ""}! Remaining balance: ₱${balance.toFixed(2)}.`,
                            type: daysOut === 1 ? "error" : "warning",
                            link: "/customer/payments",
                            meta: { booking_id: booking._id, reminder_days: daysOut }
                        }, io);

                        if (daysOut === 1) {
                            await notifyAdmins({
                                title: "Unpaid Balance — Event Tomorrow",
                                body: `Booking ${booking.reference || booking._id} has an unpaid balance of ₱${balance.toFixed(2)} and the event is tomorrow.`,
                                type: "error",
                                link: `/admin/bookings/${booking._id}/details`,
                                meta: { booking_id: booking._id }
                            }, io);
                        }
                    }
                }
            }

            console.log('Payment follow-up reminders completed.');
        } catch (error) {
            console.error('Error in payment follow-up cron:', error);
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
            const todayBookings = await Booking.find({
                event_date: { $gte: todayStart, $lte: todayEnd },
                status: { $in: ["confirmed", "preparing"] }
            });

            for (const booking of todayBookings) {
                booking.status = "ongoing";
                await booking.save();
            }

            if (todayBookings.length > 0) {
                console.log(`Transitioned ${todayBookings.length} bookings to 'ongoing'.`);
            }

            // Events from yesterday → completed
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            const yesterdayEnd = new Date(yesterdayStart);
            yesterdayEnd.setHours(23, 59, 59, 999);

            const yesterdayBookings = await Booking.find({
                event_date: { $gte: yesterdayStart, $lte: yesterdayEnd },
                status: "ongoing"
            });

            for (const booking of yesterdayBookings) {
                booking.status = "completed";
                booking.completed_at = new Date();
                await booking.save();
            }

            if (yesterdayBookings.length > 0) {
                console.log(`Transitioned ${yesterdayBookings.length} bookings to 'completed'.`);
            }
        } catch (error) {
            console.error('Error in auto-status transition cron:', error);
        }
    });

    // Run every hour — 48-hour auto-cancel for unpaid deposits
    cron.schedule('0 * * * *', async () => {
        try {
            console.log('Running 48-hour auto-cancel cron...');

            const fortyEightHoursAgo = new Date();
            fortyEightHoursAgo.setHours(fortyEightHoursAgo.getHours() - 48);

            const pendingBookings = await Booking.find({
                status: "pending deposit",
                createdAt: { $lte: fortyEightHoursAgo }
            }).populate("customer_id");

            for (const booking of pendingBookings) {
                booking.status = "cancelled";
                await booking.save();

                // Send email
                const customerEmail = booking.contact_email || booking.customer_id?.email;
                if (customerEmail) {
                    sendAutoCancelEmail({ booking, customerEmail }).catch(() => {});
                }

                const customerId = booking.customer_id?._id || booking.customer_id;
                if (customerId) {
                    await createNotification({
                        userId: customerId,
                        title: "Booking Auto-Cancelled",
                        body: `Your booking ${booking.reference || booking._id} was cancelled due to non-payment of deposit within 48 hours.`,
                        type: "error",
                        link: "/customer/bookings",
                        meta: { booking_id: booking._id }
                    }, io);
                }
            }

            if (pendingBookings.length > 0) {
                console.log(`Auto-cancelled ${pendingBookings.length} bookings due to 48-hour non-payment rule.`);
            }
        } catch (error) {
            console.error('Error in auto-cancel cron:', error);
        }
    });
};

module.exports = startCronJobs;
