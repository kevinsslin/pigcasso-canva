"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGeneratePresentation } from "@/features/presentations/api/use-generate-presentation";
import { useCreatePresentationDeck } from "@/features/presentations/api/use-create-presentation-deck";
import { buildSlideJson } from "@/features/presentations/lib/build-slide-json";
import type { PresentationTone } from "@/features/presentations/types";
import { PRESENTATION_DIMENSIONS } from "@/features/presentations/types";
import { readApiResponse } from "@/lib/api-response";
import { client } from "@/lib/hono";

import { LoadingOverlay } from "@/components/loading-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const buildPrompt = (params: {
  topic: string;
  audience?: string;
  slideCount: number;
  tone: PresentationTone;
}) => {
  const lines = [
    `Topic: ${params.topic}`,
    params.audience ? `Audience: ${params.audience}` : null,
    `Slides: ${params.slideCount}`,
    `Tone: ${params.tone}`,
  ].filter(Boolean);

  return lines.join("\n");
};

const truncateProjectName = (value: string, max = 80) => {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
};

export default function NewPresentationPage() {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth("/presentations/new");
  const generate = useGeneratePresentation();
  const saveDeck = useCreatePresentationDeck();

  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [slideCount, setSlideCount] = useState(6);
  const [tone, setTone] = useState<PresentationTone>("professional");
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  const prompt = useMemo(
    () =>
      buildPrompt({
        topic,
        audience: audience.trim() ? audience.trim() : undefined,
        slideCount,
        tone,
      }),
    [audience, slideCount, tone, topic],
  );

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const onGenerate = async () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      toast.error("Please enter a topic.");
      return;
    }

    const toastId = toast.loading("Generating slides…");
    setCreating(true);
    setProgress("Generating deck outline…");
    try {
      const deck = await generate.mutateAsync({
        topic: trimmedTopic,
        audience: audience.trim() ? audience.trim() : undefined,
        slideCount,
        tone,
      });

      const projectsCreated: Array<{ projectId: string; index: number; title: string }> = [];

      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i];
        setProgress(`Creating slide ${i + 1}/${deck.slides.length}…`);

        const json = buildSlideJson({
          deck,
          slide,
          index: i,
          width: PRESENTATION_DIMENSIONS.width,
          height: PRESENTATION_DIMENSIONS.height,
        });

        const response = await client.api.projects.$post({
          json: {
            name: truncateProjectName(`${deck.title} — Slide ${i + 1}: ${slide.title}`),
            json,
            width: PRESENTATION_DIMENSIONS.width,
            height: PRESENTATION_DIMENSIONS.height,
          },
        });

        const body = await readApiResponse<{ data: { id: string } }>(
          response,
          "Failed to create slide project",
        );

        projectsCreated.push({
          projectId: body.data.id,
          index: i,
          title: slide.title,
        });
      }

      setProgress("Saving deck…");
      const saved = await saveDeck.mutateAsync({
        title: deck.title,
        prompt,
        spec: deck,
        slides: projectsCreated,
      });

      toast.success("Deck ready.", { id: toastId, duration: 2500 });
      router.push(`/presentations/${saved.deckId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate slides", {
        id: toastId,
        duration: 4000,
      });
    } finally {
      setCreating(false);
      setProgress(null);
    }
  };

  return (
    <>
      <LoadingOverlay
        open={creating || generate.isPending || saveDeck.isPending}
        title={progress ?? "Generating slides…"}
        description="This can take a minute for multi-slide decks."
      />

      <div className="max-w-3xl mx-auto space-y-6 pb-10">
        <div>
          <h1 className="text-2xl font-semibold">AI Slides</h1>
          <p className="text-sm text-muted-foreground mt-1">
            One-click slide decks: title, structure, colors, and simple visuals.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Generate a deck</CardTitle>
            <CardDescription>
              Describe what you want. Pigcasso will generate a cohesive deck as editable slides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ex: Mantle ecosystem weekly update"
                disabled={creating}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="audience">Audience (optional)</Label>
                <Input
                  id="audience"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Ex: crypto-native creators"
                  disabled={creating}
                />
              </div>

              <div className="space-y-2">
                <Label>Slide count</Label>
                <select
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  disabled={creating}
                >
                  {Array.from({ length: 8 }, (_, idx) => idx + 3).map((count) => (
                    <option key={count} value={count}>
                      {count} slides
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone</Label>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={tone}
                onChange={(e) => setTone(e.target.value as PresentationTone)}
                disabled={creating}
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="bold">Bold</option>
              </select>
            </div>

            <Button type="button" onClick={() => void onGenerate()} disabled={creating}>
              Generate deck
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

