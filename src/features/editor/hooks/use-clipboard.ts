import { fabric } from "fabric";
import { useCallback, useRef } from "react";

interface UseClipboardProps {
  canvas: fabric.Canvas | null;
}

export const useClipboard = ({ canvas }: UseClipboardProps) => {
  const clipboard = useRef<fabric.Object | null>(null);

  const copy = useCallback(() => {
    canvas?.getActiveObject()?.clone((cloned: fabric.Object) => {
      clipboard.current = cloned;
    });
  }, [canvas]);

  const paste = useCallback(() => {
    if (!clipboard.current || !canvas) return;

    clipboard.current.clone((clonedObj: fabric.Object) => {
      canvas.discardActiveObject();
      clonedObj.set({
        left: (clonedObj.left ?? 0) + 10,
        top: (clonedObj.top ?? 0) + 10,
        evented: true,
      });

      if (clonedObj.type === "activeSelection") {
        const selection = clonedObj as fabric.ActiveSelection;
        selection.canvas = canvas;
        selection.forEachObject((obj) => {
          canvas.add(obj);
        });
        selection.setCoords();
      } else {
        canvas.add(clonedObj);
      }

      const current = clipboard.current;
      if (current) {
        current.set({
          left: (current.left ?? 0) + 10,
          top: (current.top ?? 0) + 10,
        });
      }

      canvas.setActiveObject(clonedObj);
      canvas.requestRenderAll();
    });
  }, [canvas]);

  return { copy, paste };
};
