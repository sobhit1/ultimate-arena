import mysql from 'mysql2';
import 'dotenv/config'

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

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

export default db;