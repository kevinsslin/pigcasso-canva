import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, Loader } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useMemo, useRef, useState } from "react";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useMe } from "@/features/auth/api/use-me";
import { useGetImages } from "@/features/images/api/use-get-images";

import { cn } from "@/lib/utils";
import { uploadFiles } from "@/lib/uploadthing";
import { getAuthToken } from "@/lib/auth-token";
import { getUploadthingErrorMessage } from "@/lib/uploadthing-errors";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ImageSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const ImageSidebar = ({ editor, activeTool, onChangeActiveTool }: ImageSidebarProps) => {
  const me = useMe();
  const unsplashConfigured = me.data?.data.integrations?.unsplash.configured;
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState("");
  const imagesQuery = useGetImages({
    enabled: unsplashConfigured === true,
    query,
  });
  const images = useMemo(
    () => imagesQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [imagesQuery.data],
  );
  const imageUploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
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

  const onSearch = () => {
    setQuery(searchText.trim());
  };

  const onUploadImage = async (file: File) => {
    if (!editor) {
      toast.error("Editor not ready yet.");
      return;
    }

    if (uploadthingConfigured !== true) {
      toast.error("Uploads are currently unavailable.");
      return;
    }

    setUploadingImage(true);
    clearImageUploadTimeout();

    toast.loading("Uploading image…", { id: "pigcasso:upload-image" });
    imageUploadTimeoutRef.current = setTimeout(() => {
      toast.error("Upload is taking longer than expected. Please try again.", {
        id: "pigcasso:upload-image",
        duration: 4000,
      });
      imageUploadTimeoutRef.current = null;
    }, 60_000);

    try {
      const token = await getAuthToken({
        maxWaitMs: 2000,
        retries: 4,
        retryDelayMs: 200,
      });

      if (!token) {
        throw new Error("Missing auth token. Please sign in again.");
      }

      const uploaded = await uploadFiles("imageUploader", {
        files: [file],
        headers: { Authorization: `Bearer ${token}` },
      });

      const url =
        uploaded?.[0]?.ufsUrl ??
        uploaded?.[0]?.url ??
        (uploaded?.[0] as { serverData?: { url?: string } } | undefined)?.serverData?.url;

      if (!url) {
        throw new Error("Upload finished but no URL was returned.");
      }

      editor.addImage(url);

      toast.success("Upload complete.", {
        id: "pigcasso:upload-image",
        duration: 2000,
      });
    } catch (err) {
      toast.error(getUploadthingErrorMessage(err, { maxFileSizeLabel: "4MB" }), {
        id: "pigcasso:upload-image",
        duration: 4000,
      });
    } finally {
      setUploadingImage(false);
      clearImageUploadTimeout();
    }
  };

  return (
    <aside
      className={cn(
        "bg-white border-border flex flex-col fixed inset-x-0 bottom-0 z-[70] h-[75vh] max-h-[75vh] rounded-t-2xl border-t shadow-2xl lg:relative lg:inset-auto lg:z-[40] lg:w-[360px] lg:h-full lg:rounded-none lg:border-t-0 lg:border-r lg:shadow-none",
        activeTool === "images" ? "flex" : "hidden"
      )}
    >
      <ToolSidebarHeader title="Images" description="Add images to your canvas" />
      <div className="p-4 border-b">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) {
              void onUploadImage(file);
            }
          }}
        />
        <Button
          type="button"
          className="w-full text-sm font-medium"
          variant="secondary"
          disabled={uploadthingConfigured !== true || uploadingImage}
          onClick={() => imageInputRef.current?.click()}
        >
          {uploadingImage ? (
            <Loader className="mr-2 size-4 animate-spin" />
          ) : null}
          Upload image
        </Button>
        {uploadthingConfigured === false ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Uploads are currently unavailable.
          </p>
        ) : null}

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
        >
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search Unsplash…"
            disabled={unsplashConfigured !== true}
          />
          <Button
            type="submit"
            variant="secondary"
            disabled={unsplashConfigured !== true || !searchText.trim()}
          >
            Search
          </Button>
        </form>

        {unsplashConfigured === false ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Stock images are currently unavailable.
          </p>
        ) : null}
      </div>
      {unsplashConfigured === true && query.trim().length > 0 && imagesQuery.isLoading && (
        <div className="flex items-center justify-center flex-1">
          <Loader className="size-4 text-muted-foreground animate-spin" />
        </div>
      )}
      {unsplashConfigured === true && query.trim().length > 0 && imagesQuery.isError && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            {imagesQuery.error?.message || "Failed to fetch images"}
          </p>
        </div>
      )}
      {unsplashConfigured === true && query.trim().length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">
            Search Unsplash to add images to your canvas.
          </p>
        </div>
      ) : unsplashConfigured === true ? (
        <ScrollArea className="flex-1">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {images.map((image) => {
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

            {imagesQuery.hasNextPage ? (
              <Button
                type="button"
                variant="secondary"
                className="w-full mt-4"
                onClick={() => imagesQuery.fetchNextPage()}
                disabled={imagesQuery.isFetchingNextPage}
              >
                {imagesQuery.isFetchingNextPage ? (
                  <Loader className="mr-2 size-4 animate-spin" />
                ) : null}
                Load more
              </Button>
            ) : null}
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
