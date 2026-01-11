/// <reference types="bun-types" />

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const globals = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  isReactAct: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
};

let dom: JSDOM | null = null;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", {
    url: "https://app.example",
  });
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb: FrameRequestCallback) => window.setTimeout(() => cb(Date.now()), 0);
  }
  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = (id: number) => window.clearTimeout(id);
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  dom?.window.close();
  dom = null;

  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = globals.isReactAct;
});

describe("CanvasChatPanel upload", () => {
  test("calls onUploadFiles when a file is selected", async () => {
    const { CanvasChatPanel } = await import("../screens/canvas-screen/canvas-chat-panel");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    let uploaded: File[] | null = null;
    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasChatPanel
          desktopOpen
          onDesktopOpenChange={() => {}}
          mobileOpen={false}
          onMobileOpenChange={() => {}}
          hasOutputs={false}
          onUploadFiles={(files) => {
            uploaded = files;
          }}
          onOpenDownloads={() => {}}
          chatSuggestions={[]}
          onPickSuggestion={() => {}}
          clickEditArmed={false}
          onCancelPinEdit={() => {}}
          pinnedContexts={[]}
          onFocusShape={() => {}}
          onRemovePinnedContext={() => {}}
          selectionContext={null}
          recentAttachments={[]}
          messages={[]}
          busy={false}
          desktopEndRef={{ current: null } as any}
          mobileEndRef={{ current: null } as any}
          desktopInputRef={{ current: null } as any}
          mobileInputRef={{ current: null } as any}
          chatInput=""
          onChatInputChange={() => {}}
          onSend={() => {}}
          onDesktopTogglePinEdit={() => {}}
          onMobileTogglePinEdit={() => {}}
          aiProfile="auto"
          onAiProfileChange={() => {}}
          disabled={false}
          boardCrashMessage={null}
          mentionPickerOpen={false}
          onCloseMentionPicker={() => {}}
          onOpenMentionPicker={() => {}}
          onDesktopMentionButtonClick={() => {}}
          onMobileMentionButtonClick={() => {}}
        />,
      );
    });

    const uploadButton = container?.querySelector("button[aria-label=\"Upload files\"]");
    expect(uploadButton).not.toBeNull();

    const input = container?.querySelector("input[type=\"file\"]") as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new window.File(["hello"], "note.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [file] });

    await act(async () => {
      input?.dispatchEvent(new window.Event("change", { bubbles: true }));
    });

    expect(uploaded?.[0]?.name).toBe("note.txt");

    await act(async () => {
      root.unmount();
    });
  });
});

