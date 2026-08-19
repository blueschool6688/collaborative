import { describe, it, expect } from "vitest";
import * as Y from "yjs";

describe("CRDT & Yjs Convergence Verification", () => {
  it("should satisfy Commutativity: merging updates in any order yields identical state", () => {
    // Replica 1 & Replica 2 start from empty document
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    // Client A inserts text at position 0
    const textA = docA.getText("content");
    textA.insert(0, "Hello World from Alice! ");
    const updateA = Y.encodeStateAsUpdate(docA);

    // Client B inserts text at position 0 concurrently
    const textB = docB.getText("content");
    textB.insert(0, "Greetings from Bob! ");
    const updateB = Y.encodeStateAsUpdate(docB);

    // Order 1: Doc 1 applies A then B
    const doc1 = new Y.Doc();
    Y.applyUpdate(doc1, updateA);
    Y.applyUpdate(doc1, updateB);

    // Order 2: Doc 2 applies B then A
    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, updateB);
    Y.applyUpdate(doc2, updateA);

    // Both documents must converge to the exact same text string
    const result1 = doc1.getText("content").toString();
    const result2 = doc2.getText("content").toString();

    expect(result1).toBe(result2);
    expect(result1.length).toBeGreaterThan(0);
  });

  it("should satisfy Idempotency: applying the same update multiple times does not corrupt state", () => {
    const docOriginal = new Y.Doc();
    const text = docOriginal.getText("shared");
    text.insert(0, "Deterministic State");
    const update = Y.encodeStateAsUpdate(docOriginal);

    const docTarget = new Y.Doc();
    // Apply update 1st time
    Y.applyUpdate(docTarget, update);
    const firstState = docTarget.getText("shared").toString();

    // Apply exact same update 2nd and 3rd time
    Y.applyUpdate(docTarget, update);
    Y.applyUpdate(docTarget, update);
    const finalState = docTarget.getText("shared").toString();

    expect(finalState).toBe(firstState);
    expect(finalState).toBe("Deterministic State");
  });

  it("should satisfy Associativity: grouping of delta merges does not affect the end result", () => {
    const doc1 = new Y.Doc();
    const doc2 = new Y.Doc();
    const doc3 = new Y.Doc();

    doc1.getText("text").insert(0, "A");
    const u1 = Y.encodeStateAsUpdate(doc1);

    doc2.getText("text").insert(0, "B");
    const u2 = Y.encodeStateAsUpdate(doc2);

    doc3.getText("text").insert(0, "C");
    const u3 = Y.encodeStateAsUpdate(doc3);

    // Grouping (u1 + u2) then + u3
    const merged12 = Y.mergeUpdates([u1, u2]);
    const docLeft = new Y.Doc();
    Y.applyUpdate(docLeft, merged12);
    Y.applyUpdate(docLeft, u3);

    // Grouping u1 + (u2 + u3)
    const merged23 = Y.mergeUpdates([u2, u3]);
    const docRight = new Y.Doc();
    Y.applyUpdate(docRight, u1);
    Y.applyUpdate(docRight, merged23);

    expect(docLeft.getText("text").toString()).toBe(docRight.getText("text").toString());
  });

  it("should correctly handle Rich Text ProseMirror / XmlFragment nodes", () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("default");

    const paragraph = new Y.XmlElement("paragraph");
    const textNode = new Y.XmlText();
    textNode.insert(0, "Rich Text Content");
    paragraph.insert(0, [textNode]);
    fragment.insert(0, [paragraph]);

    const binaryState = Y.encodeStateAsUpdate(doc);

    // Load in new document
    const newDoc = new Y.Doc();
    Y.applyUpdate(newDoc, binaryState);

    const loadedFragment = newDoc.getXmlFragment("default");
    expect(loadedFragment.length).toBe(1);
    expect(loadedFragment.get(0).toString()).toContain("Rich Text Content");
  });
});
