export type CanvasChatAttachment = {
  id: string;
  type: "image" | "html";
  label: string;
  shapeId: string;
  url?: string;
  html?: string;
};

export type CanvasChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: CanvasChatAttachment[];
};

