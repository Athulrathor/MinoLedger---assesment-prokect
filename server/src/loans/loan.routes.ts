
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { pool } from "../configs/db.js";
import {
  authenticateToken,
  type AuthRequest,
} from "../middlewares/auth.middleware.js";

export const loansRouter = Router();

loansRouter.use(authenticateToken);

// GET /api/loans — list current user's loans
loansRouter.get("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;

  try {
    const result = await pool.query(
      `SELECT id, friend_name, amount, due_date,
              is_repaid, repaid_at, created_at
       FROM loans
       WHERE user_id = $1
       ORDER BY due_date ASC, created_at DESC`,
      [userId],
    );

    res.json({ loans: result.rows });
  } catch (error) {
    console.error("List loans failed:", error);
    res.status(500).json({ message: "Unable to fetch loans" });
  }
});

// POST /api/loans — create a loan
loansRouter.post("/", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const { friendName, amount, dueDate } = req.body;

  if (
    typeof friendName !== "string" ||
    friendName.trim().length === 0 ||
    friendName.trim().length > 100
  ) {
    res.status(400).json({
      message: "Friend name must be between 1 and 100 characters",
    });
    return;
  }

  // Validate money without accepting NaN, Infinity, zero, or negatives.
  const amountString = String(amount);
  if (
    !/^\d{1,10}(\.\d{1,2})?$/.test(amountString) ||
    Number(amountString) <= 0
  ) {
    res.status(400).json({
      message: "Amount must be positive with at most 2 decimal places",
    });
    return;
  }

  if (
    typeof dueDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)
  ) {
    res.status(400).json({ message: "Due date must use YYYY-MM-DD" });
    return;
  }

  const parsedDate = new Date(`${dueDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dueDate
  ) {
    res.status(400).json({ message: "Invalid calendar date" });
    return;
  }

  try {
    const result = await pool.query(
      `INSERT INTO loans (id, user_id, friend_name, amount, due_date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, friend_name, amount, due_date,
                 is_repaid, repaid_at, created_at`,
      [randomUUID(), userId, friendName.trim(), amountString, dueDate],
    );

    res.status(201).json({ loan: result.rows[0] });
  } catch (error) {
    console.error("Create loan failed:", error);
    res.status(500).json({ message: "Unable to create loan" });
  }
});

// PATCH /api/loans/:id/repay — mark loan as repaid
loansRouter.patch("/:id/repay", async (req, res) => {
  const userId = (req as AuthRequest).userId!;
  const { id } = req.params;

  if (typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    res.status(400).json({ message: "Invalid loan ID" });
    return;
  }

  try {
    const result = await pool.query(
      `UPDATE loans
       SET is_repaid = TRUE, repaid_at = NOW()
       WHERE id = $1 AND user_id = $2 AND is_repaid = FALSE
       RETURNING id, friend_name, amount, due_date,
                 is_repaid, repaid_at, created_at`,
      [id, userId],
    );

    if (result.rowCount === 0) {
      res.status(404).json({
        message: "Unpaid loan not found",
      });
      return;
    }

    res.json({ loan: result.rows[0] });
  } catch (error) {
    console.error("Repay loan failed:", error);
    res.status(500).json({ message: "Unable to mark loan as repaid" });
  }
});
