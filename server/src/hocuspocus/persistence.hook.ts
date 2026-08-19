import { onLoadDocumentPayload, onStoreDocumentPayload } from "@hocuspocus/server";
import * as Y from "yjs";
import { prisma } from "../db.js";

export async function onLoadDocumentHook(data: onLoadDocumentPayload): Promise<Y.Doc | Uint8Array | void> {
  const { documentName, document } = data;

  try {
    // 1. Fetch the latest snapshot
    const latestSnapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: documentName },
      orderBy: { version: "desc" },
    });

    if (latestSnapshot && latestSnapshot.snapshot) {
      // Apply snapshot to document
      Y.applyUpdate(document, new Uint8Array(latestSnapshot.snapshot));

      // 2. Fetch incremental update logs after this snapshot
      const updateLogs = await prisma.documentUpdateLog.findMany({
        where: {
          documentId: documentName,
          createdAt: { gt: latestSnapshot.createdAt },
        },
        orderBy: { createdAt: "asc" },
      });

      for (const log of updateLogs) {
        Y.applyUpdate(document, new Uint8Array(log.update));
      }
    } else {
      // Initialize an empty rich text paragraph for new document
      const fragment = document.getXmlFragment("default");
      if (fragment.length === 0) {
        const p = new Y.XmlElement("paragraph");
        const t = new Y.XmlText();
        t.insert(0, "Start writing or type '/' for commands...");
        p.insert(0, [t]);
        fragment.insert(0, [p]);
      }
    }

    return document;
  } catch (error) {
    console.error(`Error loading document ${documentName}:`, error);
    throw error;
  }
}

export async function onStoreDocumentHook(data: onStoreDocumentPayload): Promise<void> {
  const { documentName, document, context } = data;

  try {
    // Encode full Y.Doc state as update
    const stateUpdate = Y.encodeStateAsUpdate(document);
    const updateBuffer = Buffer.from(stateUpdate);

    // Get current latest snapshot
    const latestSnapshot = await prisma.documentSnapshot.findFirst({
      where: { documentId: documentName },
      orderBy: { version: "desc" },
    });

    const newVersion = (latestSnapshot?.version || 0) + 1;
    const authorName = context?.user?.name || "System Autosave";

    // Save compacted snapshot
    const newSnapshot = await prisma.documentSnapshot.create({
      data: {
        documentId: documentName,
        snapshot: updateBuffer,
        version: newVersion,
        size: updateBuffer.length,
        createdBy: authorName,
      },
    });

    // Prune older update logs created prior to this snapshot
    await prisma.documentUpdateLog.deleteMany({
      where: {
        documentId: documentName,
        createdAt: { lte: newSnapshot.createdAt },
      },
    });

    // Update document timestamp
    await prisma.document.update({
      where: { id: documentName },
      data: { updatedAt: new Date() },
    });

    console.log(`[Compaction] Document ${documentName} saved snapshot v${newVersion} (${updateBuffer.length} bytes)`);
  } catch (error) {
    console.error(`Error storing document ${documentName}:`, error);
  }
}
