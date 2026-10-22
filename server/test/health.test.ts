
import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /api/health", () => {
  it("should return 200 when the database is connected", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: "MiniLedger API is healthy",
      database: "connected",
    });
  });
});
