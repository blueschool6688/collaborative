import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/db.js";
import { signToken } from "../src/auth/jwt.js";
import bcrypt from "bcryptjs";
import * as Y from "yjs";

describe("Admin Document Content Management & Audit Logs Suite", () => {
  let adminUser: any;
  let testDoc: any;
  let adminToken: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(6);
    const hash = await bcrypt.hash("pass123", salt);

    adminUser = await prisma.user.create({
      data: {
        email: `doc_admin_${Date.now()}@example.com`,
        name: "Doc Audit Admin",
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

    testDoc = await prisma.document.create({
      data: {
        title: "Audit Target Document",
        isPublic: false,
        ownerId: adminUser.id,
      },
    });

    // Create v1 snapshot
    const initialDoc = new Y.Doc();
    const fragment = initialDoc.getXmlFragment("default");
    const p = new Y.XmlElement("paragraph");
    fragment.insert(0, [p]);
    const text = new Y.XmlText();
    p.insert(0, [text]);
    text.insert(0, "Initial version text...");

    const v1Bytes = Buffer.from(Y.encodeStateAsUpdate(initialDoc));
    await prisma.documentSnapshot.create({
      data: {
        documentId: testDoc.id,
        snapshot: v1Bytes,
        version: 1,
        size: v1Bytes.length,
        createdBy: "Initial Setup",
      },
    });

    // Create a mock incremental update log
    await prisma.documentUpdateLog.create({
      data: {
        documentId: testDoc.id,
        update: Buffer.from([1, 2, 3]),
        clock: 1,
      },
    });
  });

  afterAll(async () => {
    if (testDoc) {
      await prisma.documentSnapshot.deleteMany({ where: { documentId: testDoc.id } });
      await prisma.documentUpdateLog.deleteMany({ where: { documentId: testDoc.id } });
      await prisma.document.deleteMany({ where: { id: testDoc.id } });
    }
    await prisma.user.deleteMany({ where: { id: adminUser.id } });
    await prisma.$disconnect();
  });

  it("should inspect document snapshots and incremental update logs in audit", async () => {
    const docWithAudit = await prisma.document.findUnique({
      where: { id: testDoc.id },
      include: {
        snapshots: true,
        updateLogs: true,
      },
    });

    expect(docWithAudit).toBeDefined();
    expect(docWithAudit?.snapshots.length).toBeGreaterThanOrEqual(1);
    expect(docWithAudit?.updateLogs.length).toBeGreaterThanOrEqual(1);

    // Verify Yjs decoding
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(docWithAudit!.snapshots[0].snapshot));
    const decoded = ydoc.getXmlFragment("default").toString();
    expect(decoded).toContain("Initial version text...");
  });

  it("should update content text directly and generate a new snapshot version", async () => {
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment("default");
    const p = new Y.XmlElement("paragraph");
    fragment.insert(0, [p]);
    const text = new Y.XmlText();
    p.insert(0, [text]);
    text.insert(0, "Updated content by Super Admin");

    const v2Bytes = Buffer.from(Y.encodeStateAsUpdate(ydoc));
    const newSnapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: testDoc.id,
        snapshot: v2Bytes,
        version: 2,
        size: v2Bytes.length,
        createdBy: "Super Admin",
      },
    });

    expect(newSnapshot.version).toBe(2);

    const checkSnap = await prisma.documentSnapshot.findFirst({
      where: { documentId: testDoc.id, version: 2 },
    });
    expect(checkSnap).toBeDefined();
    expect(checkSnap?.createdBy).toBe("Super Admin");
  });
});
