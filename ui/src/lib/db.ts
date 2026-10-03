import { Pool } from "pg";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Missing database connection string. Set POSTGRES_URL or DATABASE_URL environment variable.");
}

const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: true } : undefined,
  max: 5,
});

export default pool;
