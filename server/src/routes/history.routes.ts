import { Router, Response } from "express";
import * as Y from "yjs";
import { prisma } from "../db.js";
import { requireAuth, AuthenticatedRequest } from "../auth/auth.middleware.js";

const router: Router = Router();

// GET /api/documents/:id/history - List snapshot history
router.get("/:id/history", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const document: any = await prisma.document.findUnique({
      where: { id },
      include: {
        permissions: { where: { userId } },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const isOwner = document.ownerId === userId;
    const hasPermission = document.permissions && document.permissions.length > 0;
    if (!isOwner && !hasPermission && !document.isPublic) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const snapshots = await prisma.documentSnapshot.findMany({
      where: { documentId: id },
      select: {
        id: true,
        version: true,
        size: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    res.json({ snapshots });
  } catch (error) {
    console.error("Get history error:", error);
    res.status(500).json({ error: "Failed to retrieve document history" });
  }
});

// GET /api/documents/:id/history/:snapshotId - Preview a snapshot content summary
router.get("/:id/history/:snapshotId", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const snapshotId = req.params.snapshotId as string;
    const userId = req.user!.userId;

    const document: any = await prisma.document.findUnique({
      where: { id },
      include: { permissions: { where: { userId } } },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const isOwner = document.ownerId === userId;
    const hasPermission = document.permissions && document.permissions.length > 0;
    if (!isOwner && !hasPermission && !document.isPublic) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const snapshotRecord = await prisma.documentSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshotRecord || snapshotRecord.documentId !== id) {
      res.status(404).json({ error: "Snapshot not found" });
      return;
    }

    // Decode Yjs state to inspect text content
    const ydoc = new Y.Doc();
    Y.applyUpdate(ydoc, new Uint8Array(snapshotRecord.snapshot));
    const fragment = ydoc.getXmlFragment("default");
    const previewText = fragment.toString();

    res.json({
      snapshot: {
        id: snapshotRecord.id,
        version: snapshotRecord.version,
        size: snapshotRecord.size,
        createdBy: snapshotRecord.createdBy,
        createdAt: snapshotRecord.createdAt,
        previewText: previewText.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Preview snapshot error:", error);
    res.status(500).json({ error: "Failed to preview snapshot" });
  }
});

// POST /api/documents/:id/history/restore - Restore to a snapshot version
router.post("/:id/history/restore", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { snapshotId } = req.body;
    const userId = req.user!.userId;

    if (!snapshotId) {
      res.status(400).json({ error: "snapshotId is required" });
      return;
    }

    const document: any = await prisma.document.findUnique({
      where: { id },
      include: {
        permissions: { where: { userId } },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    const isOwner = document.ownerId === userId;
    const isEditor = document.permissions?.some((p: any) => p.role === "EDITOR" || p.role === "OWNER");

    if (!isOwner && !isEditor) {
      res.status(403).json({ error: "Only editors or owners can restore versions" });
      return;
    }

    const targetSnapshot = await prisma.documentSnapshot.findUnique({
      where: { id: snapshotId as string },
    });

    if (!targetSnapshot || targetSnapshot.documentId !== id) {
      res.status(404).json({ error: "Target snapshot not found" });
      return;
    }

    // Find current highest version
    const latestSnapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: id },
      orderBy: { version: "desc" },
    });

    const newVersion = (latestSnapshot?.version || 1) + 1;

    // Create a new snapshot record representing the restored state
    const newSnapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: id,
        snapshot: targetSnapshot.snapshot,
        version: newVersion,
        size: targetSnapshot.size,
        createdBy: `Restored to v${targetSnapshot.version} by ${req.user!.name}`,
      },
    });

    // Clear old incremental update logs since we restored to a clean snapshot
    await prisma.documentUpdateLog.deleteMany({
      where: { documentId: id },
    });

    res.json({
      message: `Restored document to version ${targetSnapshot.version}`,
      snapshot: newSnapshot,
    });
  } catch (error) {
    console.error("Restore snapshot error:", error);
    res.status(500).json({ error: "Failed to restore snapshot" });
  }
});

export default router;
