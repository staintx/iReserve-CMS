const cron = require('node-cron');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const { notifyAdmins, createNotification } = require('../utils/notify');
const { createCheckoutSession } = require('../services/payment.service');

const startCronJobs = () => {
    // Run every day at midnight
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
            });

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
                });

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
                            customer_id: booking.customer_id,
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
                            description: `Final Balance for Booking ${booking._id}`,
                            successUrl,
                            cancelUrl,
                            metadata: {
                                local_payment_id: String(payment._id),
                                booking_id: String(booking._id),
                                customer_id: String(booking.customer_id),
                                payment_type: "balance"
                            }
                        });

                        const checkoutData = checkout?.data || {};
                        const checkoutAttributes = checkoutData.attributes || {};

                        payment.gateway_checkout_id = checkoutData.id;
                        payment.checkout_url = checkoutAttributes.checkout_url;
                        payment.metadata = checkoutAttributes.metadata || payment.metadata;
                        await payment.save();

                        // Notify Customer with checkout link (assuming passing null for io works or we ignore real-time push here)
                        // In the previous cron, io wasn't passed. It's fine for it to just save to DB.
                        await createNotification({
                            userId: booking.customer_id,
                            title: "Final Payment Due",
                            body: `Your event is in 3 days! Please pay the remaining balance of ₱${balance.toFixed(2)}.`,
                            type: "warning",
                            link: payment.checkout_url || "/customer/payments",
                            meta: { payment_id: payment._id, booking_id: booking._id }
                        });
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
};

module.exports = startCronJobs;
