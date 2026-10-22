
import "dotenv/config";
import { app } from "./app.js";
import { pool } from "./configs/db.js";
import { env } from "./configs/env.js";

const port = Number(env.port) || 5000;

async function server() {
  // Confirm the database is reachable before starting.
  await pool.query("SELECT 1");

  const server = app.listen(port, () => {
    console.log(`MiniLedger server running at http://localhost:${port}`);
  });

  const shutdown = () => {
    server.close(() => {
      void pool.end().then(() => process.exit(0));
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

server().catch(async (error: unknown) => {
  console.error("Failed to start MiniLedger:", error);
  await pool.end();
  process.exitCode = 1;
});
