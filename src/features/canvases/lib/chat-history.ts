import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";

const MAX_MESSAGES = 300;

const isString = (value: unknown): value is string => typeof value === "string";

const isDefined = <T>(value: T | null | undefined): value is T => value != null;

const normalizeAttachment = (value: unknown): CanvasChatAttachment | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as any;
  if (!isString(raw.id) || !isString(raw.type) || !isString(raw.label) || !isString(raw.shapeId)) return null;
  if (raw.type !== "image" && raw.type !== "html") return null;

  const attachment: CanvasChatAttachment = {
    id: raw.id,
    type: raw.type,
    label: raw.label,
    shapeId: raw.shapeId,
  };

  if (raw.type === "image" && isString(raw.url)) {
    attachment.url = raw.url;
  }

  // Do not persist full HTML source in chat history; it lives on the canvas shape.
  return attachment;
};

const normalizeMessage = (value: unknown): CanvasChatMessage | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as any;
  if (!isString(raw.id) || !isString(raw.role) || !isString(raw.content)) return null;
  if (raw.role !== "user" && raw.role !== "assistant") return null;

  const attachments = Array.isArray(raw.attachments)
    ? (raw.attachments as unknown[]).map(normalizeAttachment).filter(isDefined)
    : undefined;

  return {
    id: raw.id,
    role: raw.role,
    content: raw.content,
    attachments: attachments?.length ? attachments : undefined,
  };
};

export const parseCanvasChatMessages = (value: string | null | undefined) => {
  if (!value) return [] as CanvasChatMessage[];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [] as CanvasChatMessage[];
    return (parsed as unknown[]).map(normalizeMessage).filter(isDefined).slice(-MAX_MESSAGES);
  } catch {
    return [] as CanvasChatMessage[];
  }
};

export const serializeCanvasChatMessages = (messages: CanvasChatMessage[]) => {
  if (!Array.isArray(messages) || !messages.length) return null;
  const normalized = (messages as unknown[]).map(normalizeMessage).filter(isDefined).slice(-MAX_MESSAGES);
  return JSON.stringify(normalized);
};
