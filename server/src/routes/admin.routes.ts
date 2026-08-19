import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import * as Y from "yjs";
import { prisma } from "../db.js";
import { requireAdmin, AuthenticatedRequest } from "../auth/auth.middleware.js";

const router = Router();

// In-memory runtime system settings with safe defaults
let systemSettings = {
  enableRegistration: true,
  enableGuestAccess: true,
  maintenanceMode: false,
  compactionIntervalMs: 3000,
  maxDocumentSizeMB: 50,
  allowPublicSharing: true,
};

// All routes in this router require Super Admin authorization
router.use(requireAdmin);

// ==========================================
// 1. TELEMETRY & SYSTEM METRICS
// ==========================================

// GET /api/admin/stats - System Telemetry & Aggregated KPI Metrics
router.get("/stats", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalDocuments,
      totalSnapshots,
      totalUpdateLogs,
      snapshotSizeAgg,
      recentUsers,
      recentDocuments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.documentSnapshot.count(),
      prisma.documentUpdateLog.count(),
      prisma.documentSnapshot.aggregate({
        _sum: { size: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, email: true, systemRole: true, color: true, createdAt: true },
      }),
      prisma.document.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true, color: true } },
          _count: { select: { snapshots: true } },
        },
      }),
    ]);

    const memoryUsage = process.memoryUsage();

    res.json({
      stats: {
        totalUsers,
        totalDocuments,
        totalSnapshots,
        totalUpdateLogs,
        totalStorageBytes: snapshotSizeAgg._sum.size || 0,
        systemHealth: "OPTIMAL",
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memory: {
          rssBytes: memoryUsage.rss,
          heapTotalBytes: memoryUsage.heapTotal,
          heapUsedBytes: memoryUsage.heapUsed,
        },
        recentUsers,
        recentDocuments: recentDocuments.map((d: any) => ({
          id: d.id,
          title: d.title,
          icon: d.icon,
          isPublic: d.isPublic,
          owner: d.owner,
          snapshotsCount: d._count.snapshots,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to collect system metrics" });
  }
});

// ==========================================
// 2. USER MANAGEMENT MODULE (CRUD)
// ==========================================

// GET /api/admin/users - List and search users
router.get("/users", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || "").toLowerCase().trim();

    const whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        color: true,
        avatar: true,
        systemRole: true,
        provider: true,
        createdAt: true,
        _count: {
          select: {
            documents: true,
            permissions: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      color: u.color,
      avatar: u.avatar,
      systemRole: u.systemRole,
      provider: u.provider || "local",
      createdAt: u.createdAt,
      ownedDocsCount: u._count.documents,
      sharedDocsCount: u._count.permissions,
    }));

    res.json({ users: formatted });
  } catch (error) {
    console.error("Admin list users error:", error);
    res.status(500).json({ error: "Failed to list platform users" });
  }
});

