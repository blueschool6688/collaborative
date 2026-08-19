import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as Y from "yjs";

const prisma = new PrismaClient();

// Helper to create ProseMirror / TipTap compliant Y.Doc XML fragments cleanly
function createRichDocumentYDoc(content: {
  title: string;
  blocks: Array<
    | { type: "heading"; level: number; text: string }
    | { type: "paragraph"; text: string }
    | { type: "codeBlock"; language?: string; text: string }
    | { type: "blockquote"; text: string }
    | { type: "taskList"; items: Array<{ text: string; checked: boolean }> }
    | { type: "bulletList"; items: string[] }
  >;
}): Buffer {
  const ydoc = new Y.Doc();
  const fragment = ydoc.getXmlFragment("default");

  // Title / Heading 1
  const h1 = new Y.XmlElement("heading");
  h1.setAttribute("level", 1);
  fragment.insert(fragment.length, [h1]);
  const h1Text = new Y.XmlText();
  h1.insert(0, [h1Text]);
  h1Text.insert(0, content.title);

  for (const block of content.blocks) {
    if (block.type === "heading") {
      const el = new Y.XmlElement("heading");
      el.setAttribute("level", block.level);
      fragment.insert(fragment.length, [el]);
      const text = new Y.XmlText();
      el.insert(0, [text]);
      text.insert(0, block.text);
    } else if (block.type === "paragraph") {
      const el = new Y.XmlElement("paragraph");
      fragment.insert(fragment.length, [el]);
      const text = new Y.XmlText();
      el.insert(0, [text]);
      text.insert(0, block.text);
    } else if (block.type === "blockquote") {
      const el = new Y.XmlElement("blockquote");
      fragment.insert(fragment.length, [el]);
      const p = new Y.XmlElement("paragraph");
      el.insert(0, [p]);
      const text = new Y.XmlText();
      p.insert(0, [text]);
      text.insert(0, block.text);
    } else if (block.type === "codeBlock") {
      const el = new Y.XmlElement("codeBlock");
      if (block.language) el.setAttribute("language", block.language);
      fragment.insert(fragment.length, [el]);
      const text = new Y.XmlText();
      el.insert(0, [text]);
      text.insert(0, block.text);
    } else if (block.type === "taskList") {
      const list = new Y.XmlElement("taskList");
      fragment.insert(fragment.length, [list]);
      for (const item of block.items) {
        const taskItem = new Y.XmlElement("taskItem");
        taskItem.setAttribute("checked", item.checked);
        list.insert(list.length, [taskItem]);
        const p = new Y.XmlElement("paragraph");
        taskItem.insert(0, [p]);
        const text = new Y.XmlText();
        p.insert(0, [text]);
        text.insert(0, item.text);
      }
    } else if (block.type === "bulletList") {
      const list = new Y.XmlElement("bulletList");
      fragment.insert(fragment.length, [list]);
      for (const item of block.items) {
        const listItem = new Y.XmlElement("listItem");
        list.insert(list.length, [listItem]);
        const p = new Y.XmlElement("paragraph");
        listItem.insert(0, [p]);
        const text = new Y.XmlText();
        p.insert(0, [text]);
        text.insert(0, item);
      }
    }
  }

  const uint8 = Y.encodeStateAsUpdate(ydoc);
  return Buffer.from(uint8);
}

