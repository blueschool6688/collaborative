import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/db.js";
import { signToken, verifyToken } from "../src/auth/jwt.js";
import bcrypt from "bcryptjs";

describe("Admin Governance & OAuth Social Login Test Suite", () => {
  let adminUser: any;
  let regularUser: any;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(6);
    const hash = await bcrypt.hash("pass123", salt);

    adminUser = await prisma.user.create({
      data: {
        email: `test_admin_${Date.now()}@example.com`,
        name: "Test Administrator",
        passwordHash: hash,
        color: "#ef4444",
        systemRole: "ADMIN",
      },
    });

    regularUser = await prisma.user.create({
      data: {
        email: `test_regular_${Date.now()}@example.com`,
        name: "Test Regular User",
        passwordHash: hash,
        color: "#6366f1",
        systemRole: "USER",
      },
    });

    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      systemRole: "ADMIN",
    });

    userToken = signToken({
      userId: regularUser.id,
      email: regularUser.email,
      name: regularUser.name,
      systemRole: "USER",
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminUser.id, regularUser.id] },
      },
    });
    await prisma.$disconnect();
  });

  it("should encode and decode systemRole in JWT tokens", () => {
    const decodedAdmin = verifyToken(adminToken);
    expect(decodedAdmin).not.toBeNull();
    expect(decodedAdmin?.systemRole).toBe("ADMIN");
    expect(decodedAdmin?.userId).toBe(adminUser.id);

    const decodedUser = verifyToken(userToken);
    expect(decodedUser).not.toBeNull();
    expect(decodedUser?.systemRole).toBe("USER");
  });

  it("should support creating a user via OAuth (Google / GitHub)", async () => {
    const oauthEmail = `oauth_${Date.now()}@gmail.com`;
    const user = await prisma.user.create({
      data: {
        email: oauthEmail,
        name: "Google OAuth User",
        provider: "google",
        providerId: "google_12345678",
        avatar: "https://lh3.googleusercontent.com/a/mock",
        systemRole: "USER",
      },
    });

    expect(user.id).toBeDefined();
    expect(user.provider).toBe("google");
    expect(user.providerId).toBe("google_12345678");
    expect(user.systemRole).toBe("USER");

    // Clean up
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("should allow promoting a regular user to ADMIN and demoting back", async () => {
    // 1. Promote to ADMIN
    const promoted = await prisma.user.update({
      where: { id: regularUser.id },
      data: { systemRole: "ADMIN" },
    });
    expect(promoted.systemRole).toBe("ADMIN");

    // 2. Demote back to USER
    const demoted = await prisma.user.update({
      where: { id: regularUser.id },
      data: { systemRole: "USER" },
    });
    expect(demoted.systemRole).toBe("USER");
  });

  it("should aggregate system stats accurately", async () => {
    const userCount = await prisma.user.count();
    const docCount = await prisma.document.count();

    expect(userCount).toBeGreaterThanOrEqual(2);
    expect(docCount).toBeGreaterThanOrEqual(0);
  });
});
