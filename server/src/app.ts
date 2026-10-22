
import express from "express";
import cors from "cors";
import { pool } from "./configs/db.js";

// Routers
import { authRouter } from "./auth/auth.routes.js";
import { loansRouter } from "./loans/loan.routes.js";
import { summaryRouter } from "./summary/summary.routes.js";

import { authenticateToken, type AuthRequest } from "./middlewares/auth.middleware.js";

export const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/loans", loansRouter);
app.use("/api/summary", summaryRouter);

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      success: true,
      message: "MiniLedger API is healthy",
      database: "connected",
    });
  } catch {
    res.status(503).json({
      success: false,
      message: "Database unavailable",
    });
  }
});

app.get("/api/protected-test", authenticateToken, (req, res) => {
  const authReq = req as AuthRequest;

  res.json({
    message: "Authentication successful",
    userId: authReq.userId,
  });
});
