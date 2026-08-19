import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("Offline-First & Reconnection CRDT Reconciliation Test Suite", () => {
  it("Scenario 1: Single client edits offline and cleanly syncs to server upon reconnect", () => {
    // 1. Initial shared document state
    const serverDoc = new Y.Doc();
    const serverText = serverDoc.getText("content");
    serverText.insert(0, "Initial Document Title\n");

    // Client A initializes and receives initial server state
    const clientADoc = new Y.Doc();
    const initialServerUpdate = Y.encodeStateAsUpdate(serverDoc);
    Y.applyUpdate(clientADoc, initialServerUpdate);

    expect(clientADoc.getText("content").toString()).toBe("Initial Document Title\n");

    // 2. DISCONNECT: Client A goes OFFLINE (simulating no internet/IndexedDB standalone edits)
    const clientAText = clientADoc.getText("content");
    clientAText.insert(clientAText.length, "Section written while offline on airplane.\n");
    clientAText.insert(clientAText.length, "- Offline task item 1\n");

    // 3. RECONNECT: State Vector Exchange
    // Client A sends its state vector to server
    const clientAVector = Y.encodeStateVector(clientADoc);
    // Server computes missing updates for Client A (in this case 0 since server had no new edits)
    const serverDiff = Y.encodeStateAsUpdate(serverDoc, clientAVector);

    // Server requests updates from Client A using server's state vector
    const serverVector = Y.encodeStateVector(serverDoc);
    const clientADiff = Y.encodeStateAsUpdate(clientADoc, serverVector);

    // 4. Apply 2-way delta updates
    Y.applyUpdate(clientADoc, serverDiff);
    Y.applyUpdate(serverDoc, clientADiff);

    // 5. Assert 100% Convergence
    const finalClientText = clientADoc.getText("content").toString();
    const finalServerText = serverDoc.getText("content").toString();

    expect(finalClientText).toBe(finalServerText);
    expect(finalServerText).toContain("Section written while offline on airplane.");
  });

  it("Scenario 2: Concurrent edits while Client A is offline and Client B is online", () => {
    // Shared starting point
    const serverDoc = new Y.Doc();
    const serverText = serverDoc.getText("content");
    serverText.insert(0, "Header Line\n");

    // Client A and Client B both sync initial state
    const clientADoc = new Y.Doc();
    const clientBDoc = new Y.Doc();
    const initialUpdate = Y.encodeStateAsUpdate(serverDoc);
    Y.applyUpdate(clientADoc, initialUpdate);
    Y.applyUpdate(clientBDoc, initialUpdate);

    // --- NETWORK PARTITION OCCURS ---
    // Client A goes OFFLINE and edits at the bottom
    const textA = clientADoc.getText("content");
    textA.insert(textA.length, "[Client A offline note]\n");

    // Client B stays ONLINE and edits concurrently at the top
    const textB = clientBDoc.getText("content");
    textB.insert(0, "[Client B announcement]\n");
    // Client B's update reaches Server
    const bUpdate = Y.encodeStateAsUpdate(clientBDoc, Y.encodeStateVector(serverDoc));
    Y.applyUpdate(serverDoc, bUpdate);

    // --- RECONNECT & RECONCILE ---
    // Client A reconnects and exchanges State Vectors with Server
    const stateVectorA = Y.encodeStateVector(clientADoc);
    const stateVectorServer = Y.encodeStateVector(serverDoc);

    const missingOnServer = Y.encodeStateAsUpdate(clientADoc, stateVectorServer);
    const missingOnClientA = Y.encodeStateAsUpdate(serverDoc, stateVectorA);

    // Apply bi-directional updates
    Y.applyUpdate(serverDoc, missingOnServer);
    Y.applyUpdate(clientADoc, missingOnClientA);

    // Client B receives the merged server updates as well
    const stateVectorB = Y.encodeStateVector(clientBDoc);
    const missingOnClientB = Y.encodeStateAsUpdate(serverDoc, stateVectorB);
    Y.applyUpdate(clientBDoc, missingOnClientB);

    // Assert mathematical convergence across all 3 nodes
    const strServer = serverDoc.getText("content").toString();
    const strA = clientADoc.getText("content").toString();
    const strB = clientBDoc.getText("content").toString();

    expect(strServer).toBe(strA);
    expect(strServer).toBe(strB);
    expect(strServer).toContain("[Client B announcement]");
    expect(strServer).toContain("[Client A offline note]");
  });

  it("Scenario 3: Repeated reconnect retries (Idempotency verification)", () => {
    const doc1 = new Y.Doc();
    doc1.getText("text").insert(0, "Idempotent Offline Packet");

    const doc2 = new Y.Doc();
    const update = Y.encodeStateAsUpdate(doc1);

    // Apply update 5 times as if flaky network retried multiple times
    for (let i = 0; i < 5; i++) {
      Y.applyUpdate(doc2, update);
    }

    expect(doc2.getText("text").toString()).toBe("Idempotent Offline Packet");
  });
});
