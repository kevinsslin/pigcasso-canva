import { fabric } from "fabric";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  FILL_COLOR,
  FONT_FAMILY,
  JSON_KEYS,
  STROKE_COLOR,
  STROKE_DASH_ARRAY,
  STROKE_WIDTH,
  type EditorHookProps,
} from "@/features/editor/types";
import { useHistory } from "@/features/editor/hooks/use-history";
import { useHotkeys } from "@/features/editor/hooks/use-hotkeys";
import { useClipboard } from "@/features/editor/hooks/use-clipboard";
import { useAutoResize } from "@/features/editor/hooks/use-auto-resize";
import { useCanvasEvents } from "@/features/editor/hooks/use-canvas-events";
import { useLoadState } from "@/features/editor/hooks/use-load-state";
import { normalizeFabricJson } from "@/features/editor/fabric-json";
import { applyCanvaLikeResizeControls } from "@/features/editor/fabric-controls";
import { ALL_CONTROLS_VISIBLE } from "@/features/editor/fabric-object";

import { buildEditor } from "./build-editor";

export const useEditor = ({
  defaultState,
  defaultHeight,
  defaultWidth,
  clearSelectionCallback,
  saveCallback,
}: EditorHookProps) => {
  const initialState = useRef(defaultState);
  const initialWidth = useRef(defaultWidth);
  const initialHeight = useRef(defaultHeight);
  const suppressSaveRef = useRef(false);

  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<fabric.Object[]>([]);

  const [fontFamily, setFontFamily] = useState(FONT_FAMILY);
  const [fillColor, setFillColor] = useState(FILL_COLOR);
  const [strokeColor, setStrokeColor] = useState(STROKE_COLOR);
  const [strokeWidth, setStrokeWidth] = useState(STROKE_WIDTH);
  const [strokeDashArray, setStrokeDashArray] = useState<number[]>(STROKE_DASH_ARRAY);

  const { 
    save, 
    canRedo, 
    canUndo, 
    undo, 
    redo,
    canvasHistory,
    setHistoryIndex,
  } = useHistory({ 
    canvas,
    saveCallback
  });

  const { copy, paste } = useClipboard({ canvas });

  const { autoZoom } = useAutoResize({
    canvas,
    container,
  });

  useCanvasEvents({
    save: () => {
      if (suppressSaveRef.current) return;
      save();
    },
    canvas,
    setSelectedObjects,
    clearSelectionCallback,
  });

  useHotkeys({
    undo,
    redo,
    copy,
    paste,
    save,
    canvas,
  });

  useLoadState({
    canvas,
    autoZoom,
    initialState,
    canvasHistory,
    setHistoryIndex,
    suppressSaveRef,
  });

  const editor = useMemo(() => {
    if (canvas) {
      const base = buildEditor({
        save,
        undo,
        redo,
        canUndo,
        canRedo,
        autoZoom,
        copy,
        paste,
        canvas,
        fillColor,
        strokeWidth,
        strokeColor,
        setFillColor,
        setStrokeColor,
        setStrokeWidth,
        strokeDashArray,
        selectedObjects,
        setStrokeDashArray,
        fontFamily,
        setFontFamily,
      });

      return {
        ...base,
        loadPage: (params: { json: string; width: number; height: number }) => {
          suppressSaveRef.current = true;

          const loadBlank = () => {
            canvas.clear();
            const workspace = new fabric.Rect({
              width: params.width,
              height: params.height,
              name: "clip",
              fill: "white",
              selectable: false,
              hasControls: false,
              evented: false,
              shadow: new fabric.Shadow({
                color: "rgba(0,0,0,0.8)",
                blur: 5,
              }),
            });

            canvas.add(workspace);
            canvas.centerObject(workspace);
            canvas.clipPath = workspace;
            canvas.renderAll();

            const currentState = JSON.stringify(canvas.toJSON(JSON_KEYS));
            canvasHistory.current = [currentState];
            setHistoryIndex(0);
            autoZoom();
            suppressSaveRef.current = false;
          };

          const trimmed = params.json.trim();
          if (!trimmed) {
            loadBlank();
            return;
          }

          let data: unknown;
          try {
            data = normalizeFabricJson(JSON.parse(trimmed));
          } catch {
            loadBlank();
            return;
          }

          canvas.loadFromJSON(data, () => {
            const workspace = canvas
              .getObjects()
              .find((object) => object.name === "clip") as fabric.Rect | undefined;

            if (workspace) {
              workspace.set({
                selectable: false,
                hasControls: false,
                evented: false,
                width: params.width,
                height: params.height,
              });
              workspace.sendToBack();
            }

            const currentState = JSON.stringify(canvas.toJSON(JSON_KEYS));
            canvasHistory.current = [currentState];
            setHistoryIndex(0);
            autoZoom();
            suppressSaveRef.current = false;
          });
        },
      };
    }

    return undefined;
  }, 
  [
    canRedo,
    canUndo,
    undo,
    redo,
    save,
    autoZoom,
    copy,
    paste,
    canvas,
    fillColor,
    strokeWidth,
    strokeColor,
    selectedObjects,
    strokeDashArray,
    fontFamily,
    canvasHistory,
    setHistoryIndex,
  ]);

  const init = useCallback(
    ({
      initialCanvas,
      initialContainer,
    }: {
      initialCanvas: fabric.Canvas;
      initialContainer: HTMLDivElement;
    }) => {
      applyCanvaLikeResizeControls(fabric);
      fabric.Object.prototype.setControlsVisibility(ALL_CONTROLS_VISIBLE);
      fabric.Object.prototype.set({
        cornerColor: "#FFF",
        cornerStyle: "circle",
        cornerSize: 16,
        borderColor: "#3b82f6",
        borderScaleFactor: 1.5,
        transparentCorners: false,
        borderOpacityWhenMoving: 1,
        cornerStrokeColor: "#3b82f6",
        hoverCursor: "move",
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
        lockMovementX: false,
        lockMovementY: false,
      });

      // @ts-expect-error - `touchCornerSize` exists in Fabric runtime but is missing in @types/fabric.
      fabric.Object.prototype.touchCornerSize = 32;

      initialCanvas.targetFindTolerance = 12;

      const initialWorkspace = new fabric.Rect({
        width: initialWidth.current,
        height: initialHeight.current,
        name: "clip",
        fill: "white",
        selectable: false,
        hasControls: false,
        evented: false,
        shadow: new fabric.Shadow({
          color: "rgba(0,0,0,0.8)",
          blur: 5,
        }),
      });

      initialCanvas.setWidth(initialContainer.offsetWidth);
      initialCanvas.setHeight(initialContainer.offsetHeight);

      initialCanvas.add(initialWorkspace);
      initialCanvas.centerObject(initialWorkspace);
      initialCanvas.clipPath = initialWorkspace;

      setCanvas(initialCanvas);
      setContainer(initialContainer);

      const currentState = JSON.stringify(
        initialCanvas.toJSON(JSON_KEYS)
      );
      canvasHistory.current = [currentState];
      setHistoryIndex(0);
    },
    [
      canvasHistory, // No need, this is from useRef
      setHistoryIndex, // No need, this is from useState
    ]
  );

  return { init, editor };
};
