import { onAuthenticatePayload } from "@hocuspocus/server";
import { verifyToken } from "../auth/jwt.js";
import { prisma } from "../db.js";

export type Role = "VIEWER" | "EDITOR" | "OWNER";

export async function onAuthenticateHook(data: onAuthenticatePayload) {
  const { token, documentName, connection } = data;

  if (!documentName) {
    throw new Error("Missing documentName");
  }

  // Look up the document in the database
  const document = await prisma.document.findUnique({
    where: { id: documentName },
    include: {
      permissions: true,
    },
  });

  if (!document) {
    throw new Error(`Document ${documentName} not found`);
  }

  // If token is provided, verify it
  let user: { id: string; name: string; email: string; color: string; avatar?: string | null } | null = null;
  let userRole: Role | "NONE" = "NONE";

  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, email: true, color: true, avatar: true, systemRole: true },
      });

      if (dbUser) {
        user = dbUser;
        if (dbUser.systemRole === "ADMIN" || document.ownerId === dbUser.id) {
          userRole = "OWNER";
        } else {
          const userPerm = document.permissions.find((p: any) => p.userId === dbUser.id);
          if (userPerm) {
            userRole = userPerm.role as Role;
          }
        }
      }
    }
  }

  // If user has no explicit permission, check if the document is public
  if (userRole === "NONE") {
    if (document.isPublic) {
      userRole = document.defaultRole as Role;
      if (!user) {
        // Create an anonymous guest user representation
        const guestId = `guest_${Math.random().toString(36).substring(2, 8)}`;
        user = {
          id: guestId,
          name: `Guest ${guestId.slice(-4)}`,
          email: `${guestId}@anonymous.local`,
          color: "#94a3b8",
        };
      }
    } else {
      throw new Error("Unauthorized: You do not have access to this document");
    }
  }

  // Set readOnly if the role is VIEWER
  const isReadOnly = userRole === "VIEWER";
  connection.readOnly = isReadOnly;

  const finalUser = user || {
    id: `guest_${Math.random().toString(36).substring(2, 8)}`,
    name: "Guest",
    email: "guest@anonymous.local",
    color: "#94a3b8",
  };

  return {
    user: {
      id: finalUser.id,
      name: finalUser.name,
      email: finalUser.email,
      color: finalUser.color,
      avatar: finalUser.avatar,
    },
    role: userRole,
    readOnly: isReadOnly,
  };
}
