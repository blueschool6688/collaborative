import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/db.js";
import { signToken } from "../src/auth/jwt.js";
import { onAuthenticateHook } from "../src/hocuspocus/auth.hook.js";
import bcrypt from "bcryptjs";

describe("Document Sharing & Hocuspocus Auth Synchronization", () => {
  let ownerUser: any;
  let editorUser: any;
  let viewerUser: any;
  let strangerUser: any;
  let privateDoc: any;
  let publicDoc: any;

  let ownerToken: string;
  let editorToken: string;
  let viewerToken: string;
  let strangerToken: string;

  beforeAll(async () => {
    // Setup test users
    const salt = await bcrypt.genSalt(6);
    const hash = await bcrypt.hash("pass123", salt);

    ownerUser = await prisma.user.create({
      data: {
        email: `test_owner_${Date.now()}@example.com`,
        name: "Test Owner",
        passwordHash: hash,
        color: "#6366f1",
      },
    });

    editorUser = await prisma.user.create({
      data: {
        email: `test_editor_${Date.now()}@example.com`,
        name: "Test Editor",
        passwordHash: hash,
        color: "#10b981",
      },
    });

    viewerUser = await prisma.user.create({
      data: {
        email: `test_viewer_${Date.now()}@example.com`,
        name: "Test Viewer",
        passwordHash: hash,
        color: "#f59e0b",
      },
    });

    strangerUser = await prisma.user.create({
      data: {
        email: `test_stranger_${Date.now()}@example.com`,
        name: "Test Stranger",
        passwordHash: hash,
        color: "#ec4899",
      },
    });

    ownerToken = signToken({ userId: ownerUser.id, email: ownerUser.email, name: ownerUser.name });
    editorToken = signToken({ userId: editorUser.id, email: editorUser.email, name: editorUser.name });
    viewerToken = signToken({ userId: viewerUser.id, email: viewerUser.email, name: viewerUser.name });
    strangerToken = signToken({ userId: strangerUser.id, email: strangerUser.email, name: strangerUser.name });

    // Create private document owned by ownerUser and shared with editorUser & viewerUser
    privateDoc = await prisma.document.create({
      data: {
        title: "Confidential Engineering Plan",
        isPublic: false,
        ownerId: ownerUser.id,
        permissions: {
          create: [
            { userId: ownerUser.id, role: "OWNER" },
            { userId: editorUser.id, role: "EDITOR" },
            { userId: viewerUser.id, role: "VIEWER" },
          ],
        },
      },
    });

    // Create public document
    publicDoc = await prisma.document.create({
      data: {
        title: "Public Community Roadmap",
        isPublic: true,
        defaultRole: "EDITOR",
        ownerId: ownerUser.id,
        permissions: {
          create: [{ userId: ownerUser.id, role: "OWNER" }],
        },
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (privateDoc) await prisma.document.deleteMany({ where: { id: privateDoc.id } });
    if (publicDoc) await prisma.document.deleteMany({ where: { id: publicDoc.id } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [ownerUser.id, editorUser.id, viewerUser.id, strangerUser.id] },
      },
    });
    await prisma.$disconnect();
  });

  it("should grant OWNER role with readOnly = false to document owner", async () => {
    const connection: any = { readOnly: false };
    const context = await onAuthenticateHook({
      token: ownerToken,
      documentName: privateDoc.id,
      connection,
    } as any);

    expect(context.role).toBe("OWNER");
    expect(context.readOnly).toBe(false);
    expect(connection.readOnly).toBe(false);
    expect(context.user.id).toBe(ownerUser.id);
  });

  it("should grant EDITOR role with readOnly = false to invited editor", async () => {
    const connection: any = { readOnly: false };
    const context = await onAuthenticateHook({
      token: editorToken,
      documentName: privateDoc.id,
      connection,
    } as any);

    expect(context.role).toBe("EDITOR");
    expect(context.readOnly).toBe(false);
    expect(connection.readOnly).toBe(false);
    expect(context.user.id).toBe(editorUser.id);
  });

  it("should grant VIEWER role with readOnly = true to invited viewer", async () => {
    const connection: any = { readOnly: false };
    const context = await onAuthenticateHook({
      token: viewerToken,
      documentName: privateDoc.id,
      connection,
    } as any);

    expect(context.role).toBe("VIEWER");
    expect(context.readOnly).toBe(true);
    expect(connection.readOnly).toBe(true);
    expect(context.user.id).toBe(viewerUser.id);
  });

  it("should reject uninvited user on private document with Unauthorized error", async () => {
    const connection: any = { readOnly: false };
    await expect(
      onAuthenticateHook({
        token: strangerToken,
        documentName: privateDoc.id,
        connection,
      } as any)
    ).rejects.toThrow("Unauthorized");
  });

  it("should allow guest on public document with defaultRole", async () => {
    const connection: any = { readOnly: false };
    const context = await onAuthenticateHook({
      token: "",
      documentName: publicDoc.id,
      connection,
    } as any);

    expect(context.role).toBe("EDITOR");
    expect(context.readOnly).toBe(false);
    expect(connection.readOnly).toBe(false);
    expect(context.user.name).toContain("Guest");
  });

  it("should allow uninvited logged-in user on public document with defaultRole", async () => {
    const connection: any = { readOnly: false };
    const context = await onAuthenticateHook({
      token: strangerToken,
      documentName: publicDoc.id,
      connection,
    } as any);

    expect(context.role).toBe("EDITOR");
    expect(context.readOnly).toBe(false);
    expect(context.user.id).toBe(strangerUser.id);
    expect(context.user.name).toBe("Test Stranger");
  });
});
