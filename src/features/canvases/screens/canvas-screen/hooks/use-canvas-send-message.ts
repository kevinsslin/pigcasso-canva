"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";
import { toast } from "sonner";
import type { Editor as TldrawEditor } from "tldraw";

import { toNanoBananaApiProfile, type NanoBananaProfileOption } from "@/features/ai/lib/nano-banana-profile";
import type { AiJobQueue } from "@/features/canvases/lib/ai-job-queue";
import { buildCanvasChatContextAttachments } from "@/features/canvases/lib/chat-context-attachments";
import { getSelectionContext } from "@/features/canvases/lib/selection-context";
import { isImageVariationPrompt, stripImageVariationPrompt } from "@/features/canvases/lib/prompt-intent";
import { toCanvasImageUrl, unwrapCanvasImageProxyUrl } from "@/features/canvases/lib/image-proxy";
import { withHistorySquash } from "@/features/canvases/tldraw/history";
import { upsertHtmlCard, HTML_CARD_SHAPE_TYPE } from "@/features/canvases/tldraw/html-card";
import { insertImageToCanvas } from "@/features/canvases/tldraw/insert-image";
import { getAiInsertPoint } from "@/features/canvases/tldraw/insert-point";
import { getApiErrorStatus } from "@/lib/api-error";
import { copyTextToClipboard } from "@/lib/clipboard";
import { uploadImageDataUrl } from "@/lib/upload-data-url";

import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";

export type SendMessageOptions = {
  point?: { x: number; y: number };
  shapeId?: string | null;
  shapeIds?: string[];
};

type WithAiCommit = <T>(fn: () => Promise<T> | T) => Promise<T>;

type UseCanvasSendMessageParams = {
  editor: TldrawEditor | null;
  boardHydrated: boolean;
  boardCrashMessage: string | null;
  aiProfile: NanoBananaProfileOption;
  aiJobQueueRef: { current: AiJobQueue | null };
  chatInputRef: { current: string };
  setChatInput: (value: string) => void;
  setMessages: Dispatch<SetStateAction<CanvasChatMessage[]>>;
  outputCounterRef: { current: number };
  startAiUiJob: (label: string) => string;
  updateAiUiJobLabel: (jobId: string, label: string) => void;
  finishAiUiJob: (jobId: string) => void;
  withAiCommit: WithAiCommit;
  chatAssistant: ReturnType<typeof import("@/features/ai/api/use-chat-assistant").useChatAssistant>;
  analyzeCanvasPrompt: ReturnType<
    typeof import("@/features/ai/api/use-analyze-canvas-prompt").useAnalyzeCanvasPrompt
  >;
  generateImage: ReturnType<typeof import("@/features/ai/api/use-generate-image").useGenerateImage>;
  editImage: ReturnType<typeof import("@/features/ai/api/use-edit-image").useEditImage>;
  generateHtml: ReturnType<typeof import("@/features/ai/api/use-generate-html").useGenerateHtml>;
  ensureHtmlCardPreview: (shapeId: string, html: string) => Promise<void>;
};

