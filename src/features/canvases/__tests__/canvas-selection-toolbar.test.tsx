/// <reference types="bun-types" />

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const globals = {
  window: globalThis.window,
  document: globalThis.document,
  navigator: globalThis.navigator,
  getComputedStyle: (globalThis as any).getComputedStyle,
  MutationObserver: (globalThis as any).MutationObserver,
  Element: (globalThis as any).Element,
  Node: (globalThis as any).Node,
  HTMLElement: (globalThis as any).HTMLElement,
  Event: (globalThis as any).Event,
  KeyboardEvent: (globalThis as any).KeyboardEvent,
  MouseEvent: (globalThis as any).MouseEvent,
  requestAnimationFrame: (globalThis as any).requestAnimationFrame,
  cancelAnimationFrame: (globalThis as any).cancelAnimationFrame,
  isReactAct: (globalThis as any).IS_REACT_ACT_ENVIRONMENT,
};

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>", { pretendToBeVisual: true });
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;
  (globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  (globalThis as any).MutationObserver = dom.window.MutationObserver;
  (globalThis as any).Element = dom.window.Element;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).HTMLElement = dom.window.HTMLElement;
  (globalThis as any).Event = dom.window.Event;
  (globalThis as any).KeyboardEvent = dom.window.KeyboardEvent;
  (globalThis as any).MouseEvent = dom.window.MouseEvent;
  (globalThis as any).requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  (globalThis as any).cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
});

afterEach(() => {
  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
  (globalThis as any).getComputedStyle = globals.getComputedStyle;
  (globalThis as any).MutationObserver = globals.MutationObserver;
  (globalThis as any).Element = globals.Element;
  (globalThis as any).Node = globals.Node;
  (globalThis as any).HTMLElement = globals.HTMLElement;
  (globalThis as any).Event = globals.Event;
  (globalThis as any).KeyboardEvent = globals.KeyboardEvent;
  (globalThis as any).MouseEvent = globals.MouseEvent;
  (globalThis as any).requestAnimationFrame = globals.requestAnimationFrame;
  (globalThis as any).cancelAnimationFrame = globals.cancelAnimationFrame;
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = globals.isReactAct;
});

