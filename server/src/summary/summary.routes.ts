
import { Router } from "express";
import { pool } from "../configs/db.js";
import { authenticateToken, type AuthRequest } from "../middlewares/auth.middleware.js";

export const summaryRouter = Router();

summaryRouter.get("/", authenticateToken, async (req, res) => {
  const userId = (req as AuthRequest).userId!;

  try {
    const result = await pool.query(
      `SELECT
         COALESCE(SUM(amount), 0)::NUMERIC(12, 2) AS "totalLent",
         COALESCE(
           SUM(amount) FILTER (WHERE is_repaid = TRUE), 0
         )::NUMERIC(12, 2) AS "totalRepaid",
         COALESCE(
           SUM(amount) FILTER (
             WHERE is_repaid = FALSE
               AND due_date < CURRENT_DATE
           ), 0
         )::NUMERIC(12, 2) AS "overdueAmount"
       FROM loans
       WHERE user_id = $1`,
      [userId],
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Summary query failed:", error);
    res.status(500).json({
      message: "Unable to fetch summary",
    });
  }
});
