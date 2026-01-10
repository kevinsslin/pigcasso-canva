import type { SelectionContext } from "@/features/canvases/lib/selection-context";

export type ChatSuggestion = { label: string; prompt: string };

export type ChatSuggestionMessage = {
  role: "user" | "assistant";
  attachments?: Array<{ type: "image" | "html" }>;
};

type SuggestionInput = {
  messages: ChatSuggestionMessage[];
  selectionContext: SelectionContext | null;
};

const STARTER_SUGGESTIONS: ChatSuggestion[] = [
  { label: "Design", prompt: "Design a bold social post for a Web3 hackathon. Include a short headline and CTA." },
  { label: "Branding", prompt: "Create a minimal brand kit for Pigcasso (colors, typography, and tone)." },
  { label: "Illustration", prompt: "Generate a cute pig mascot illustration in a modern flat style, transparent background." },
  { label: "Website", prompt: "Landing page for Pigcasso: hero, features, social proof, CTA. Return HTML." },
];

const IMAGE_NEXT_SUGGESTIONS: ChatSuggestion[] = [
  { label: "Variations", prompt: "Make 3 variations with different styles (minimal, 3D, retro poster)." },
  { label: "Text Overlay", prompt: "Add bold headline text and a small CTA badge. Keep it readable." },
  { label: "Colorway", prompt: "Change the color palette to a warm paper vibe + neon accent." },
  { label: "Sticker", prompt: "Turn this into a sticker: transparent background + clean outline." },
];

const HTML_NEXT_SUGGESTIONS: ChatSuggestion[] = [
  { label: "Mobile", prompt: "Make this layout mobile-first and responsive (no horizontal scrolling)." },
  { label: "Polish UI", prompt: "Refine spacing, typography, and add subtle shadows. Keep it minimal." },
  { label: "Components", prompt: "Add a features section + pricing cards + FAQ accordion." },
  { label: "Theme", prompt: "Apply Pigcasso design system: paper background, rounded cards, soft borders." },
];

const FALLBACK_NEXT_SUGGESTIONS: ChatSuggestion[] = [
  { label: "Generate", prompt: "Generate a new concept based on our current direction." },
  { label: "Improve", prompt: "Improve the last output: make it cleaner, more modern, and more on-brand." },
  { label: "Expand", prompt: "Create a second variation that targets a different audience." },
  { label: "Export", prompt: "Prepare this for export: correct sizes, safe margins, and clear hierarchy." },
];

const getLastAttachmentType = (messages: ChatSuggestionMessage[]): "image" | "html" | null => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const msg = messages[i];
    if (msg.role !== "assistant") continue;
    const att = msg.attachments?.find((item) => item.type === "image" || item.type === "html");
    if (att?.type === "image") return "image";
    if (att?.type === "html") return "html";
  }
  return null;
};

export const getCanvasChatSuggestions = (input: SuggestionInput): ChatSuggestion[] => {
  const { messages, selectionContext } = input;
  const hasAssistant = messages.some((msg) => msg.role === "assistant");
  const lastAttachmentType = getLastAttachmentType(messages);

  const base = (() => {
    if (!hasAssistant) return STARTER_SUGGESTIONS;
    if (lastAttachmentType === "image") return IMAGE_NEXT_SUGGESTIONS;
    if (lastAttachmentType === "html") return HTML_NEXT_SUGGESTIONS;
    return FALLBACK_NEXT_SUGGESTIONS;
  })();

  if (selectionContext?.type === "image") {
    const tweak: ChatSuggestion = {
      label: "Edit Selected",
      prompt: "Edit the selected image: improve composition, add detail, and keep style consistent.",
    };
    return [tweak, ...base].slice(0, 4);
  }

  if (selectionContext?.type === "html-card") {
    const tweak: ChatSuggestion = {
      label: "Refine Selected",
      prompt: "Refine the selected HTML: fix layout issues, improve typography, and ensure responsive behavior.",
    };
    return [tweak, ...base].slice(0, 4);
  }

  return base.slice(0, 4);
};
