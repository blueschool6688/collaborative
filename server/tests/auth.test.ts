import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "../src/auth/jwt.js";

describe("JWT Authentication Helper", () => {
  it("should sign and verify valid user tokens", () => {
    const payload = {
      userId: "user_12345",
      email: "alice@example.com",
      name: "Alice Developer",
      color: "#6366f1",
    };

    const token = signToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe(payload.userId);
    expect(decoded?.email).toBe(payload.email);
    expect(decoded?.name).toBe(payload.name);
  });

  it("should return null for invalid or tampered tokens", () => {
    const invalidToken = "ey12345.tampered.token";
    const result = verifyToken(invalidToken);
    expect(result).toBeNull();
  });
});
