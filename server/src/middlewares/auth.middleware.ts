import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../configs/env.js";

export interface AuthRequest extends Request {
  userId?: string;
}

interface JwtPayload {
  phone: string;
  sub: string;
}

export function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const secret = env.jwtSecret;

  if (!secret) {
    res.status(500).json({ message: "Server authentication is not configured" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret);

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.phone !== "string"
    ) {
      res.status(401).json({ message: "Invalid token" });
      return;
    }

    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}