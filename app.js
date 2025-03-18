import express from 'express';
import 'dotenv/config';
import pool from './config/db.js'

const app = express();
const PORT = process.env.PORT || 3000;

const db=pool.promise();
async function testConnection() {
    try {
        const [rows] = await db.query('SELECT 1');
        console.log('Connected to MySQL Database!');
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
}
testConnection();

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});