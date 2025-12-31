"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useGetPresentationDeck } from "@/features/presentations/api/use-get-presentation-deck";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PresentationDeckPage({
  params,
}: {
  params: { deckId: string };
}) {
  const router = useRouter();
  const { ready, authenticated } = useRequireAuth(`/presentations/${params.deckId}`);
  const deck = useGetPresentationDeck(params.deckId, { enabled: ready && authenticated });

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (deck.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (deck.isError || !deck.data) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl font-semibold">Deck not found</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This deck may have been deleted or the link is invalid.
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => router.push("/presentations")}>
            Back to AI Slides
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">{deck.data.deck.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
            {deck.data.deck.prompt}
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/presentations/new">New deck</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deck.data.slides.map((slide) => (
          <Card key={slide.id} className="overflow-hidden">
            <div className="relative w-full aspect-[16/9] bg-muted">
              {slide.project.thumbnailUrl ? (
                <Image
                  src={slide.project.thumbnailUrl}
                  alt={slide.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                  No preview yet
                </div>
              )}
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {slide.index + 1}. {slide.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="secondary" className="rounded-full">
                <Link href={`/editor/${slide.project.id}`}>Edit slide</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

