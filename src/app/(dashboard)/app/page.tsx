"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUp,
  Bolt,
  Globe,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { usePro } from "@/features/auth/hooks/use-pro";
import { useGenerateImage } from "@/features/ai/api/use-generate-image";
import { useCreateProject } from "@/features/projects/api/use-create-project";
import { useGetProjects } from "@/features/projects/api/use-get-projects";
import { PROMPT_PRESETS } from "@/features/prompts/prompt-presets";

import { uploadImageDataUrl } from "@/lib/upload-data-url";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { TemplatesSection } from "../templates-section";
import { MyTemplatesSection } from "../creator-hub/my-templates-section";

export default function AppHomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { ready, authenticated } = useRequireAuth("/app");
  const promptRef = useRef<HTMLTextAreaElement | null>(null);

  const { isLoading: isProLoading, isPro } = usePro({ enabled: ready && authenticated });
  const generateImage = useGenerateImage();
  const createProject = useCreateProject({ toast: false });

  const projects = useGetProjects({ enabled: ready && authenticated, limit: 8 });

  const [prompt, setPrompt] = useState("");
  const [profile, setProfile] = useState<"nano-banana" | "nano-banana-pro">("nano-banana");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get("new") !== "1") return;
    promptRef.current?.focus();
  }, [searchParams]);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const recentProjects = projects.data?.pages.flatMap((page) => page.data) ?? [];

  const onSubmitPrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const toastId = toast.loading("Generating…", {
      description: profile === "nano-banana-pro" ? "Nano Banana Pro" : "Nano Banana",
    });

    setBusy(true);
    try {
      const generated = await generateImage.mutateAsync({
        prompt: trimmed,
        profile,
        canvas: { width: 1024, height: 1024 },
      });

      const uploadedUrl = await uploadImageDataUrl(
        generated.data,
        `pigcasso_prompt_${Date.now()}.png`,
      );

      const created = await createProject.mutateAsync({
        name: trimmed.slice(0, 80),
        json: "",
        width: 1024,
        height: 1024,
      });

      toast.success("Opening editor…", { id: toastId, duration: 2500 });
      router.push(`/editor/${created.data.id}?asset=${encodeURIComponent(uploadedUrl)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate", {
        id: toastId,
        duration: 3500,
      });
    } finally {
      setBusy(false);
    }
  };

  const canUsePro = !isProLoading && isPro;
  const canSelectPro = canUsePro;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-12 pt-8">
      <section className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm shadow-soft">
          <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
            New
          </span>
          <span className="text-muted-foreground">
            Pick a starter prompt, tweak it, then generate.
          </span>
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight">
          Design is easier with{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400">
            Pigcasso
          </span>
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Start with a prompt. We’ll generate an asset and drop you into the editor.
        </p>

        <div className="mt-8 w-full max-w-3xl">
          <div className="relative rounded-2xl border bg-card shadow-soft">
            <Textarea
              ref={promptRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Pigcasso to design a…"
              className="min-h-[120px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              disabled={busy}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void onSubmitPrompt();
                }
              }}
            />

            <div className="flex items-center justify-between gap-3 px-4 pb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  disabled
                  aria-label="Attach"
                >
                  <ImageIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  disabled
                  aria-label="Idea"
                >
                  <Lightbulb className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  disabled
                  aria-label="Style"
                >
                  <Bolt className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full"
                  disabled
                  aria-label="Web"
                >
                  <Globe className="size-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={profile === "nano-banana" ? "default" : "secondary"}
                  className="rounded-full"
                  onClick={() => setProfile("nano-banana")}
                  disabled={busy}
                >
                  Nano Banana
                </Button>
                <Button
                  type="button"
                  variant={profile === "nano-banana-pro" ? "default" : "secondary"}
                  className="rounded-full"
                  onClick={() => setProfile("nano-banana-pro")}
                  disabled={busy || !canSelectPro}
                  title={!canSelectPro ? "Token-gated: hold 100,000 PIGCASSO to unlock" : undefined}
                >
                  Nano Banana Pro
                </Button>

                <Button
                  type="button"
                  size="icon"
                  className="rounded-full"
                  onClick={() => void onSubmitPrompt()}
                  disabled={busy || !prompt.trim()}
                  aria-label="Generate"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
            </div>
          </div>

          {!canUsePro ? (
            <div className="mt-3 text-xs text-muted-foreground">
              Pro is token-gated on Mantle (100,000 PIGCASSO). Non‑Pro requests for Nano Banana Pro
              will automatically downgrade.
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {PROMPT_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="secondary"
                className="rounded-full"
                onClick={() => {
                  setPrompt(preset.prompt);
                  requestAnimationFrame(() => {
                    promptRef.current?.focus();
                  });
                }}
                disabled={busy}
                title={preset.prompt}
              >
                {preset.id === "design" ? <Sparkles className="mr-2 size-4" /> : null}
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Recent Projects</h2>
          <Button type="button" variant="secondary" className="rounded-full" onClick={() => router.push("/projects")}>
            View all
          </Button>
        </div>

        {projects.isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="size-6 text-muted-foreground animate-spin" />
          </div>
        ) : projects.isError ? (
          <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            {projects.error?.message || "Failed to load projects."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => router.push("/app?new=1")}
              className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-md transition"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Sparkles className="size-5" />
              </div>
              <div className="mt-4 font-semibold">New project</div>
              <div className="mt-1 text-xs text-muted-foreground">Start from a prompt.</div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/canvas/new")}
              className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-md transition"
            >
              <div className="flex items-center justify-center size-10 rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition">
                <Sparkles className="size-5" />
              </div>
              <div className="mt-4 font-semibold">Open Canvas</div>
              <div className="mt-1 text-xs text-muted-foreground">Infinite canvas (freeform).</div>
            </button>

            {recentProjects.slice(0, 7).map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => router.push(`/editor/${project.id}`)}
                className="group rounded-2xl border bg-card p-5 text-left shadow-soft hover:shadow-md transition"
              >
                <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-primary/10 via-cyan-400/10 to-yellow-300/10 border border-border/60" />
                <div className="mt-4">
                  <div className="text-sm font-semibold truncate">{project.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {project.width}×{project.height}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-8">
        <MyTemplatesSection />
        <TemplatesSection />
      </section>
    </div>
  );
}
