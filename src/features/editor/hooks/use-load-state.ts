import { fabric } from "fabric";
import { useEffect, useRef } from "react";

import { JSON_KEYS } from "@/features/editor/types";
import { normalizeFabricJson } from "@/features/editor/fabric-json";

interface UseLoadStateProps {
  autoZoom: () => void;
  canvas: fabric.Canvas | null;
  initialState: React.MutableRefObject<string | undefined>;
  canvasHistory: React.MutableRefObject<string[]>;
  setHistoryIndex: React.Dispatch<React.SetStateAction<number>>;
  suppressSaveRef: React.MutableRefObject<boolean>;
};

export const useLoadState = ({
  canvas,
  autoZoom,
  initialState,
  canvasHistory,
  setHistoryIndex,
  suppressSaveRef,
}: UseLoadStateProps) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current && initialState?.current && canvas) {
      const data = normalizeFabricJson(JSON.parse(initialState.current));

      suppressSaveRef.current = true;
      canvas.loadFromJSON(data, () => {
        const workspace = canvas
          .getObjects()
          .find((object) => object.name === "clip") as fabric.Rect | undefined;
        if (workspace) {
          workspace.set({
            selectable: false,
            hasControls: false,
            evented: false,
          });
          workspace.sendToBack();
        }

        const currentState = JSON.stringify(
          canvas.toJSON(JSON_KEYS),
        );

        canvasHistory.current = [currentState];
        setHistoryIndex(0);
        autoZoom();
        suppressSaveRef.current = false;
      });
      initialized.current = true;
    }
  }, 
  [
    canvas,
    autoZoom,
    initialState, // no need, this is a ref
    canvasHistory, // no need, this is a ref
    setHistoryIndex, // no need, this is a dispatch
    suppressSaveRef,
  ]);
};