async function main() {
  console.log("🌱 Starting Database Seeder...");

  // Clean existing tables in proper relational order
  await prisma.documentUpdateLog.deleteMany({});
  await prisma.documentSnapshot.deleteMany({});
  await prisma.documentPermission.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.user.deleteMany({});

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash("password123", salt);

  // 1. Create Seed Users
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      name: "Alice Chen",
      passwordHash: commonPasswordHash,
      color: "#6366f1", // Electric Indigo
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      name: "Bob Martinez",
      passwordHash: commonPasswordHash,
      color: "#10b981", // Emerald
    },
  });

  const charlie = await prisma.user.create({
    data: {
      email: "charlie@example.com",
      name: "Charlie Davis",
      passwordHash: commonPasswordHash,
      color: "#f59e0b", // Amber
    },
  });

  const diana = await prisma.user.create({
    data: {
      email: "diana@example.com",
      name: "Diana Ross",
      passwordHash: commonPasswordHash,
      color: "#ec4899", // Pink
    },
  });

  console.log(`✅ Created 4 Users: Alice, Bob, Charlie, Diana (Password: password123)`);

  // 2. Create Document 1: Distributed Systems Spec (Owner: Alice)
  const doc1Content = {
    title: "⚡ Architecture & Distributed Systems Spec",
    blocks: [
      {
        type: "paragraph" as const,
        text: "This document outlines the distributed CRDT architecture, state vector synchronization, and Hocuspocus persistence engine powering SyncCraft.",
      },
      {
        type: "heading" as const,
        level: 2,
        text: "1. Strong Eventual Consistency (SEC)",
      },
      {
        type: "paragraph" as const,
        text: "By utilizing the YATA (Yjs) algorithm, operations on rich text sequences satisfy Commutative, Associative, and Idempotent properties. Concurrent edits always converge to identical text states without central locking.",
      },
      {
        type: "blockquote" as const,
        text: "CAP Theorem Choice: Availability + Partition Tolerance (AP) with <10ms local optimistic UI execution and background state vector reconciliation.",
      },
      {
        type: "heading" as const,
        level: 2,
        text: "2. Key Implementation Checkpoints",
      },
      {
        type: "taskList" as const,
        items: [
          { text: "PostgreSQL Write-Behind Compaction (3s debounce)", checked: true },
          { text: "Redis Pub/Sub Multi-Instance Synchronizer", checked: true },
          { text: "Y.IndexedDB Local Offline Cache", checked: true },
          { text: "Live Awareness Cursor Presence & Selection Highlight", checked: true },
          { text: "Dynamic Time-Travel Version History Restoration", checked: true },
        ],
      },
      {
        type: "heading" as const,
        level: 2,
        text: "3. CRDT State Vector Exchange Code",
      },
      {
        type: "codeBlock" as const,
        language: "typescript",
        text: `// State Vector reconciliation between Client and Server\nconst clientSV = Y.encodeStateVector(localYDoc);\nconst serverDiff = Y.encodeStateAsUpdate(serverYDoc, clientSV);\nY.applyUpdate(localYDoc, serverDiff);`,
      },
    ],
  };

  const doc1Snapshot = createRichDocumentYDoc(doc1Content);

  const doc1 = await prisma.document.create({
    data: {
      title: doc1Content.title,
      icon: "⚡",
      isPublic: true,
      defaultRole: "EDITOR",
      ownerId: alice.id,
      permissions: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "EDITOR" },
          { userId: charlie.id, role: "VIEWER" },
          { userId: diana.id, role: "EDITOR" },
        ],
      },
      snapshots: {
        create: [
          {
            snapshot: doc1Snapshot,
            version: 1,
            size: doc1Snapshot.length,
            createdBy: "Alice Chen (Initial Creation)",
            createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          },
          {
            snapshot: doc1Snapshot,
            version: 2,
            size: doc1Snapshot.length,
            createdBy: "Bob Martinez (Added Checklist)",
            createdAt: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
          },
        ],
      },
    },
  });

  // 3. Create Document 2: Product Roadmap 2026 (Owner: Bob)
  const doc2Content = {
    title: "📋 Product Roadmap & Team Milestones 2026",
    blocks: [
      {
        type: "paragraph" as const,
        text: "Quarterly initiatives and milestone tracking for collaborative rich-text engineering teams.",
      },
      {
        type: "heading" as const,
        level: 2,
        text: "🎯 Q3 Key Deliverables",
      },
      {
        type: "taskList" as const,
        items: [
          { text: "Launch TipTap v2 Slash Command Block Menu (/) with full keyboard navigation", checked: true },
          { text: "Deploy Hocuspocus WebSocket Compaction on PostgreSQL", checked: true },
          { text: "Implement 1-Click Version History Rollback", checked: true },
          { text: "Conduct multi-peer latency benchmarks under network partitions", checked: false },
        ],
      },
      {
        type: "heading" as const,
        level: 2,
        text: "👥 Team Allocation",
      },
      {
        type: "bulletList" as const,
        items: [
          "Alice: Backend WebSocket Clustering & Redis Pub/Sub",
          "Bob: Product Specs & Permission Governance",
          "Charlie: Design System & Mobile Responsive Refinement",
          "Diana: Automated Convergence Simulation Suite",
        ],
      },
    ],
  };

  const doc2Snapshot = createRichDocumentYDoc(doc2Content);

  const doc2 = await prisma.document.create({
    data: {
      title: doc2Content.title,
      icon: "📋",
      isPublic: true,
      defaultRole: "EDITOR",
      ownerId: bob.id,
      permissions: {
        create: [
          { userId: bob.id, role: "OWNER" },
          { userId: alice.id, role: "EDITOR" },
          { userId: charlie.id, role: "EDITOR" },
        ],
      },
      snapshots: {
        create: [
          {
            snapshot: doc2Snapshot,
            version: 1,
            size: doc2Snapshot.length,
            createdBy: "Bob Martinez",
            createdAt: new Date(Date.now() - 1000 * 60 * 45),
          },
        ],
      },
    },
  });

  // 4. Create Document 3: Design System & Tokens (Owner: Charlie)
  const doc3Content = {
    title: "🎨 Design System & Visual Hierarchy",
    blocks: [
      {
        type: "paragraph" as const,
        text: "Anti-slop design specifications for the SyncCraft editor workspace following the design-taste-frontend philosophy.",
      },
      {
        type: "heading" as const,
        level: 2,
        text: "1. Core Philosophy",
      },
      {
        type: "paragraph" as const,
        text: "Restrained zinc neutrals, crisp single electric indigo accents (#6366f1), and tactile micro-physics with spring animations (stiffness: 280, damping: 24).",
      },
      {
        type: "blockquote" as const,
        text: "No generic AI purple blobs. No card walls without purpose. Full viewport stability with min-h-[100dvh].",
      },
      {
        type: "heading" as const,
        level: 2,
        text: "2. Color Palettes",
      },
      {
        type: "bulletList" as const,
        items: [
          "Dark Base: #09090b (zinc-950) with #18181b cards",
          "Light Base: #ffffff with #f4f4f5 secondary surfaces",
          "Brand Accent: #6366f1 (Indigo-500) and #4f46e5 (Indigo-600)",
          "Presence Tags: Distinct pastels per client session",
        ],
      },
    ],
  };

  const doc3Snapshot = createRichDocumentYDoc(doc3Content);

  const doc3 = await prisma.document.create({
    data: {
      title: doc3Content.title,
      icon: "🎨",
      isPublic: false,
      defaultRole: "VIEWER",
      ownerId: charlie.id,
      permissions: {
        create: [
          { userId: charlie.id, role: "OWNER" },
          { userId: alice.id, role: "EDITOR" },
          { userId: bob.id, role: "VIEWER" },
        ],
      },
      snapshots: {
        create: [
          {
            snapshot: doc3Snapshot,
            version: 1,
            size: doc3Snapshot.length,
            createdBy: "Charlie Davis",
            createdAt: new Date(Date.now() - 1000 * 60 * 30),
          },
        ],
      },
    },
  });

  console.log(`✅ Created 3 Documents with rich CRDT Yjs data & snapshots:`);
  console.log(`   - "${doc1.title}" (ID: ${doc1.id})`);
  console.log(`   - "${doc2.title}" (ID: ${doc2.id})`);
  console.log(`   - "${doc3.title}" (ID: ${doc3.id})`);
  console.log("🚀 Database Seeding Complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
