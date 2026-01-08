"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ImageIcon, Layers, Shapes, Type } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSwappingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { ActiveTool, Editor } from "@/features/editor/types";
import {
  applyLayerOrderToCanvas,
  ensureUniqueLayerIds,
  getLayerId,
  swapLayerIds,
} from "@/features/editor/layers-dnd";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type LayersSidebarProps = {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

const getLayerLabel = (object: { type?: string; name?: string | null }) => {
  const name = object.name?.trim();
  if (name && name !== "clip") return name;

  const type = object.type ?? "object";
  if (type === "textbox" || type === "i-text" || type === "text") return "Text";
  if (type === "image") return "Image";
  return "Shape";
};

const getLayerIcon = (type: string | undefined) => {
  if (type === "textbox" || type === "i-text" || type === "text") return Type;
  if (type === "image") return ImageIcon;
  return Shapes;
};

type LayerRow = {
  id: string;
  label: string;
  icon: typeof Type;
  object: NonNullable<Editor>["selectedObjects"][number];
};

const SortableLayerButton = ({
  layer,
  selected,
  onSelect,
}: {
  layer: LayerRow;
  selected: boolean;
  onSelect: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: layer.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Icon = layer.icon;

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onClick={() => {
        if (isDragging) return;
        onSelect();
      }}
      className={cn(
        "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition touch-none",
        selected ? "bg-muted border-border" : "bg-background hover:bg-muted",
        isDragging && "opacity-60 cursor-grabbing",
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{layer.label}</div>
        <div className="text-[11px] text-muted-foreground truncate">
          {layer.object.type ?? "object"}
        </div>
      </div>
      <div className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground">
        <Layers className="size-4" />
      </div>
    </button>
  );
};

export const LayersSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: LayersSidebarProps) => {
  const [version, setVersion] = useState(0);
  const [order, setOrder] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const orderRef = useRef<string[]>([]);
  const dragStartOrderRef = useRef<string[] | null>(null);

  const canvas = editor?.canvas;

  useEffect(() => {
    if (!canvas) return;

    const bump = () => setVersion((v) => v + 1);

    canvas.on("object:added", bump);
    canvas.on("object:removed", bump);
    canvas.on("object:modified", bump);
    canvas.on("selection:created", bump);
    canvas.on("selection:updated", bump);
    canvas.on("selection:cleared", bump);

    return () => {
      canvas.off("object:added", bump);
      canvas.off("object:removed", bump);
      canvas.off("object:modified", bump);
      canvas.off("selection:created", bump);
      canvas.off("selection:updated", bump);
      canvas.off("selection:cleared", bump);
    };
  }, [canvas]);

  const layers = useMemo(() => {
    if (!canvas) return [];
    void version;

    const objects = canvas.getObjects().filter((obj) => obj.name !== "clip");
    ensureUniqueLayerIds(objects);

    const next = objects
      .slice()
      .reverse()
      .map((obj) => ({
        id: getLayerId(obj),
        object: obj,
        label: getLayerLabel(obj),
        icon: getLayerIcon(obj.type),
      })) satisfies LayerRow[];

    return next;
  }, [canvas, version]);

  const layersById = useMemo(() => {
    const map = new Map<string, LayerRow>();
    layers.forEach((layer) => map.set(layer.id, layer));
    return map;
  }, [layers]);

  const orderedLayers = useMemo(() => {
    if (order.length === 0) {
      return layers;
    }

    const next = order
      .map((id) => layersById.get(id))
      .filter((layer): layer is LayerRow => Boolean(layer));

    return next.length ? next : layers;
  }, [layers, layersById, order]);

  useEffect(() => {
    if (activeId) return;
    const next = layers.map((layer) => layer.id);
    orderRef.current = next;
    setOrder(next);
  }, [activeId, layers]);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    dragStartOrderRef.current = orderRef.current;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeKey = String(active.id);
    const overKey = String(over.id);
    if (activeKey === overKey) return;

    setOrder((current) => {
      const next = swapLayerIds(current, activeKey, overKey);
      if (next === current) return current;
      orderRef.current = next;
      return next;
    });
  };

  const hasOrderChanged = (a: string[] | null, b: string[]) => {
    if (!a) return false;
    if (a.length !== b.length) return true;
    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) return true;
    }
    return false;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeKey = String(active.id);
    setActiveId(null);

    const startOrder = dragStartOrderRef.current;
    dragStartOrderRef.current = null;

    if (!over) return;
    const overKey = String(over.id);
    if (activeKey === overKey) return;

    const finalOrder = orderRef.current.length ? orderRef.current : order;
    if (!canvas) return;
    if (!hasOrderChanged(startOrder, finalOrder)) return;
    applyLayerOrderToCanvas(canvas, finalOrder, { activeId: activeKey });
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "layers" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Layers"
        description="Drag to reorder. Items swap when they touch."
      />

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {layers.length === 0 ? (
            <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
              No objects yet. Add text, shapes, or images to see layers here.
            </div>
          ) : null}

          {layers.length ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={() => {
                setActiveId(null);
                const startOrder = dragStartOrderRef.current;
                dragStartOrderRef.current = null;
                if (!startOrder) return;
                orderRef.current = startOrder;
                setOrder(startOrder);
              }}
            >
              <SortableContext
                items={order.length ? order : layers.map((l) => l.id)}
                strategy={rectSwappingStrategy}
              >
                {orderedLayers.map((layer) => (
                  <SortableLayerButton
                    key={layer.id}
                    layer={layer}
                    selected={editor?.selectedObjects?.includes(layer.object) ?? false}
                    onSelect={() => {
                      if (!canvas) return;
                      canvas.setActiveObject(layer.object);
                      canvas.requestRenderAll();
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          ) : null}
        </div>
      </ScrollArea>

      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
