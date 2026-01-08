import { fabric } from "fabric";
import { useEffect } from "react";

interface UseCanvasEventsProps {
  save: () => void;
  canvas: fabric.Canvas | null;
  setSelectedObjects: (objects: fabric.Object[]) => void;
  clearSelectionCallback?: () => void;
};

export const useCanvasEvents = ({
  save,
  canvas,
  setSelectedObjects,
  clearSelectionCallback,
}: UseCanvasEventsProps) => {
  useEffect(() => {
    if (!canvas) {
      return;
    }

    const handleObjectAdded = () => save();
    const handleObjectRemoved = () => save();
    const handleObjectModified = () => save();

    const handleSelectionCreated = (e: { selected?: fabric.Object[] }) => {
      setSelectedObjects(e.selected || []);
    };

    const handleSelectionUpdated = (e: { selected?: fabric.Object[] }) => {
      setSelectedObjects(e.selected || []);
    };

    const handleSelectionCleared = () => {
      setSelectedObjects([]);
      clearSelectionCallback?.();
    };

    canvas.on("object:added", handleObjectAdded);
    canvas.on("object:removed", handleObjectRemoved);
    canvas.on("object:modified", handleObjectModified);
    canvas.on("selection:created", handleSelectionCreated);
    canvas.on("selection:updated", handleSelectionUpdated);
    canvas.on("selection:cleared", handleSelectionCleared);

    return () => {
      canvas.off("object:added", handleObjectAdded);
      canvas.off("object:removed", handleObjectRemoved);
      canvas.off("object:modified", handleObjectModified);
      canvas.off("selection:created", handleSelectionCreated);
      canvas.off("selection:updated", handleSelectionUpdated);
      canvas.off("selection:cleared", handleSelectionCleared);
    };
  }, [save, canvas, clearSelectionCallback, setSelectedObjects]);
};