// POST /api/admin/users - Create a new user account
router.post("/users", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, password, name, systemRole = "USER", color = "#6366f1" } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({ error: "A user with this email already exists" });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        name: name.trim(),
        systemRole: systemRole === "ADMIN" ? "ADMIN" : "USER",
        color: color || "#6366f1",
        provider: "local",
      },
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        color: true,
        provider: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      message: `User ${newUser.name} created successfully`,
      user: newUser,
    });
  } catch (error) {
    console.error("Admin create user error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// PATCH /api/admin/users/:id - Update user details / reset password / change role
router.patch("/users/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id as string;
    const { name, email, password, systemRole, color } = req.body;
    const currentAdminId = req.user!.userId;

    const existingUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!existingUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Prevent demoting oneself
    if (targetUserId === currentAdminId && systemRole && systemRole !== "ADMIN") {
      res.status(400).json({ error: "You cannot remove your own administrator privileges" });
      return;
    }

    const updateData: any = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase().trim();
    if (color) updateData.color = color;
    if (systemRole) updateData.systemRole = systemRole === "ADMIN" ? "ADMIN" : "USER";

    if (password && password.trim().length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updateData.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        systemRole: true,
        color: true,
        provider: true,
        createdAt: true,
      },
    });

    res.json({
      message: `User ${updated.name} updated successfully`,
      user: updated,
    });
  } catch (error) {
    console.error("Admin update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// DELETE /api/admin/users/:id - Delete a user
router.delete("/users/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const targetUserId = req.params.id as string;
    const currentAdminId = req.user!.userId;

    if (targetUserId === currentAdminId) {
      res.status(400).json({ error: "You cannot delete your own admin account" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await prisma.user.delete({
      where: { id: targetUserId },
    });

    res.json({ message: `User ${user.email} and related documents deleted successfully` });
  } catch (error) {
    console.error("Admin delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ==========================================
// 3. DOCUMENT MANAGEMENT & AUDIT (CRUD)
// ==========================================

// GET /api/admin/documents - Platform-wide document directory
router.get("/documents", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string || "").toLowerCase().trim();

    const whereClause: any = {};
    if (q) {
      whereClause.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { owner: { email: { contains: q, mode: "insensitive" } } },
      ];
    }

    const documents = await prisma.document.findMany({
      where: whereClause,
      include: {
        owner: {
          select: { id: true, name: true, email: true, color: true },
        },
        _count: {
          select: {
            snapshots: true,
            permissions: true,
          },
        },
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { size: true, version: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formatted = documents.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      icon: doc.icon,
      isPublic: doc.isPublic,
      defaultRole: doc.defaultRole,
      ownerId: doc.ownerId,
      owner: doc.owner,
      collaboratorsCount: doc._count.permissions,
      snapshotsCount: doc._count.snapshots,
      latestVersion: doc.snapshots[0]?.version || 1,
      sizeBytes: doc.snapshots[0]?.size || 0,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    res.json({ documents: formatted });
  } catch (error) {
    console.error("Admin list documents error:", error);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

// GET /api/admin/documents/:id/audit - Comprehensive history, snapshots, delta update logs, and content preview
router.get("/documents/:id/audit", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const document: any = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true, color: true } },
        permissions: {
          include: {
            user: { select: { id: true, name: true, email: true, color: true } },
          },
        },
        snapshots: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        updateLogs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, clock: true, createdAt: true, update: true },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Decode current text content from latest snapshot
    let currentContentText = "";
    if (document.snapshots.length > 0) {
      try {
        const latestSnap = document.snapshots[0];
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, new Uint8Array(latestSnap.snapshot));
        const fragment = ydoc.getXmlFragment("default");
        currentContentText = fragment.toString();
      } catch (err) {
        currentContentText = "(Unable to decode binary Yjs snapshot)";
      }
    }

    // Format snapshots with decoded preview text
    const formattedSnapshots = document.snapshots.map((s: any) => {
      let previewText = "";
      try {
        const ydoc = new Y.Doc();
        Y.applyUpdate(ydoc, new Uint8Array(s.snapshot));
        previewText = ydoc.getXmlFragment("default").toString().slice(0, 300);
      } catch {
        previewText = "(Binary delta)";
      }
      return {
        id: s.id,
        version: s.version,
        size: s.size,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
        previewText,
      };
    });

    // Format incremental delta update logs
    const formattedUpdateLogs = document.updateLogs.map((log: any) => ({
      id: log.id,
      clock: log.clock,
      sizeBytes: log.update.length,
      createdAt: log.createdAt,
    }));

    res.json({
      audit: {
        document: {
          id: document.id,
          title: document.title,
          icon: document.icon,
          isPublic: document.isPublic,
          defaultRole: document.defaultRole,
          owner: document.owner,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
        currentContentText,
        snapshots: formattedSnapshots,
        updateLogs: formattedUpdateLogs,
        permissions: document.permissions.map((p: any) => ({
          id: p.id,
          role: p.role,
          user: p.user,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Admin document audit error:", error);
    res.status(500).json({ error: "Failed to collect document audit" });
  }
});

// PUT /api/admin/documents/:id/content - Direct Content Quick-Edit from Admin Panel
router.put("/documents/:id/content", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { textContent = "" } = req.body;

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    // Construct fresh Y.Doc with new text content
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment("default");
    const p = new Y.XmlElement("paragraph");
    fragment.insert(0, [p]);
    const text = new Y.XmlText();
    p.insert(0, [text]);
    text.insert(0, textContent);

    const snapshotBinary = Buffer.from(Y.encodeStateAsUpdate(ydoc));

    // Determine version
    const latestSnapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latestSnapshot?.version || 1) + 1;

    // Create snapshot
    const newSnapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: id,
        snapshot: snapshotBinary,
        version: nextVersion,
        size: snapshotBinary.length,
        createdBy: `Admin (${req.user!.name}) Quick Edit`,
      },
    });

    // Clear incremental logs
    await prisma.documentUpdateLog.deleteMany({
      where: { documentId: id },
    });

    // Touch document updatedAt
    await prisma.document.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.json({
      message: `Document content updated and version ${nextVersion} saved`,
      snapshot: {
        id: newSnapshot.id,
        version: newSnapshot.version,
        size: newSnapshot.size,
      },
    });
  } catch (error) {
    console.error("Admin update document content error:", error);
    res.status(500).json({ error: "Failed to update document content" });
  }
});

// POST /api/admin/documents/:id/history/restore - Restore snapshot as Super Admin
router.post("/documents/:id/history/restore", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { snapshotId } = req.body;

    if (!snapshotId) {
      res.status(400).json({ error: "snapshotId is required" });
      return;
    }

    const targetSnapshot = await prisma.documentSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!targetSnapshot || targetSnapshot.documentId !== id) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }

    const latest = await prisma.documentSnapshot.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });
    const nextVersion = (latest?.version || 1) + 1;

    const restoredSnapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: id,
        snapshot: targetSnapshot.snapshot,
        version: nextVersion,
        size: targetSnapshot.size,
        createdBy: `Restored to v${targetSnapshot.version} by Super Admin (${req.user!.name})`,
      },
    });

    await prisma.documentUpdateLog.deleteMany({
      where: { documentId: id },
    });

    await prisma.document.update({
      where: { id },
      data: { updatedAt: new Date() },
    });

    res.json({
      message: `Document restored to version ${targetSnapshot.version}`,
      snapshot: restoredSnapshot,
    });
  } catch (error) {
    console.error("Admin restore snapshot error:", error);
    res.status(500).json({ error: "Failed to restore document snapshot" });
  }
});

