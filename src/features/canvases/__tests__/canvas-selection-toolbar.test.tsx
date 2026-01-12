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

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const dom = new JSDOM("<!doctype html><html><body><div id=\"root\"></div></body></html>");
  (globalThis as any).window = dom.window as any;
  (globalThis as any).document = dom.window.document as any;
  (globalThis as any).navigator = dom.window.navigator as any;
});

afterEach(() => {
  (globalThis as any).window = globals.window;
  (globalThis as any).document = globals.document;
  (globalThis as any).navigator = globals.navigator;
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
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
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

    const downloadButton = container?.querySelector(
      "button[aria-label=\"Download selected image\"]",
    ) as HTMLButtonElement | null;
    expect(downloadButton).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Regenerate selected image\"]")).not.toBeNull();
    expect(container?.querySelector("button[aria-label=\"Remove background\"]")).not.toBeNull();

    await act(async () => {
      root.unmount();
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
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
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
    expect(container?.querySelector("button[aria-label=\"Edit selected image\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Regenerate selected image\"]")).toBeNull();
    expect(container?.querySelector("button[aria-label=\"Remove background\"]")).toBeNull();

    await act(async () => {
      root.unmount();
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
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
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
    expect(container?.querySelector("button[aria-label=\"Download HTML\"]")).not.toBeNull();

    await act(async () => {
      root.unmount();
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
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
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
    expect(container?.querySelector("button[aria-label=\"Mint NFT\"]")).not.toBeNull();

    await act(async () => {
      root.unmount();
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
          onDownloadSelectedHtml={() => {}}
          onMintNft={() => {}}
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

    await act(async () => {
      root.unmount();
    });
  });
});
