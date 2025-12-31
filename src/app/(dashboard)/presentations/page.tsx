"use client";

import Link from "next/link";
import { useState } from "react";
import { Loader } from "lucide-react";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useListPresentationDecks } from "@/features/presentations/api/use-list-presentation-decks";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PresentationsPage() {
  const { ready, authenticated } = useRequireAuth("/presentations");
  const [page, setPage] = useState(1);
  const decks = useListPresentationDecks({ page, limit: 12 }, { enabled: ready && authenticated });

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
        <div>
          <h1 className="text-2xl font-semibold">AI Slides</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Generated decks are saved as editable slide projects.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/presentations/new">New deck</Link>
        </Button>
      </div>

      {decks.isLoading ? (
        <div className="flex items-center justify-center h-[40vh]">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      ) : decks.isError ? (
        <div className="text-sm text-muted-foreground">
          {decks.error.message || "Failed to load decks"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {decks.data?.data?.map((deck) => (
              <Card key={deck.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{deck.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-3">
                  <div className="line-clamp-2 whitespace-pre-wrap">{deck.prompt}</div>
                  <Button asChild variant="secondary" className="rounded-full">
                    <Link href={`/presentations/${deck.id}`}>Open deck</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!decks.data?.nextPage}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

