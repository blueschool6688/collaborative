import { Router, Response } from "express";
import * as Y from "yjs";
import { prisma } from "../db.js";
import { requireAuth, optionalAuth, AuthenticatedRequest } from "../auth/auth.middleware.js";

type Role = "VIEWER" | "EDITOR" | "OWNER";

const router: Router = Router();

// GET /api/documents - List documents user has access to
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { permissions: { some: { userId } } },
        ],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, color: true, avatar: true },
        },
        permissions: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const formattedDocs = documents.map((doc: any) => {
      let userRole: Role = doc.ownerId === userId ? "OWNER" : "VIEWER";
      if (doc.permissions && doc.permissions.length > 0) {
        userRole = doc.permissions[0].role as Role;
      }
      return {
        id: doc.id,
        title: doc.title,
        icon: doc.icon,
        isPublic: doc.isPublic,
        defaultRole: doc.defaultRole,
        ownerId: doc.ownerId,
        owner: doc.owner,
        userRole,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    });

    res.json({ documents: formattedDocs });
  } catch (error) {
    console.error("List documents error:", error);
    res.status(500).json({ error: "Failed to list documents" });
  }
});

// POST /api/documents - Create a new document
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { title = "Untitled Document", icon = "📝", isPublic = false, defaultRole = "VIEWER" } = req.body;

    const document = await prisma.document.create({
      data: {
        title: title.trim() || "Untitled Document",
        icon: icon || "📝",
        isPublic: Boolean(isPublic),
        defaultRole: (defaultRole as Role) || "VIEWER",
        ownerId: userId,
        permissions: {
          create: {
            userId,
            role: "OWNER",
          },
        },
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, color: true, avatar: true },
        },
      },
    });

    // Initialize initial Y.Doc state snapshot
    const initialDoc = new Y.Doc();
    const fragment = initialDoc.getXmlFragment("default");
    const initialElement = new Y.XmlElement("paragraph");
    fragment.insert(0, [initialElement]);
    const initialText = new Y.XmlText();
    initialElement.insert(0, [initialText]);
    initialText.insert(0, "Start writing or type '/' for commands...");

    const stateUpdate = Buffer.from(Y.encodeStateAsUpdate(initialDoc));
    await prisma.documentSnapshot.create({
      data: {
        documentId: document.id,
        snapshot: stateUpdate,
        version: 1,
        size: stateUpdate.length,
        createdBy: req.user!.name,
      },
    });

    res.status(201).json({
      document: {
        ...document,
        userRole: "OWNER",
      },
    });
  } catch (error) {
    console.error("Create document error:", error);
    res.status(500).json({ error: "Failed to create document" });
  }
});

// GET /api/documents/:id - Get document details
router.get("/:id", optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.userId;

    const document: any = await prisma.document.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, color: true, avatar: true },
        },
        permissions: {
          include: {
            user: {
              select: { id: true, name: true, email: true, color: true, avatar: true },
            },
          },
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    let userRole: Role | "NONE" = "NONE";
    const isAdmin = req.user?.systemRole === "ADMIN";
    if (isAdmin) {
      userRole = "OWNER";
    } else if (userId) {
      if (document.ownerId === userId) {
        userRole = "OWNER";
      } else {
        const perm = document.permissions?.find((p: any) => p.userId === userId);
        if (perm) {
          userRole = perm.role as Role;
        }
      }
    }

    // Check if public access applies
    if (userRole === "NONE") {
      if (document.isPublic) {
        userRole = document.defaultRole as Role;
      } else {
        res.status(403).json({ error: "You do not have access to this document" });
        return;
      }
    }

    res.json({
      document: {
        id: document.id,
        title: document.title,
        icon: document.icon,
        isPublic: document.isPublic,
        defaultRole: document.defaultRole,
        ownerId: document.ownerId,
        owner: document.owner,
        userRole,
        permissions: document.permissions?.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          role: p.role,
          createdAt: p.createdAt,
        })) || [],
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    res.status(500).json({ error: "Failed to get document" });
  }
});

