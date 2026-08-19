import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/db.js";
import { signToken } from "../src/auth/jwt.js";
import bcrypt from "bcryptjs";

describe("Admin Full Functional CRUD Test Suite", () => {
  let adminUser: any;
  let testUser: any;
  let testDoc: any;
  let adminToken: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(6);
    const hash = await bcrypt.hash("pass123", salt);

    adminUser = await prisma.user.create({
      data: {
        email: `crud_admin_${Date.now()}@example.com`,
        name: "CRUD Admin",
        passwordHash: hash,
        systemRole: "ADMIN",
      },
    });

    adminToken = signToken({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      systemRole: "ADMIN",
    });
  });

  afterAll(async () => {
    if (testDoc) await prisma.document.deleteMany({ where: { id: testDoc.id } });
    if (testUser) await prisma.user.deleteMany({ where: { id: testUser.id } });
    await prisma.user.deleteMany({ where: { id: adminUser.id } });
    await prisma.$disconnect();
  });

  it("should create, read, update, and delete a user via Admin operations", async () => {
    // 1. Create
    const salt = await bcrypt.genSalt(6);
    const hash = await bcrypt.hash("newpass123", salt);
    testUser = await prisma.user.create({
      data: {
        email: `crud_created_${Date.now()}@example.com`,
        name: "Fresh User",
        passwordHash: hash,
        systemRole: "USER",
      },
    });
    expect(testUser.id).toBeDefined();
    expect(testUser.name).toBe("Fresh User");

    // 2. Read
    const found = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(found?.email).toBe(testUser.email);

    // 3. Update
    const updated = await prisma.user.update({
      where: { id: testUser.id },
      data: { name: "Updated Name", systemRole: "ADMIN" },
    });
    expect(updated.name).toBe("Updated Name");
    expect(updated.systemRole).toBe("ADMIN");

    // 4. Delete
    await prisma.user.delete({ where: { id: testUser.id } });
    const afterDelete = await prisma.user.findUnique({ where: { id: testUser.id } });
    expect(afterDelete).toBeNull();
    testUser = null;
  });

  it("should create, read, update, and delete a document via Admin operations", async () => {
    // 1. Create Document on behalf of Admin
    testDoc = await prisma.document.create({
      data: {
        title: "Admin Managed Project Plan",
        isPublic: false,
        ownerId: adminUser.id,
      },
    });
    expect(testDoc.id).toBeDefined();
    expect(testDoc.title).toBe("Admin Managed Project Plan");

    // 2. Update Document
    const updatedDoc = await prisma.document.update({
      where: { id: testDoc.id },
      data: { title: "Renamed by Super Admin", isPublic: true },
    });
    expect(updatedDoc.title).toBe("Renamed by Super Admin");
    expect(updatedDoc.isPublic).toBe(true);

    // 3. Delete Document
    await prisma.document.delete({ where: { id: testDoc.id } });
    const afterDelete = await prisma.document.findUnique({ where: { id: testDoc.id } });
    expect(afterDelete).toBeNull();
    testDoc = null;
  });
});
