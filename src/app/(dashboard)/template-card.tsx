import Image from "next/image";
import { Coins, Crown } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeIpfsUrl } from "@/lib/ipfs";

interface TemplateCardProps {
  imageSrc: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  description: string;
  width: number;
  height: number;
  isPro: boolean | null;
  hasToken?: boolean;
};

export const TemplateCard = ({
  imageSrc,
  title,
  onClick,
  disabled,
  description,
  height,
  width,
  isPro,
  hasToken,
}: TemplateCardProps) => {
  const normalizedImageSrc = normalizeIpfsUrl(imageSrc);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "space-y-2 group text-left transition flex flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl",
        disabled ? "cursor-not-allowed opacity-75" : "cursor-pointer",
      )}
    >
      <div
        style={{ aspectRatio: `${width}/${height}` }}
        className="relative rounded-xl h-full w-full overflow-hidden border"
      >
        {normalizedImageSrc ? (
          <Image
            fill
            src={normalizedImageSrc}
            alt={title}
            sizes="(max-width: 768px) 50vw, 25vw"
            draggable={false}
            className="object-cover transition transform group-hover:scale-105 group-focus-visible:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]" />
        )}
        {isPro && (
          <div className="absolute top-2 right-2 h-10 w-10 flex items-center justify-center bg-black/50 rounded-full z-10">
            <Crown className="size-5 fill-yellow-500 text-yellow-500" />
          </div>
        )}
        {hasToken ? (
          <div className="absolute top-2 left-2 h-10 w-10 flex items-center justify-center bg-black/50 rounded-full z-10">
            <Coins className="size-5 text-white" />
          </div>
        ) : null}
        <div className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl backdrop-filter backdrop-blur-sm">
          <p className="text-white font-medium">
            Open in editor
          </p>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {title}
        </p>
        <p className="text-xs text-muted-foreground opacity-75">
          {description}
        </p>
      </div>
    </button>
  );
};
