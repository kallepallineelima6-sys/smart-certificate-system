const cron = require('node-cron');
const db = require('./db');

// This job runs every day at 12:00 AM (midnight)
cron.schedule('0 0 * * *', async () => {
    console.log("CRON JOB STARTED: Scanning for expiring certificates...");

    try {
        // Query to find certificates expiring in exactly 15 days, 7 days, or 1 day
        const query = `
            SELECT id, user_id, title, expiry_date 
            FROM certificates 
            WHERE expiry_date IS NOT NULL 
              AND (
                  expiry_date::DATE = (CURRENT_DATE + INTERVAL '15 days')::DATE
                  OR expiry_date::DATE = (CURRENT_DATE + INTERVAL '7 days')::DATE
                  OR expiry_date::DATE = (CURRENT_DATE + INTERVAL '1 day')::DATE
              );
        `;
        
        const res = await db.query(query);
        const expiringCerts = res.rows;

        for (let cert of expiringCerts) {
            // Validate the date strictly, then format
            const expiryObj = new Date(cert.expiry_date);
            const formattedDate = expiryObj.toISOString().split('T')[0];

            // Push alert to the notifications table using flawless backticks
            const msg = `⚠️ ALERT: Your '${cert.title}' certificate is expiring on ${formattedDate}.`;

            const insertQuery = `INSERT INTO notifications (user_id, message) VALUES ($1, $2)`;
            await db.query(insertQuery, [cert.user_id, msg]);
            
            console.log(`Notification created for Cert ID: ${cert.id}`);
        }
    } catch (err) {
        console.error("Error running expiry cron job:", err);
    }
});
