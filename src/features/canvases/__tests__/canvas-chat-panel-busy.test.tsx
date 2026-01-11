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
});

afterEach(() => {
  dom?.window.close();
  dom = null;

  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = globals.isReactAct;
});

describe("CanvasChatPanel", () => {
  test("keeps input enabled while busy", async () => {
    const { CanvasChatPanel } = await import("../screens/canvas-screen/canvas-chat-panel");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasChatPanel
          desktopOpen
          onDesktopOpenChange={() => {}}
          mobileOpen={false}
          onMobileOpenChange={() => {}}
          hasOutputs={false}
          onUploadFiles={() => {}}
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
          messages={[{ id: "1", role: "user", content: "hi" }]}
          busy
          desktopEndRef={{ current: null } as any}
          mobileEndRef={{ current: null } as any}
          desktopInputRef={{ current: null } as any}
          mobileInputRef={{ current: null } as any}
          chatInput="hello"
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

    const textarea = container?.querySelector("textarea") as HTMLTextAreaElement | null;
    expect(textarea).not.toBeNull();
    expect(textarea?.disabled).toBe(false);

    const send = container?.querySelector("button[aria-label=\"Send\"]") as HTMLButtonElement | null;
    expect(send).not.toBeNull();
    expect(send?.disabled).toBe(false);

    expect(container?.textContent).toContain("Thinking");

    await act(async () => {
      root.unmount();
    });
  });
});