export const useCanvasSendMessage = ({
  editor,
  boardHydrated,
  boardCrashMessage,
  aiProfile,
  aiJobQueueRef,
  chatInputRef,
  setChatInput,
  setMessages,
  outputCounterRef,
  startAiUiJob,
  updateAiUiJobLabel,
  finishAiUiJob,
  withAiCommit,
  chatAssistant,
  analyzeCanvasPrompt,
  generateImage,
  editImage,
  generateHtml,
  ensureHtmlCardPreview,
}: UseCanvasSendMessageParams) => {
  return useCallback(
    async (value?: string, options?: SendMessageOptions) => {
      const trimmed = (value ?? chatInputRef.current).trim();
      if (!trimmed) return;

      if (!editor || !boardHydrated || boardCrashMessage) {
        if (boardCrashMessage) {
          toast.error("Board is unavailable. Reload to continue.", { duration: 3000 });
          return;
        }
        toast.message("Canvas is still loading. Try again in a moment.", { duration: 2500 });
        return;
      }

      chatInputRef.current = "";
      setChatInput("");

      const contextShapeIds = options?.shapeIds ?? [];
      const contextAttachments = buildCanvasChatContextAttachments(editor as any, contextShapeIds, { max: 8 });

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "user",
          content: trimmed,
          attachments: contextAttachments.length ? contextAttachments : undefined,
        },
      ]);

      const queue = aiJobQueueRef.current;
      if (!queue) return;

      const selectedShapeId =
        options?.shapeId !== undefined
          ? options.shapeId
          : (() => {
              try {
                return editor.getSelectedShapeIds?.()?.[0] ?? null;
              } catch {
                return null;
              }
            })();

      const selectedShape = selectedShapeId ? (editor.getShape(selectedShapeId as any) as any) : null;
      const profile = aiProfile;

      await queue.enqueue(async () => {
        const uiJobId = startAiUiJob(profile === "gemini-pro-3" ? "Thinking…" : "Analyzing…");

        try {
          const apiProfile = toNanoBananaApiProfile(profile);
          const promptContext = (() => {
            const ids = contextShapeIds.slice(0, 12);
            if (!ids.length) return null;
            const lines = ids
              .map((shapeId) => {
                const ctx = getSelectionContext(editor as any, shapeId);
                if (!ctx) return null;
                return `- ${ctx.label} (${ctx.type})`;
              })
              .filter(Boolean);
            if (!lines.length) return null;
            return `Canvas context:\n${lines.join("\n")}`;
          })();

          const promptWithContext = promptContext ? `${trimmed}\n\n${promptContext}` : trimmed;

          if (profile === "gemini-pro-3") {
            updateAiUiJobLabel(uiJobId, "Thinking…");
            const res = await chatAssistant.mutateAsync({ prompt: promptWithContext });
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: res.data.text }]);
            return;
          }

          updateAiUiJobLabel(uiJobId, "Analyzing…");
          const selectedCtx = selectedShapeId ? getSelectionContext(editor as any, selectedShapeId) : null;

          const plan = await analyzeCanvasPrompt.mutateAsync({
            prompt: trimmed,
            context: promptContext ?? undefined,
            selection: selectedCtx ? { type: selectedCtx.type, label: selectedCtx.label } : null,
          });

          if (plan.data.route === "ask_clarify") {
            updateAiUiJobLabel(uiJobId, "Thinking…");
            const question = plan.data.question;
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: question }]);
            return;
          }

          if (plan.data.route === "generate_html") {
            updateAiUiJobLabel(uiJobId, "Generating HTML…");
            const prompt = promptContext ? `${plan.data.prompt}\n\n${promptContext}` : plan.data.prompt;
            const res = await generateHtml.mutateAsync({ prompt });
            const html = res.data.html;

            let htmlCardMode: "created" | "updated" | "failed" = "failed";
            let htmlCardShapeId: string | null = null;

            try {
              updateAiUiJobLabel(uiJobId, "Placing HTML on canvas…");
              const point = options?.point ?? getAiInsertPoint(editor as any);
              const existingShapeId =
                selectedShape?.type === HTML_CARD_SHAPE_TYPE ? (selectedShapeId ?? undefined) : undefined;

              const result = await withAiCommit(() =>
                withHistorySquash(editor as any, "ai:html", async () => {
                  return upsertHtmlCard(editor as any, {
                    html,
                    point,
                    existingShapeId: existingShapeId ?? undefined,
                  });
                }),
              );

              htmlCardMode = result.mode;
              htmlCardShapeId = result.id;

              try {
                editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
              } catch {
                // ignore
              }
            } catch {
              htmlCardMode = "failed";
              const copied = await copyTextToClipboard(html);
              toast.error(
                copied ? "Couldn’t add the HTML card. HTML copied to clipboard." : "Couldn’t add the HTML card to the canvas.",
                { duration: 3500 },
              );
            }

            if (htmlCardShapeId) {
              updateAiUiJobLabel(uiJobId, "Rendering HTML preview…");
              await ensureHtmlCardPreview(htmlCardShapeId, html);
            }

            const htmlAttachment: CanvasChatAttachment | null = htmlCardShapeId
              ? {
                  id: crypto.randomUUID(),
                  type: "html",
                  label: `HTML_${String(outputCounterRef.current).padStart(4, "0")}`,
                  shapeId: htmlCardShapeId,
                }
              : null;

            if (htmlAttachment) {
              outputCounterRef.current += 1;
            }

            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content:
                  htmlCardMode === "updated"
                    ? "Updated the HTML card on your canvas."
                    : htmlCardMode === "created"
                      ? "Added an HTML card to your canvas."
                      : "Generated HTML, but couldn’t add it to the canvas.",
                attachments: htmlAttachment ? [htmlAttachment] : undefined,
              },
            ]);
            return;
          }

          const wantsEdit = plan.data.route === "edit_selected_image";
          if (wantsEdit && selectedShape?.type === "image" && selectedShape?.props?.assetId) {
            updateAiUiJobLabel(uiJobId, "Editing image…");
            const asset = editor.getAsset?.(selectedShape.props.assetId) as any;
            const srcRaw =
              (asset?.meta?.originalSrc as string | undefined) ??
              (asset?.meta?.rawSrc as string | undefined) ??
              (asset?.props?.src as string | undefined);
            const src = srcRaw ? unwrapCanvasImageProxyUrl(srcRaw) : null;

            if (!src) {
              throw new Error("Selected image is missing a source URL.");
            }

            const wantsVariation = isImageVariationPrompt(trimmed);
            if (wantsVariation) {
              const userNotes = stripImageVariationPrompt(trimmed);
              const instruction = userNotes
                ? [
                    "Create a refined variation of this image. Keep layout and composition consistent.",
                    "Apply these user notes:",
                    userNotes,
                  ].join("\n")
                : "Create a refined variation of this image. Keep layout and composition consistent.";

              const res = await editImage.mutateAsync({
                image: src,
                instruction,
                profile: apiProfile,
              });

              updateAiUiJobLabel(uiJobId, "Uploading image…");
              const uploadedUrl = await uploadImageDataUrl(res.data, `pigcasso_variation_${Date.now()}.png`);
              const canvasUrl = toCanvasImageUrl(uploadedUrl);

              const point = (() => {
                try {
                  const bounds = editor.getShapePageBounds?.(selectedShapeId as any) as any;
                  if (bounds && typeof bounds === "object") {
                    return {
                      x: bounds.x + bounds.w + Math.max(80, bounds.w * 0.2),
                      y: bounds.y + bounds.h * 0.5,
                    };
                  }
                } catch {
                  // ignore
                }
                return options?.point ?? getAiInsertPoint(editor as any);
              })();

              updateAiUiJobLabel(uiJobId, "Placing on canvas…");
              const inserted = await withAiCommit(() =>
                withHistorySquash(editor as any, "ai:variation", async () => {
                  const created = await insertImageToCanvas(editor as any, {
                    src: canvasUrl,
                    point,
                    name: `pigcasso_variation_${Date.now()}.png`,
                    size: {
                      w: Number(asset?.props?.w) || 1024,
                      h: Number(asset?.props?.h) || 1024,
                    },
                  });

                  try {
                    const createdAsset = editor.getAsset?.(created.assetId as any) as any;
                    if (createdAsset) {
                      editor.updateAssets?.([
                        {
                          ...createdAsset,
                          meta: { ...(createdAsset.meta ?? {}), originalSrc: uploadedUrl },
                        },
                      ]);
                    }
                  } catch {
                    // ignore
                  }

                  return created;
                }),
              );

              const attachment: CanvasChatAttachment = {
                id: crypto.randomUUID(),
                type: "image",
                label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
                shapeId: inserted.shapeId,
                url: canvasUrl,
              };
              outputCounterRef.current += 1;

              setMessages((prev) => [
                ...prev,
                {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: "Added a new variation (kept the original intact).",
                  attachments: [attachment],
                },
              ]);
              return;
            }

            const instruction = plan.data.route === "edit_selected_image" ? plan.data.instruction : trimmed;

            const res = await editImage.mutateAsync({
              image: src,
              instruction,
              profile: apiProfile,
            });

            updateAiUiJobLabel(uiJobId, "Uploading image…");
            const uploadedUrl = await uploadImageDataUrl(res.data, `pigcasso_edit_${Date.now()}.png`);
            const canvasUrl = toCanvasImageUrl(uploadedUrl);

            const point = (() => {
              try {
                const bounds = editor.getShapePageBounds?.(selectedShapeId as any) as any;
                if (bounds && typeof bounds === "object") {
                  return {
                    x: bounds.x + bounds.w + Math.max(80, bounds.w * 0.2),
                    y: bounds.y + bounds.h * 0.5,
                  };
                }
              } catch {
                // ignore
              }
              return options?.point ?? getAiInsertPoint(editor as any);
            })();

            updateAiUiJobLabel(uiJobId, "Placing on canvas…");
            const inserted = await withAiCommit(() =>
              withHistorySquash(editor as any, "ai:edit-image", async () => {
                const created = await insertImageToCanvas(editor as any, {
                  src: canvasUrl,
                  point,
                  name: `pigcasso_edit_${Date.now()}.png`,
                  size: {
                    w: Number(asset?.props?.w) || 1024,
                    h: Number(asset?.props?.h) || 1024,
                  },
                });

                try {
                  const createdAsset = editor.getAsset?.(created.assetId as any) as any;
                  if (createdAsset) {
                    editor.updateAssets?.([
                      {
                        ...createdAsset,
                        meta: { ...(createdAsset.meta ?? {}), originalSrc: uploadedUrl },
                      },
                    ]);
                  }
                } catch {
                  // ignore
                }

                return created;
              }),
            );

            const editAttachment: CanvasChatAttachment = {
              id: crypto.randomUUID(),
              type: "image",
              label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
              shapeId: inserted.shapeId,
              url: canvasUrl,
            };
            outputCounterRef.current += 1;

            setMessages((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                content: "Added an edited version next to the original.",
                attachments: [editAttachment],
              },
            ]);
            return;
          }

          updateAiUiJobLabel(uiJobId, "Generating image…");
          const imagePrompt = promptContext
            ? `${plan.data.route === "generate_image" ? plan.data.prompt : trimmed}\n\n${promptContext}`
            : plan.data.route === "generate_image"
              ? plan.data.prompt
              : trimmed;

          const generated = await generateImage.mutateAsync({
            prompt: imagePrompt,
            profile: apiProfile,
            canvas: { width: 1024, height: 1024 },
          });

          updateAiUiJobLabel(uiJobId, "Uploading image…");
          const uploadedUrl = await uploadImageDataUrl(generated.data, `pigcasso_${Date.now()}.png`);
          const canvasUrl = toCanvasImageUrl(uploadedUrl);

          const point = options?.point ?? getAiInsertPoint(editor as any);
          updateAiUiJobLabel(uiJobId, "Placing on canvas…");
          const inserted = await withAiCommit(() =>
            withHistorySquash(editor as any, "ai:insert-image", async () => {
              const created = await insertImageToCanvas(editor as any, {
                src: canvasUrl,
                point,
                name: `pigcasso_${Date.now()}.png`,
                size: { w: 1024, h: 1024 },
              });
              try {
                const createdAsset = editor.getAsset?.(created.assetId as any) as any;
                if (createdAsset) {
                  editor.updateAssets?.([
                    {
                      ...createdAsset,
                      meta: { ...(createdAsset.meta ?? {}), originalSrc: uploadedUrl },
                    },
                  ]);
                }
              } catch {
                // ignore
              }
              return created;
            }),
          );

          try {
            editor.zoomToSelectionIfOffscreen?.(120, { animation: { duration: 220 } } as any);
          } catch {
            // ignore
          }

          const insertedShapeId = inserted.shapeId;
          const insertAttachment: CanvasChatAttachment | null = insertedShapeId
            ? {
                id: crypto.randomUUID(),
                type: "image",
                label: `IMG_${String(outputCounterRef.current).padStart(4, "0")}`,
                shapeId: insertedShapeId,
                url: canvasUrl,
              }
            : null;

          if (insertAttachment) {
            outputCounterRef.current += 1;
          }

          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: "Added a new image to your canvas.",
              attachments: insertAttachment ? [insertAttachment] : undefined,
            },
          ]);
        } catch (error) {
          const status = getApiErrorStatus(error);
          const message = error instanceof Error ? error.message : "Something went wrong.";
          if (status === 429 && message.toLowerCase().includes("daily limit")) {
            toast.error("Daily AI limit reached. Try again tomorrow or unlock Pro.", { duration: 4000 });
          } else {
            toast.error(message, { duration: 3500 });
          }
          setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: message }]);
        } finally {
          finishAiUiJob(uiJobId);
        }
      });
    },
    [
      aiProfile,
      analyzeCanvasPrompt,
      boardCrashMessage,
      boardHydrated,
      chatAssistant,
      editImage,
      editor,
      ensureHtmlCardPreview,
      finishAiUiJob,
      generateHtml,
      generateImage,
      startAiUiJob,
      updateAiUiJobLabel,
      withAiCommit,
      aiJobQueueRef,
      chatInputRef,
      outputCounterRef,
      setChatInput,
      setMessages,
    ],
  );
};
