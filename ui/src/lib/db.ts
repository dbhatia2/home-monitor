import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3310),
  user: process.env.DB_USER || "monitor",
  password: process.env.DB_PASS || "monitor123",
  database: process.env.DB_NAME || "home_monitor",
  waitForConnections: true,
  connectionLimit: 5,
  // PlanetScale requires SSL in production
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
});

export default pool;
