"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { WEB3_PRESETS } from "@/features/editor/web3-presets";
import { useCreateProject } from "@/features/projects/api/use-create-project";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const PresetsSection = () => {
  const router = useRouter();
  const mutation = useCreateProject();

  const onClick = (preset: (typeof WEB3_PRESETS)[number]) => {
    mutation.mutate(
      {
        name: preset.name,
        json: "",
        width: preset.width,
        height: preset.height,
      },
      {
        onSuccess: ({ data }) => {
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-lg">Web3 Presets</h3>
        <p className="text-sm text-muted-foreground">
          Start with common sizes for X, Telegram, and Discord.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {WEB3_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onClick(preset)}
            disabled={mutation.isPending}
            className="text-left group"
          >
            <Card className="overflow-hidden transition group-hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{preset.name}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {preset.width}×{preset.height} · Safe margin{" "}
                  {preset.safeMargin}px
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">
                  {preset.description}
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-gradient-to-r from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF] opacity-80" />
                {mutation.isPending ? (
                  <div className="mt-3 flex items-center text-xs text-muted-foreground">
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating…
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
};

