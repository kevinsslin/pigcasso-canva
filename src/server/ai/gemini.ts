export type { AiProvider, NanoBananaProfile } from "./gemini/types";

export { analyzeCanvasPrompt } from "./gemini/analyze-canvas-prompt";
export type { AnalyzeCanvasPromptResult } from "./gemini/analyze-canvas-prompt";

export { chatAssistant } from "./gemini/assistant-chat";
export { getAssistantModel } from "./gemini/models";

export { editImage, generateImage, removeBackground } from "./gemini/generate-image";

export { generateHtml } from "./gemini/generate-html";

export { extractTextBlocks, parseExtractTextBlocksResponse } from "./gemini/extract-text-blocks";

