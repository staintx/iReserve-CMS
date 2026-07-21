const cron = require('node-cron');
const Inquiry = require('../models/Inquiry');
const Booking = require('../models/Booking');
const { notifyAdmins } = require('../utils/notify');

const startCronJobs = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        try {
            console.log('Running daily cron job: Auto-expiring old inquiries...');
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Find inquiries that haven't been updated in 30 days and are in a non-terminal status
            const nonTerminalStatuses = ["new", "under review", "awaiting confirmation", "negotiating"];

            const result = await Inquiry.updateMany(
                {
                    updatedAt: { $lte: thirtyDaysAgo },
                    status: { $in: nonTerminalStatuses }
                },
                {
                    $set: { status: "expired" }
                }
            );

            console.log(`Expired ${result.modifiedCount} old inquiries.`);
        } catch (error) {
            console.error('Error in daily cron job:', error);
        }

        try {
            console.log('Running daily cron job: Upcoming events notification...');
            const inThreeDaysStart = new Date();
            inThreeDaysStart.setDate(inThreeDaysStart.getDate() + 3);
            inThreeDaysStart.setHours(0, 0, 0, 0);

            const inThreeDaysEnd = new Date(inThreeDaysStart);
            inThreeDaysEnd.setHours(23, 59, 59, 999);

            const upcomingBookings = await Booking.find({
                event_date: { $gte: inThreeDaysStart, $lte: inThreeDaysEnd },
                status: { $in: ["confirmed", "preparing"] }
            });

            // Note: io is not available in cron, but we can save notifications to DB.
            // When admins login, they will fetch these notifications via API.
            // If we really need real-time, we would need to pass io to startCronJobs.
            // But since this runs at midnight, real-time push is less critical.
            let count = 0;
            for (const booking of upcomingBookings) {
                await notifyAdmins({
                    title: "Upcoming Event",
                    body: `An event is coming up in 3 days on ${inThreeDaysStart.toLocaleDateString()}.`,
                    type: "info",
                    link: "/admin/bookings",
                    meta: { booking_id: booking._id }
                }); // io is undefined here, which is fine.
                count++;
            }

            console.log(`Sent notifications for ${count} upcoming bookings.`);
        } catch (error) {
            console.error('Error in upcoming events cron job:', error);
        }
    });
};

module.exports = startCronJobs;