// POST /api/admin/documents - Create document on behalf of an owner
router.post("/documents", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title = "Untitled Document", icon = "📝", ownerId, isPublic = false, defaultRole = "VIEWER" } = req.body;
    const targetOwnerId = ownerId || req.user!.userId;

    const owner = await prisma.user.findUnique({
      where: { id: targetOwnerId },
    });

    if (!owner) {
      res.status(404).json({ error: "Target owner user not found" });
      return;
    }

    const document = await prisma.document.create({
      data: {
        title: title.trim() || "Untitled Document",
        icon: icon || "📝",
        isPublic: Boolean(isPublic),
        defaultRole: defaultRole || "VIEWER",
        ownerId: targetOwnerId,
        permissions: {
          create: {
            userId: targetOwnerId,
            role: "OWNER",
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, email: true, color: true } },
      },
    });

    // Initialize snapshot
    const initialDoc = new Y.Doc();
    const fragment = initialDoc.getXmlFragment("default");
    const p = new Y.XmlElement("paragraph");
    fragment.insert(0, [p]);
    const text = new Y.XmlText();
    p.insert(0, [text]);
    text.insert(0, "Created by Administrator...");

    const stateUpdate = Buffer.from(Y.encodeStateAsUpdate(initialDoc));
    await prisma.documentSnapshot.create({
      data: {
        documentId: document.id,
        snapshot: stateUpdate,
        version: 1,
        size: stateUpdate.length,
        createdBy: "Administrator",
      },
    });

    res.status(201).json({
      message: `Document "${document.title}" created successfully`,
      document,
    });
  } catch (error) {
    console.error("Admin create document error:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// PATCH /api/admin/documents/:id - Update document metadata / transfer owner
router.patch("/documents/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, icon, isPublic, defaultRole, ownerId } = req.body;

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (defaultRole !== undefined) updateData.defaultRole = defaultRole;

    if (ownerId && ownerId !== doc.ownerId) {
      const newOwner = await prisma.user.findUnique({ where: { id: ownerId } });
      if (!newOwner) {
        res.status(404).json({ error: "New owner user not found" });
        return;
      }
      updateData.ownerId = ownerId;
      // Also update permission record
      await prisma.documentPermission.upsert({
        where: {
          documentId_userId: { documentId: id, userId: ownerId },
        },
        update: { role: "OWNER" },
        create: { documentId: id, userId: ownerId, role: "OWNER" },
      });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: { select: { id: true, name: true, email: true, color: true } },
      },
    });

    res.json({
      message: `Document updated successfully`,
      document: updated,
    });
  } catch (error) {
    console.error("Admin update document error:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// DELETE /api/admin/documents/:id - Force delete any document
router.delete("/documents/:id", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;

    const doc = await prisma.document.findUnique({
      where: { id },
    });

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({ message: `Document "${doc.title}" purged from platform` });
  } catch (error) {
    console.error("Admin delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// ==========================================
// 4. SYSTEM SETTINGS & FEATURE FLAGS (CRUD)
// ==========================================

// GET /api/admin/settings - Retrieve runtime feature flags
router.get("/settings", async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.json({ settings: systemSettings });
});

// PATCH /api/admin/settings - Update runtime feature flags
router.patch("/settings", async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const {
      enableRegistration,
      enableGuestAccess,
      maintenanceMode,
      compactionIntervalMs,
      maxDocumentSizeMB,
      allowPublicSharing,
    } = req.body;

    if (enableRegistration !== undefined) systemSettings.enableRegistration = Boolean(enableRegistration);
    if (enableGuestAccess !== undefined) systemSettings.enableGuestAccess = Boolean(enableGuestAccess);
    if (maintenanceMode !== undefined) systemSettings.maintenanceMode = Boolean(maintenanceMode);
    if (compactionIntervalMs !== undefined) systemSettings.compactionIntervalMs = Number(compactionIntervalMs);
    if (maxDocumentSizeMB !== undefined) systemSettings.maxDocumentSizeMB = Number(maxDocumentSizeMB);
    if (allowPublicSharing !== undefined) systemSettings.allowPublicSharing = Boolean(allowPublicSharing);

    res.json({
      message: "System configuration updated successfully",
      settings: systemSettings,
    });
  } catch (error) {
    console.error("Admin update settings error:", error);
    res.status(500).json({ error: "Failed to update system settings" });
  }
});

export default router;
