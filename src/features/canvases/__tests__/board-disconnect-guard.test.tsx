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
    window.requestAnimationFrame = (cb: FrameRequestCallback) =>
      window.setTimeout(() => cb(Date.now()), 0);
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

describe("useBoardDisconnectGuard", () => {
  test("fires onDisconnect when editor becomes null after hydration", async () => {
    const { useBoardDisconnectGuard } = await import("../hooks/use-board-disconnect-guard");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    let disconnected = 0;

    const Harness = ({
      editor,
      boardHydrated,
      boardCrashMessage,
      hasMountedEditor,
      remounting,
    }: {
      editor: unknown | null;
      boardHydrated: boolean;
      boardCrashMessage: string | null;
      hasMountedEditor: boolean;
      remounting: boolean;
    }) => {
      useBoardDisconnectGuard({
        editor,
        boardHydrated,
        boardCrashMessage,
        hasMountedEditor,
        remounting,
        delayMs: 0,
        onDisconnect: () => {
          disconnected += 1;
        },
      });
      return null;
    };

    await act(async () => {
      root.render(
        <Harness
          editor={{}}
          boardHydrated
          boardCrashMessage={null}
          hasMountedEditor
          remounting={false}
        />,
      );
    });

    await act(async () => {
      root.render(
        <Harness
          editor={null}
          boardHydrated
          boardCrashMessage={null}
          hasMountedEditor
          remounting={false}
        />,
      );
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(disconnected).toBe(1);

    await act(async () => {
      root.unmount();
    });
  });

  test("does not fire while remounting", async () => {
    const { useBoardDisconnectGuard } = await import("../hooks/use-board-disconnect-guard");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    let disconnected = 0;

    const Harness = ({ remounting }: { remounting: boolean }) => {
      useBoardDisconnectGuard({
        editor: null,
        boardHydrated: true,
        boardCrashMessage: null,
        hasMountedEditor: true,
        remounting,
        delayMs: 0,
        onDisconnect: () => {
          disconnected += 1;
        },
      });
      return null;
    };

    await act(async () => {
      root.render(<Harness remounting />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(disconnected).toBe(0);

    await act(async () => {
      root.unmount();
    });
  });

  test("does not fire when disabled", async () => {
    const { useBoardDisconnectGuard } = await import("../hooks/use-board-disconnect-guard");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    let disconnected = 0;

    const Harness = () => {
      useBoardDisconnectGuard({
        enabled: false,
        editor: null,
        boardHydrated: true,
        boardCrashMessage: null,
        hasMountedEditor: true,
        remounting: false,
        delayMs: 0,
        onDisconnect: () => {
          disconnected += 1;
        },
      });
      return null;
    };

    await act(async () => {
      root.render(<Harness />);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(disconnected).toBe(0);

    await act(async () => {
      root.unmount();
    });
  });
});
