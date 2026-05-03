const db = require('./db');

async function clearDB() {
    try {
        await db.query('DELETE FROM certificates');
        console.log('✅ All old data cleared successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error clearing DB:', err);
        process.exit(1);
    }
}

clearDB();