describe("CanvasSelectionToolbar", () => {
  test("shows download action for images", async () => {
    const { CanvasSelectionToolbar } = await import("../screens/canvas-screen/canvas-selection-toolbar");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasSelectionToolbar
          anchor={{ kind: "image", screenX: 20, screenY: 20, shapeId: "shape:image" }}
          disabled={false}
          onAddToChat={() => {}}
          onDownloadSelected={() => {}}
          onExportSelectionPng={() => {}}
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
          onLaunchPrintr={() => {}}
          onRegenerate={() => {}}
          onRemoveBackground={() => {}}
          onMakeTextEditable={() => {}}
          onViewHtmlCode={() => {}}
          onUngroup={() => {}}
          textStyle={null}
          onUpdateTextStyle={() => {}}
        />,
      );
    });

    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Launch on Printr\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Regenerate selected image\"]")).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Remove background\"]")).not.toBeNull();

    const moreButton = container?.querySelector("button[aria-label=\"More actions\"]") as HTMLButtonElement | null;
    expect(moreButton).not.toBeNull();

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  });

  test("hides image-only actions for text selection", async () => {
    const { CanvasSelectionToolbar } = await import("../screens/canvas-screen/canvas-selection-toolbar");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasSelectionToolbar
          anchor={{ kind: "text", screenX: 20, screenY: 20, shapeId: "shape:text" }}
          disabled={false}
          onAddToChat={() => {}}
          onDownloadSelected={() => {}}
          onExportSelectionPng={() => {}}
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
          onLaunchPrintr={() => {}}
          onRegenerate={() => {}}
          onRemoveBackground={() => {}}
          onMakeTextEditable={() => {}}
          onViewHtmlCode={() => {}}
          onUngroup={() => {}}
          textStyle={{ font: "sans", size: "m", color: "black", sizePx: 24, fontFamily: null }}
          onUpdateTextStyle={() => {}}
        />,
      );
    });

    expect(container?.querySelector("button[aria-label=\"Download selected image\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Launch on Printr\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Regenerate selected image\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Remove background\"]")).toBeNull();

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  });

  test("shows code actions for HTML selections", async () => {
    const { CanvasSelectionToolbar } = await import("../screens/canvas-screen/canvas-selection-toolbar");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasSelectionToolbar
          anchor={{ kind: "html", screenX: 20, screenY: 20, shapeId: "shape:html" }}
          disabled={false}
          onAddToChat={() => {}}
          onDownloadSelected={() => {}}
          onExportSelectionPng={() => {}}
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
          onLaunchPrintr={() => {}}
          onRegenerate={() => {}}
          onRemoveBackground={() => {}}
          onMakeTextEditable={() => {}}
          onViewHtmlCode={() => {}}
          onUngroup={() => {}}
          textStyle={null}
          onUpdateTextStyle={() => {}}
        />,
      );
    });

    expect(container?.querySelector("button[aria-label=\"View HTML code\"]")).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Download HTML\"]")).toBeNull();

    const moreButton = container?.querySelector("button[aria-label=\"More actions\"]") as HTMLButtonElement | null;
    expect(moreButton).not.toBeNull();

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  });

  test("shows mint action for group selections when enabled", async () => {
    const { CanvasSelectionToolbar } = await import("../screens/canvas-screen/canvas-selection-toolbar");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasSelectionToolbar
          anchor={{ kind: "group", screenX: 20, screenY: 20, shapeId: "shape:group" }}
          disabled={false}
          onAddToChat={() => {}}
          onDownloadSelected={() => {}}
          onExportSelectionPng={() => {}}
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
          onLaunchPrintr={() => {}}
          showMintNft
          onRegenerate={() => {}}
          onRemoveBackground={() => {}}
          onMakeTextEditable={() => {}}
          onViewHtmlCode={() => {}}
          onUngroup={() => {}}
          textStyle={null}
          onUpdateTextStyle={() => {}}
        />,
      );
    });

    expect(container?.querySelector("button[aria-label=\"Ungroup selection\"]")).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Launch on Printr\"]")).toBeNull();

    const moreButton = container?.querySelector("button[aria-label=\"More actions\"]") as HTMLButtonElement | null;
    expect(moreButton).not.toBeNull();

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  });

  test("hides mint action for group selections when disabled", async () => {
    const { CanvasSelectionToolbar } = await import("../screens/canvas-screen/canvas-selection-toolbar");
    const { createRoot } = await import("react-dom/client");

    const container = document.getElementById("root");
    expect(container).not.toBeNull();

    const root = createRoot(container as HTMLElement);

    await act(async () => {
      root.render(
        <CanvasSelectionToolbar
          anchor={{ kind: "group", screenX: 20, screenY: 20, shapeId: "shape:group" }}
          disabled={false}
          onAddToChat={() => {}}
          onDownloadSelected={() => {}}
          onExportSelectionPng={() => {}}
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
          onLaunchPrintr={() => {}}
          showMintNft={false}
          onRegenerate={() => {}}
          onRemoveBackground={() => {}}
          onMakeTextEditable={() => {}}
          onViewHtmlCode={() => {}}
          onUngroup={() => {}}
          textStyle={null}
          onUpdateTextStyle={() => {}}
        />,
      );
    });

    expect(container?.querySelector("button[aria-label=\"Ungroup selection\"]")).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Launch on Printr\"]")).toBeNull();

    const moreButton = container?.querySelector("button[aria-label=\"More actions\"]") as HTMLButtonElement | null;
    expect(moreButton).not.toBeNull();

    await act(async () => {
      root.unmount();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
    });
  });
});
