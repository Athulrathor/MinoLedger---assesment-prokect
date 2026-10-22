import { Pool } from "pg";
import { env } from "./env.js";

const connectionString = env.db;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing from .env");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  connectionTimeoutMillis: 5000,
});