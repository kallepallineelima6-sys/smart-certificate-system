const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL connection setup
// Ensure you have a local PostgreSQL running or use an external URL (e.g., Supabase)
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "certificates_db",
    password: "9392",
    port: 5432,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle database client', err);
});

// A helper function to initialize our tables automatically if they don't exist
const initDB = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS certificates (
            id SERIAL PRIMARY KEY,
            user_id INT,
            title VARCHAR(255),
            issuer VARCHAR(255),
            issue_year INT,
            category VARCHAR(100),
            status VARCHAR(50), -- verified, semi, unverified
            expiry_date DATE,
            file_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id SERIAL PRIMARY KEY,
            user_id INT,
            message TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    try {
        await pool.query(createTableQuery);
        console.log("✅ PostgreSQL Database connected successfully!");
        console.log("Database tables initialized successfully.");
    } catch (err) {
        console.error("Error initializing DB:", err);
    }
};

initDB();

module.exports = {
    query: (text, params) => pool.query(text, params),
};
