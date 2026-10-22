
import { Router } from "express";
import { randomInt } from "node:crypto";
import jwt from "jsonwebtoken";
import { pool } from "../configs/db.js";
import { env } from "../configs/env.js";

export const authRouter = Router();

interface OtpRecord {
  code: string;
  expiresAt: number;
  attempts: number;
}

const otpStore = new Map<string, OtpRecord>();
const lastRequested = new Map<string, number>();

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

function isValidPhone(phone: unknown): phone is string {
  return (
    typeof phone === "string" &&
    /^\+[1-9]\d{7,14}$/.test(phone)
  );
}

authRouter.post("/request/otp", (req, res) => {
  const { phone } = req.body;

  if (!isValidPhone(phone)) {
    res.status(400).json({
      message: "Enter a valid phone number with country code, e.g. +919876543210",
    });
    return;
  }

  const now = Date.now();
  const lastTime = lastRequested.get(phone) ?? 0;

  if (now - lastTime < RESEND_COOLDOWN_MS) {
    res.status(429).json({
      message: "Please wait before requesting another OTP",
    });
    return;
  }

  const code = String(randomInt(100000, 1000000));

  otpStore.set(phone, {
    code,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
  });

  lastRequested.set(phone, now);

  // Mock OTP: visible only in the backend terminal.
  console.log(`[MiniLedger] OTP for ${phone}: ${code}`);

  res.status(200).json({
    message: "OTP generated. Check the server terminal.",
  });
});

authRouter.post("/verify/otp", async (req, res) => {
  const { phone, otp } = req.body;

  if (!isValidPhone(phone) ||
      typeof otp !== "string" ||
      !/^\d{6}$/.test(otp)) {
    res.status(400).json({
      message: "Valid phone number and six-digit OTP are required",
    });
    return;
  }

  const record = otpStore.get(phone);

  if (!record) {
    res.status(400).json({
      message: "OTP not found. Request a new OTP.",
    });
    return;
  }

  if (Date.now() > record.expiresAt) {
    otpStore.delete(phone);
    res.status(400).json({ message: "OTP expired" });
    return;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(phone);
    res.status(429).json({
      message: "Too many attempts. Request a new OTP.",
    });
    return;
  }

  if (record.code !== otp) {
    record.attempts += 1;
    res.status(400).json({ message: "Invalid OTP" });
    return;
  }

  // OTP is one-time use.
  otpStore.delete(phone);
  lastRequested.delete(phone);

  try {
    const result = await pool.query(
      `INSERT INTO users (phone)
       VALUES ($1)
       ON CONFLICT (phone)
       DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, phone, created_at`,
      [phone],
    );

    const user = result.rows[0];
    const secret = env.jwtSecret;

    if (!secret) {
      throw new Error("JWT_SECRET is missing");
    }

    const token = jwt.sign(
      { phone: user.phone },
      secret,
      { subject: user.id, expiresIn: "1h" },
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.error("OTP verification failed:", error);
    res.status(500).json({
      message: "Unable to complete login",
    });
  }
});