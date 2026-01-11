"use client";

import { useRef, type RefObject } from "react";
import Image from "next/image";
import { ArrowUp, AtSign, ChevronDown, Download, Loader2, LocateFixed, Paperclip, X } from "lucide-react";

import type { NanoBananaProfileOption } from "@/features/ai/lib/nano-banana-profile";
import { NANO_BANANA_PROFILE_OPTIONS } from "@/features/ai/lib/nano-banana-profile";
import type { ChatSuggestion } from "@/features/canvases/lib/chat-suggestions";
import type { SelectionContext } from "@/features/canvases/lib/selection-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { CanvasChatAttachmentChip } from "@/features/canvases/screens/canvas-screen/canvas-chat-attachment-chip";
import type { CanvasChatAttachment, CanvasChatMessage } from "@/features/canvases/screens/canvas-screen/types";

export type CanvasPinnedContext = {
  shapeId: string;
  label: string;
  previewUrl?: string | null;
};

export const CanvasChatPanel = ({
  desktopOpen,
  onDesktopOpenChange,
  mobileOpen,
  onMobileOpenChange,
  hasOutputs,
  onUploadFiles,
  onOpenDownloads,
  chatSuggestions,
  onPickSuggestion,
  clickEditArmed,
  onCancelPinEdit,
  pinnedContexts,
  onFocusShape,
  onRemovePinnedContext,
  selectionContext,
  recentAttachments,
  messages,
  busy,
  desktopEndRef,
  mobileEndRef,
  desktopInputRef,
  mobileInputRef,
  chatInput,
  onChatInputChange,
  onSend,
  onDesktopTogglePinEdit,
  onMobileTogglePinEdit,
  aiProfile,
  onAiProfileChange,
  disabled,
  boardCrashMessage,
  mentionPickerOpen,
  onCloseMentionPicker,
  onOpenMentionPicker,
  onDesktopMentionButtonClick,
  onMobileMentionButtonClick,
}: {
  desktopOpen: boolean;
  onDesktopOpenChange: (open: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
  hasOutputs: boolean;
  onUploadFiles: (files: File[]) => void;
  onOpenDownloads: () => void;
  chatSuggestions: ChatSuggestion[];
  onPickSuggestion: (prompt: string) => void;
  clickEditArmed: boolean;
  onCancelPinEdit: () => void;
  pinnedContexts: CanvasPinnedContext[];
  onFocusShape: (shapeId: string) => void;
  onRemovePinnedContext: (shapeId: string) => void;
  selectionContext: SelectionContext | null;
  recentAttachments: CanvasChatAttachment[];
  messages: CanvasChatMessage[];
  busy: boolean;
  desktopEndRef: RefObject<HTMLDivElement>;
  mobileEndRef: RefObject<HTMLDivElement>;
  desktopInputRef: RefObject<HTMLTextAreaElement>;
  mobileInputRef: RefObject<HTMLTextAreaElement>;
  chatInput: string;
  onChatInputChange: (
    value: string,
    meta?: { selectionStart: number | null; selectionEnd: number | null },
  ) => void;
  onSend: () => void;
  onDesktopTogglePinEdit: () => void;
  onMobileTogglePinEdit: () => void;
  aiProfile: NanoBananaProfileOption;
  onAiProfileChange: (profile: NanoBananaProfileOption) => void;
  disabled: boolean;
  boardCrashMessage: string | null;
  mentionPickerOpen: boolean;
  onCloseMentionPicker: () => void;
  onOpenMentionPicker: (input: HTMLTextAreaElement) => void;
  onDesktopMentionButtonClick: () => void;
  onMobileMentionButtonClick: () => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,.txt,.md,.json,.js,.jsx,.ts,.tsx,.css,.html,.py,.sol,.yaml,.yml"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          if (!files.length) return;
          onUploadFiles(files);
          event.currentTarget.value = "";
        }}
      />

      {desktopOpen ? (
      <aside className="hidden md:flex absolute right-4 top-16 bottom-4 z-40 w-[460px] max-w-[calc(100vw-24px)] rounded-2xl border border-border/60 bg-card/90 backdrop-blur shadow-soft overflow-hidden flex-col">
        <div className="p-5 border-b border-border/60 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex size-6 rounded-full bg-gradient-to-tr from-primary to-cyan-400 items-center justify-center overflow-hidden shadow-sm">
                <Image src="/logo-pig.png" alt="Pigcasso" width={24} height={24} className="h-full w-full object-cover" />
              </span>
              Pigcasso Agent
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onOpenDownloads}
                disabled={!hasOutputs}
                aria-label="Download outputs"
              >
                <Download className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => onDesktopOpenChange(false)}
                aria-label="Close chat"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">Create with prompts, then select something on the canvas to refine it.</div>

          <div className="flex flex-wrap gap-2">
            {chatSuggestions.map((item) => (
              <Button
                key={item.label}
                type="button"
                size="sm"
                variant="secondary"
                className="rounded-full"
                disabled={disabled}
                onClick={() => onPickSuggestion(item.prompt)}
              >
                {item.label}
              </Button>
            ))}
          </div>

          <div className="pt-1 space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">Context</div>
            <div className="flex flex-wrap gap-2">
              {clickEditArmed ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
                  onClick={onCancelPinEdit}
                >
                  <LocateFixed className="size-3 text-muted-foreground" />
                  <span>Pin armed</span>
                </button>
              ) : null}

              {pinnedContexts.map((ctx) => (
                <div
                  key={ctx.shapeId}
                  className="inline-flex items-center rounded-full border bg-background/70 text-[11px] font-medium text-foreground overflow-hidden"
                >
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 px-2 py-1 hover:bg-background transition"
                    onClick={() => onFocusShape(ctx.shapeId)}
                    aria-label={`Focus ${ctx.label}`}
                  >
                    <AtSign className="size-3 text-muted-foreground" />
                    {ctx.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ctx.previewUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
                    ) : null}
                    <span className="max-w-[140px] truncate">{ctx.label}</span>
                  </button>
                  <button
                    type="button"
                    className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-background transition"
                    onClick={() => onRemovePinnedContext(ctx.shapeId)}
                    aria-label="Remove context"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {selectionContext ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
                  onClick={() => onFocusShape(selectionContext.shapeId)}
                >
                  {selectionContext.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectionContext.previewUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
                  ) : null}
                  <span className="max-w-[160px] truncate">{selectionContext.label}</span>
                </button>
              ) : null}

              {recentAttachments.map((att) => (
                <CanvasChatAttachmentChip key={att.id} attachment={att} onClick={() => onFocusShape(att.shapeId)} />
              ))}

              {!selectionContext && !recentAttachments.length && !clickEditArmed ? (
                <div className="text-xs text-muted-foreground">Select something to add context.</div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          <div className="space-y-4">
            {messages.length ? (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm",
                        msg.role === "assistant" ? "bg-muted/40" : "bg-background",
                      )}
                    >
                      <div className="text-xs font-semibold text-muted-foreground">{msg.role === "assistant" ? "Pigcasso" : "You"}</div>
                      <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                      {msg.attachments?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {msg.attachments.map((att) => (
                            <CanvasChatAttachmentChip key={att.id} attachment={att} onClick={() => onFocusShape(att.shapeId)} />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}

                {busy ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm bg-muted/40">
                      <div className="text-xs font-semibold text-muted-foreground">Pigcasso</div>
                      <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Thinking…
                      </div>
                    </div>
                  </div>
                ) : null}

                <div ref={desktopEndRef} />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground">Describe what you want to create, then refine by selecting parts on the canvas.</div>
                <div className="text-xs text-muted-foreground">Try a quick prompt above, or type your own.</div>
                <div ref={desktopEndRef} />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border/60 bg-card/80">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={clickEditArmed ? "secondary" : "ghost"}
              size="icon"
              className="rounded-full"
              disabled={disabled}
              aria-label={clickEditArmed ? "Cancel pin edit" : "Pin an edit to the canvas"}
              aria-pressed={clickEditArmed}
              onClick={onDesktopTogglePinEdit}
            >
              <LocateFixed className="size-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              disabled={disabled}
              aria-label="Mention a canvas item"
              onClick={onDesktopMentionButtonClick}
            >
              <AtSign className="size-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full"
              disabled={disabled}
              aria-label="Upload files"
              onClick={openFilePicker}
            >
              <Paperclip className="size-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="secondary" className="rounded-full px-3" disabled={disabled}>
                  <span className="text-xs font-semibold">
                    {NANO_BANANA_PROFILE_OPTIONS.find((opt) => opt.id === aiProfile)?.label ?? "Model"}
                  </span>
                  <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Model</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={aiProfile} onValueChange={(value) => onAiProfileChange(value as NanoBananaProfileOption)}>
                  {NANO_BANANA_PROFILE_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.description}</span>
                      </div>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 rounded-2xl border bg-background px-4 py-2">
              <Textarea
                ref={desktopInputRef}
                value={chatInput}
                rows={2}
                onChange={(e) =>
                  onChatInputChange(e.target.value, {
                    selectionStart: e.currentTarget.selectionStart,
                    selectionEnd: e.currentTarget.selectionEnd,
                  })
                }
                placeholder={
                  boardCrashMessage
                    ? "Board unavailable…"
                    : disabled
                    ? "Loading canvas…"
                    : "Type a prompt… (try: “landing page for…”)"
                }
                className="min-h-[44px] max-h-[140px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={disabled}
                onKeyDown={(event) => {
                  if (event.key === "Escape" && mentionPickerOpen) {
                    event.preventDefault();
                    onCloseMentionPicker();
                    return;
                  }
                    if (event.key === "@" && !event.nativeEvent.isComposing) {
                      window.setTimeout(() => {
                        onOpenMentionPicker(event.currentTarget);
                      }, 0);
                    }
                  if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey) {
                    event.preventDefault();
                    onSend();
                  }
                }}
              />
            </div>

            <Button
              type="button"
              size="icon"
              className="rounded-full"
              onClick={onSend}
              disabled={!chatInput.trim() || disabled}
              aria-label="Send"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </Button>
          </div>
        </div>
      </aside>
    ) : null}

    <Dialog open={mobileOpen} onOpenChange={onMobileOpenChange}>
      <DialogContent className="left-0 top-0 h-[100dvh] w-[100dvw] max-w-none translate-x-0 translate-y-0 rounded-none p-0 gap-0">
        <div className="flex h-full flex-col bg-background">
          <div className="h-14 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur flex items-center justify-between px-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="inline-flex size-6 rounded-full bg-gradient-to-tr from-primary to-cyan-400 items-center justify-center overflow-hidden shadow-sm">
                <Image src="/logo-pig.png" alt="Pigcasso" width={24} height={24} className="h-full w-full object-cover" />
              </span>
              Pigcasso Agent
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={onOpenDownloads}
                disabled={!hasOutputs}
                aria-label="Download outputs"
              >
                <Download className="size-4" />
              </Button>
              <Button type="button" variant="ghost" onClick={() => onMobileOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {selectionContext || recentAttachments.length || clickEditArmed ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Context</div>
                <div className="flex flex-wrap gap-2">
                  {clickEditArmed ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
                      onClick={onCancelPinEdit}
                    >
                      <LocateFixed className="size-3 text-muted-foreground" />
                      <span>Pin armed</span>
                    </button>
                  ) : null}

                  {pinnedContexts.map((ctx) => (
                    <div
                      key={ctx.shapeId}
                      className="inline-flex items-center rounded-full border bg-background/70 text-[11px] font-medium text-foreground overflow-hidden"
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2 py-1 hover:bg-background transition"
                        onClick={() => {
                          onFocusShape(ctx.shapeId);
                          onMobileOpenChange(false);
                        }}
                        aria-label={`Focus ${ctx.label}`}
                      >
                        <AtSign className="size-3 text-muted-foreground" />
                        {ctx.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ctx.previewUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
                        ) : null}
                        <span className="max-w-[140px] truncate">{ctx.label}</span>
                      </button>
                      <button
                        type="button"
                        className="px-2 py-1 text-muted-foreground hover:text-foreground hover:bg-background transition"
                        onClick={() => onRemovePinnedContext(ctx.shapeId)}
                        aria-label="Remove context"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}

                  {selectionContext ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2 py-1 text-[11px] font-medium text-foreground hover:bg-background transition"
                      onClick={() => {
                        onFocusShape(selectionContext.shapeId);
                        onMobileOpenChange(false);
                      }}
                    >
                      {selectionContext.previewUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selectionContext.previewUrl} alt="" className="h-4 w-4 rounded-sm object-cover" />
                      ) : null}
                      <span className="max-w-[160px] truncate">{selectionContext.label}</span>
                    </button>
                  ) : null}

                  {recentAttachments.map((att) => (
                    <CanvasChatAttachmentChip
                      key={att.id}
                      attachment={att}
                      onClick={() => {
                        onFocusShape(att.shapeId);
                        onMobileOpenChange(false);
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-4">
              {messages.length ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm",
                          msg.role === "assistant" ? "bg-muted/40" : "bg-background",
                        )}
                      >
                        <div className="text-xs font-semibold text-muted-foreground">{msg.role === "assistant" ? "Pigcasso" : "You"}</div>
                        <div className="mt-1 whitespace-pre-wrap">{msg.content}</div>
                        {msg.attachments?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.attachments.map((att) => (
                              <CanvasChatAttachmentChip
                                key={att.id}
                                attachment={att}
                                onClick={() => {
                                  onFocusShape(att.shapeId);
                                  onMobileOpenChange(false);
                                }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}

                  {busy ? (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl border p-3 text-sm shadow-sm bg-muted/40">
                        <div className="text-xs font-semibold text-muted-foreground">Pigcasso</div>
                        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Thinking…
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div ref={mobileEndRef} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Describe what you want to create, then refine by selecting parts on the canvas.</div>
                  <div className="flex flex-wrap gap-2">
                    {chatSuggestions.map((item) => (
                      <Button
                        key={item.label}
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="rounded-full"
                        disabled={disabled}
                        onClick={() => onPickSuggestion(item.prompt)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                  <div ref={mobileEndRef} />
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border/60 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={clickEditArmed ? "secondary" : "ghost"}
                size="icon"
                className="rounded-full"
                disabled={disabled}
                aria-label={clickEditArmed ? "Cancel pin edit" : "Pin an edit to the canvas"}
                aria-pressed={clickEditArmed}
                onClick={onMobileTogglePinEdit}
              >
                <LocateFixed className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                disabled={disabled}
                aria-label="Mention a canvas item"
                onClick={onMobileMentionButtonClick}
              >
                <AtSign className="size-4" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                disabled={disabled}
                aria-label="Upload files"
                onClick={openFilePicker}
              >
                <Paperclip className="size-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="secondary" className="rounded-full px-3" disabled={disabled}>
                    <span className="text-xs font-semibold">
                      {NANO_BANANA_PROFILE_OPTIONS.find((opt) => opt.id === aiProfile)?.label ?? "Model"}
                    </span>
                    <ChevronDown className="ml-2 size-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuLabel>Model</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={aiProfile} onValueChange={(value) => onAiProfileChange(value as NanoBananaProfileOption)}>
                    {NANO_BANANA_PROFILE_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem key={opt.id} value={opt.id}>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground">{opt.description}</span>
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="flex-1 rounded-2xl border bg-background px-4 py-2">
                <Textarea
                  ref={mobileInputRef}
                  value={chatInput}
                  rows={2}
                  onChange={(e) =>
                    onChatInputChange(e.target.value, {
                      selectionStart: e.currentTarget.selectionStart,
                      selectionEnd: e.currentTarget.selectionEnd,
                    })
                  }
                  placeholder={boardCrashMessage ? "Board unavailable…" : disabled ? "Loading canvas…" : "Type a prompt…"}
                  className="min-h-[44px] max-h-[140px] resize-none border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                  disabled={disabled}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && mentionPickerOpen) {
                      event.preventDefault();
                      onCloseMentionPicker();
                      return;
                    }
                    if (event.key === "@" && !event.nativeEvent.isComposing) {
                      window.setTimeout(() => {
                        onOpenMentionPicker(event.currentTarget);
                      }, 0);
                    }
                    if (event.key === "Enter" && !event.nativeEvent.isComposing && !event.shiftKey) {
                      event.preventDefault();
                      onSend();
                    }
                  }}
                />
              </div>

              <Button
                type="button"
                size="icon"
                className="rounded-full"
                onClick={onSend}
                disabled={!chatInput.trim() || disabled}
                aria-label="Send"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};
