import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Loader } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useMe } from "@/features/auth/api/use-me";
import { useGetImages } from "@/features/images/api/use-get-images";

import { cn } from "@/lib/utils";
import { UploadButton } from "@/lib/uploadthing";
import { getAuthToken } from "@/lib/auth-token";
import { getUploadthingErrorMessage } from "@/lib/uploadthing-errors";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const ImageSidebar = ({ editor, activeTool, onChangeActiveTool }: ImageSidebarProps) => {
  const me = useMe();
  const unsplashConfigured = me.data?.data.integrations?.unsplash.configured;
  const { data, isLoading, isError, error } = useGetImages({
    enabled: unsplashConfigured === true,
  });
  const imageUploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadthingConfigured = me.data?.data.integrations?.uploadthing.configured;

  const clearImageUploadTimeout = () => {
    if (!imageUploadTimeoutRef.current) return;
    clearTimeout(imageUploadTimeoutRef.current);
    imageUploadTimeoutRef.current = null;
  };

  useEffect(() => {
    return () => clearImageUploadTimeout();
  }, []);

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "images" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Images" description="Add images to your canvas" />
      <div className="p-4 border-b">
        <UploadButton
          appearance={{
            button: "w-full text-sm font-medium",
            allowedContent: "hidden",
          }}
          content={{
            button: "Upload Image",
          }}
          disabled={uploadthingConfigured !== true}
          headers={async () => {
            const token = await getAuthToken({
              maxWaitMs: 2000,
              retries: 4,
              retryDelayMs: 200,
            });
            const headers: Record<string, string> = token
              ? { Authorization: `Bearer ${token}` }
              : {};
            return headers;
          }}
          endpoint="imageUploader"
          onUploadBegin={() => {
            clearImageUploadTimeout();
            toast.loading("Uploading image…", { id: "pigcasso:upload-image" });
            imageUploadTimeoutRef.current = setTimeout(() => {
              toast.dismiss("pigcasso:upload-image");
              imageUploadTimeoutRef.current = null;
            }, 60_000);
          }}
          onUploadError={(err) => {
            clearImageUploadTimeout();
            toast.error(getUploadthingErrorMessage(err, { maxFileSizeLabel: "4MB" }), {
              id: "pigcasso:upload-image",
              duration: 4000,
            });
          }}
          onClientUploadComplete={(res) => {
            clearImageUploadTimeout();
            toast.success("Upload complete.", {
              id: "pigcasso:upload-image",
              duration: 2000,
            });
            const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
            if (url) {
              editor?.addImage(url);
            }
          }}
        />
        {uploadthingConfigured === false ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Uploads are currently unavailable.
          </p>
        ) : null}
        {unsplashConfigured === false ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Stock images are currently unavailable.
          </p>
        ) : null}
      </div>
      {unsplashConfigured === true && isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader className="size-4 text-muted-foreground animate-spin" />
        </div>
      )}
      {unsplashConfigured === true && isError && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            {error?.message || "Failed to fetch images"}
          </p>
        </div>
      )}
      {unsplashConfigured === true ? (
        <ScrollArea>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {data &&
                data.map((image) => {
                  const previewSrc = image?.urls?.small || image?.urls?.thumb;

                  return (
                    <button
                      onClick={() => editor?.addImage(image.urls.regular)}
                      key={image.id}
                      className="relative w-full h-[100px] group hover:opacity-75 transition bg-muted rounded-sm overflow-hidden border"
                    >
                      {previewSrc ? (
                        <Image
                          fill
                          src={previewSrc}
                          alt={image.alt_description || "Image"}
                          className="object-cover"
                          sizes="(max-width: 768px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted" />
                      )}
                      <Link
                        target="_blank"
                        href={image.links.html}
                        className="opacity-0 group-hover:opacity-100 absolute left-0 bottom-0 w-full text-[10px] truncate text-white hover:underline p-1 bg-black/50 text-left"
                      >
                        {image.user.name}
                      </Link>
                    </button>
                  );
                })}
            </div>
          </div>
        </ScrollArea>
      ) : unsplashConfigured === false ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Stock images are currently unavailable.
          </p>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <Loader className="size-4 text-muted-foreground animate-spin" />
        </div>
      )}
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
