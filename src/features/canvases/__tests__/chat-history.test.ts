/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { parseCanvasChatMessages, serializeCanvasChatMessages } from "../lib/chat-history";

describe("chat history persistence", () => {
  test("serializes and parses basic messages", () => {
    const json = serializeCanvasChatMessages([
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "hello" },
    ]);

    expect(typeof json).toBe("string");
    const parsed = parseCanvasChatMessages(json);
    expect(parsed).toEqual([
      { id: "1", role: "user", content: "hi" },
      { id: "2", role: "assistant", content: "hello" },
    ]);
  });

  test("drops invalid records and strips HTML attachment payloads", () => {
    const json = JSON.stringify([
      { id: "ok", role: "assistant", content: "done", attachments: [{ id: "a", type: "html", label: "HTML_0001", shapeId: "shape:1", html: "<h1>x</h1>" }] },
      { id: 123, role: "user", content: "bad" },
    ]);

    const parsed = parseCanvasChatMessages(json);
    expect(parsed).toEqual([
      { id: "ok", role: "assistant", content: "done", attachments: [{ id: "a", type: "html", label: "HTML_0001", shapeId: "shape:1" }] },
    ]);
  });
});

