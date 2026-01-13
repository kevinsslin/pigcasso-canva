import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

import type { MintStepKey, MintStepsState } from "@/features/editor/components/export-nft-dialog/lib/types";

type MintStep = { key: MintStepKey; label: string };

export const MintProgressView = ({
  projectName,
  pageLabel,
  mintStepList,
  mintSteps,
  previewUrl,
  tokenUriForDisplay,
  imageUrlForDisplay,
  mintResult,
  mintError,
  isMinting,
  canRetry,
  onBack,
  onRetry,
}: {
  projectName: string;
  pageLabel: string;
  mintStepList: MintStep[];
  mintSteps: MintStepsState;
  previewUrl: string | null;
  tokenUriForDisplay: string | null;
  imageUrlForDisplay: string | null;
  mintResult:
    | {
        collectionAddress: `0x${string}`;
        txHash: `0x${string}`;
        tokenId: string | null;
        tokenUri: string;
      }
    | null;
  mintError: string | null;
  isMinting: boolean;
  canRetry: boolean;
  onBack: () => void;
  onRetry: () => void;
}) => {
  const renderStepIcon = (status: MintStepsState[MintStepKey]["status"], stepNumber: number) => {
    if (status === "active") {
      return (
        <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="size-4 animate-spin text-primary" />
        </div>
      );
    }
    if (status === "done") {
      return <CheckCircle2 className="size-6 text-green-500" />;
    }
    if (status === "skipped") {
      return <CheckCircle2 className="size-6 text-muted-foreground" />;
    }
    if (status === "error") {
      return <AlertTriangle className="size-6 text-destructive" />;
    }
    return (
      <div className="size-6 rounded-full border flex items-center justify-center text-xs font-medium text-muted-foreground">
        {stepNumber}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3 text-sm">
        <div className="font-medium">{projectName}</div>
        <div className="text-xs text-muted-foreground">{pageLabel}</div>
      </div>

      <div className="rounded-xl border p-3 space-y-3">
        <div className="text-sm font-medium">Progress</div>
        <ol className="space-y-3">
          {mintStepList.map((step, index) => {
            const state = mintSteps[step.key];
            return (
              <li key={step.key} className="flex items-start gap-3">
                {renderStepIcon(state.status, index + 1)}
                <div className="min-w-0">
                  <div className="text-sm font-medium">{step.label}</div>
                  {state.detail ? (
                    <div className="text-xs text-muted-foreground break-words">
                      {state.detail}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {previewUrl ? (
        <div className="rounded-xl border overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="NFT preview" className="w-full h-auto" />
        </div>
      ) : null}

      {tokenUriForDisplay ? (
        <div className="rounded-lg border p-3 text-xs space-y-1">
          <div className="font-medium">Metadata URL (tokenURI)</div>
          <div className="font-mono break-all">{tokenUriForDisplay}</div>
        </div>
      ) : null}

      {imageUrlForDisplay ? (
        <div className="rounded-lg border p-3 text-xs space-y-1">
          <div className="font-medium">Image URL</div>
          <div className="font-mono break-all">{imageUrlForDisplay}</div>
        </div>
      ) : null}

      {mintResult ? (
        <div className="rounded-lg border p-3 text-xs space-y-1">
          <div className="font-medium">Mint result</div>
          <div className="font-mono break-all">Collection: {mintResult.collectionAddress}</div>
          <div className="font-mono break-all">Tx: {mintResult.txHash}</div>
          <div className="font-mono break-all">Token ID: {mintResult.tokenId ?? "Unknown"}</div>
          <div className="font-mono break-all">Token URI: {mintResult.tokenUri}</div>
        </div>
      ) : null}

      {mintError ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive">
          {mintError}
        </div>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="secondary" onClick={onBack} disabled={isMinting}>
          Back
        </Button>
        {canRetry ? (
          <Button type="button" onClick={onRetry} disabled={isMinting}>
            Retry
          </Button>
        ) : null}
      </DialogFooter>
    </div>
  );
};

