/// <reference types="bun-types" />

import { describe, expect, test } from "bun:test";

import { getCanvasChatSuggestions } from "@/features/canvases/lib/chat-suggestions";

describe("canvas chat suggestions", () => {
  test("returns starter suggestions when chat is empty", () => {
    const suggestions = getCanvasChatSuggestions({ messages: [], selectionContext: null });
    expect(suggestions).toHaveLength(4);
    expect(suggestions.map((s) => s.label)).toEqual(["Design", "Branding", "Illustration", "Website"]);
  });

  test("keeps starter suggestions until the assistant responds", () => {
    const suggestions = getCanvasChatSuggestions({
      messages: [{ role: "user", content: "hi" } as any],
      selectionContext: null,
    });
    expect(suggestions.map((s) => s.label)).toEqual(["Design", "Branding", "Illustration", "Website"]);
  });

  test("returns image next-step suggestions after an image output", () => {
    const suggestions = getCanvasChatSuggestions({
      messages: [
        { role: "user", content: "hi" } as any,
        { role: "assistant", content: "ok", attachments: [{ type: "image" }] } as any,
      ],
      selectionContext: null,
    });

    expect(suggestions).toHaveLength(4);
    expect(suggestions[0]?.label).toBe("Variations");
  });

  test("returns html next-step suggestions after an html output", () => {
    const suggestions = getCanvasChatSuggestions({
      messages: [
        { role: "user", content: "hi" } as any,
        { role: "assistant", content: "ok", attachments: [{ type: "html" }] } as any,
      ],
      selectionContext: null,
    });

    expect(suggestions).toHaveLength(4);
    expect(suggestions[0]?.label).toBe("Mobile");
  });

  test("prioritizes editing when an image is selected", () => {
    const suggestions = getCanvasChatSuggestions({
      messages: [{ role: "user", content: "hi" } as any],
      selectionContext: { shapeId: "shape:a", type: "image", label: "Image" },
    });

    expect(suggestions[0]?.label).toBe("Edit Selected");
    expect(suggestions).toHaveLength(4);
  });
});