// PATCH /api/documents/:id - Update document settings
router.patch("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;
    const isAdmin = req.user!.systemRole === "ADMIN";
    const { title, icon, isPublic, defaultRole } = req.body;

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

    const isOwner = isAdmin || document.ownerId === userId;
    const isEditor = isAdmin || isOwner || document.permissions?.some((p: any) => p.role === "EDITOR" || p.role === "OWNER");

    if (!isOwner && !isEditor) {
      res.status(403).json({ error: "You do not have permission to edit this document settings" });
      return;
    }

    // Only owner can toggle public status or change default role
    const updateData: { title?: string; icon?: string; isPublic?: boolean; defaultRole?: Role } = {};
    if (title !== undefined) updateData.title = title.trim();
    if (icon !== undefined) updateData.icon = icon;
    if (isOwner && isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
    if (isOwner && defaultRole !== undefined) updateData.defaultRole = defaultRole as Role;

    const updated: any = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, name: true, email: true, color: true, avatar: true },
        },
        permissions: {
          include: {
            user: {
              select: { id: true, name: true, email: true, color: true, avatar: true },
            },
          },
        },
      },
    });

    let userRole: Role = isOwner ? "OWNER" : "EDITOR";
    const perm = updated.permissions?.find((p: any) => p.userId === userId);
    if (!isOwner && perm) {
      userRole = perm.role as Role;
    }

    res.json({
      document: {
        id: updated.id,
        title: updated.title,
        icon: updated.icon,
        isPublic: updated.isPublic,
        defaultRole: updated.defaultRole,
        ownerId: updated.ownerId,
        owner: updated.owner,
        userRole,
        permissions: updated.permissions?.map((p: any) => ({
          id: p.id,
          userId: p.userId,
          user: p.user,
          role: p.role,
          createdAt: p.createdAt,
        })) || [],
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update document error:", error);
    res.status(500).json({ error: "Failed to update document" });
  }
});

// DELETE /api/documents/:id - Delete document (Owner only)
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.ownerId !== userId) {
      res.status(403).json({ error: "Only the document owner can delete this document" });
      return;
    }

    await prisma.document.delete({
      where: { id },
    });

    res.json({ message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete document error:", error);
    res.status(500).json({ error: "Failed to delete document" });
  }
});

// POST /api/documents/:id/permissions - Add or update collaborator
router.post("/:id/permissions", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.userId;
    const { email, role = "VIEWER" } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.ownerId !== userId) {
      res.status(403).json({ error: "Only the document owner can manage permissions" });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!targetUser) {
      res.status(404).json({ error: `User with email ${email} not found` });
      return;
    }

    if (targetUser.id === document.ownerId) {
      res.status(400).json({ error: "The document owner already has full access" });
      return;
    }

    const permission = await prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: targetUser.id,
        },
      },
      update: {
        role: role as Role,
      },
      create: {
        documentId: id,
        userId: targetUser.id,
        role: role as Role,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, color: true, avatar: true },
        },
      },
    });

    res.json({ permission });
  } catch (error) {
    console.error("Add permission error:", error);
    res.status(500).json({ error: "Failed to set permission" });
  }
});

// DELETE /api/documents/:id/permissions/:targetUserId - Remove collaborator
router.delete("/:id/permissions/:targetUserId", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const targetUserId = req.params.targetUserId as string;
    const userId = req.user!.userId;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      res.status(404).json({ error: "Document not found" });
      return;
    }

    if (document.ownerId !== userId) {
      res.status(403).json({ error: "Only the document owner can remove permissions" });
      return;
    }

    await prisma.documentPermission.deleteMany({
      where: {
        documentId: id,
        userId: targetUserId,
      },
    });

    res.json({ message: "Permission removed successfully" });
  } catch (error) {
    console.error("Remove permission error:", error);
    res.status(500).json({ error: "Failed to remove permission" });
  }
});

export default router;
