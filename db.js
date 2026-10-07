const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT),
    database: process.env.PG_DATABASE,
});

// Test connection on boot
pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to PostgreSQL successfully');
        release();
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};