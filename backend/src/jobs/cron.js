const cron = require('node-cron');
const Inquiry = require('../models/Inquiry');

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
    });
};

module.exports = startCronJobs;
