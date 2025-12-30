"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { toast } from "sonner";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useMe } from "@/features/auth/api/use-me";
import { useUpdateMe } from "@/features/auth/api/use-update-me";

import { UploadButton } from "@/lib/uploadthing";
import { getAuthToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const AI_PROVIDER_STORAGE_KEY = "pigcasso:ai-provider-default";

export default function SettingsPage() {
  const { ready, authenticated } = useRequireAuth("/settings");
  const me = useMe({ enabled: ready && authenticated });
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [bio, setBio] = useState("");
  const [aiProvider, setAiProvider] = useState<"replicate" | "gemini" | "auto">("auto");
  const uploadToastIdRef = useRef<string | number | null>(null);

  const meUser = me.data?.data.user;
  const integrations = me.data?.data.integrations;
  const aiMeta = me.data?.data.ai;
  const providers = aiMeta?.providers;

  const derivedAiProvider = useMemo(() => {
    if (aiProvider !== "auto") return aiProvider;
    return aiMeta?.defaultProvider ?? "replicate";
  }, [aiMeta?.defaultProvider, aiProvider]);

  useEffect(() => {
    if (!meUser) {
      return;
    }
    setName(meUser.name ?? "");
    setImage(meUser.image ?? "");
    setBio(meUser.bio ?? "");
  }, [meUser]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AI_PROVIDER_STORAGE_KEY);
      if (stored === "replicate" || stored === "gemini") {
        setAiProvider(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const onSaveProfile = () => {
    updateMe.mutate(
      { name, image, bio },
      {
        onSuccess: () => {
          toast.success("Profile updated.");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to update profile");
        },
      },
    );
  };

  const setPreferredProvider = (next: "replicate" | "gemini" | "auto") => {
    setAiProvider(next);

    try {
      if (next === "auto") {
        localStorage.removeItem(AI_PROVIDER_STORAGE_KEY);
      } else {
        localStorage.setItem(AI_PROVIDER_STORAGE_KEY, next);
      }
    } catch {
      // ignore
    }
  };

  const canSelectGemini = providers?.gemini !== false;
  const canSelectReplicate = providers?.replicate !== false;
  const uploadthingConfigured = integrations?.uploadthing.configured === true;
  const unsplashConfigured = integrations?.unsplash.configured === true;

  return (
    <div className="max-w-screen-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your display name and avatar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="size-14">
              {meUser?.image ? (
                <AvatarImage src={meUser.image} alt={meUser.name ?? "Avatar"} />
              ) : null}
              <AvatarFallback className="bg-slate-900 font-medium text-white">
                {(meUser?.name ?? meUser?.email ?? "A").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <UploadButton
                appearance={{
                  button: "text-sm font-medium",
                  allowedContent: "hidden",
                }}
                content={{ button: "Upload avatar" }}
                disabled={!uploadthingConfigured || updateMe.isPending}
                endpoint="avatarUploader"
                headers={async () => {
                  const token = await getAuthToken();
                  return token
                    ? { Authorization: `Bearer ${token}` }
                    : new Headers();
                }}
                onUploadBegin={() => {
                  uploadToastIdRef.current = toast.loading("Uploading avatar…");
                }}
                onUploadError={(err) => {
                  toast.error(err.message || "Upload failed", {
                    id: uploadToastIdRef.current ?? undefined,
                  });
                  uploadToastIdRef.current = null;
                }}
                onClientUploadComplete={async () => {
                  toast.success("Avatar updated.", {
                    id: uploadToastIdRef.current ?? undefined,
                  });
                  uploadToastIdRef.current = null;
                  await queryClient.invalidateQueries({ queryKey: ["me"] });
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {!uploadthingConfigured
                  ? "UploadThing is not configured on the server. Set `UPLOADTHING_APP_ID` + `UPLOADTHING_SECRET`."
                  : "If uploads fail (e.g. 400 Unsupported operation), rotate keys / verify UploadThing project & plan, or paste an image URL below and save."}
              </p>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Your name"
              disabled={updateMe.isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-image">Avatar URL</Label>
            <Input
              id="profile-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
              disabled={updateMe.isPending}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={4}
              placeholder="A short introduction…"
              disabled={updateMe.isPending}
            />
            <div className="text-xs text-muted-foreground">
              {bio.trim().length}/280
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setName(meUser?.name ?? "");
              setImage(meUser?.image ?? "");
              setBio(meUser?.bio ?? "");
            }}
            disabled={updateMe.isPending}
          >
            Reset
          </Button>
          <Button type="button" onClick={onSaveProfile} disabled={updateMe.isPending}>
            Save
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Check external services configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">UploadThing</div>
              <div className="text-xs text-muted-foreground">
                Used for image uploads.
              </div>
            </div>
            <div className={cn(
              "text-xs px-2 py-1 rounded-full border",
              uploadthingConfigured
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200",
            )}>
              {uploadthingConfigured ? "Configured" : "Missing env"}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Unsplash</div>
              <div className="text-xs text-muted-foreground">
                Used for the image search sidebar.
              </div>
            </div>
            <div className={cn(
              "text-xs px-2 py-1 rounded-full border",
              unsplashConfigured
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-yellow-50 text-yellow-700 border-yellow-200",
            )}>
              {unsplashConfigured ? "Configured" : "Missing env"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI</CardTitle>
          <CardDescription>Choose the default provider for AI tools.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={aiProvider === "auto" ? "default" : "outline"}
              onClick={() => setPreferredProvider("auto")}
            >
              Auto
            </Button>
            <Button
              type="button"
              variant={aiProvider === "replicate" ? "default" : "outline"}
              onClick={() => setPreferredProvider("replicate")}
              disabled={!canSelectReplicate}
            >
              Replicate
            </Button>
            <Button
              type="button"
              variant={aiProvider === "gemini" ? "default" : "outline"}
              onClick={() => setPreferredProvider("gemini")}
              disabled={!canSelectGemini}
            >
              Gemini
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            Current default: <span className="font-medium">{derivedAiProvider}</span>
          </div>
          {providers?.replicate === false || providers?.gemini === false ? (
            <div className="text-xs text-muted-foreground">
              {providers?.replicate === false ? (
                <div>Replicate requires `REPLICATE_API_TOKEN`.</div>
              ) : null}
              {providers?.gemini === false ? (
                <div>Gemini requires `GEMINI_API_KEY`.</div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Wallet addresses and token gating status.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm">{meUser?.email ?? "—"}</div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Embedded wallet</div>
                <div className={cn("text-sm break-all", !meUser?.wallets.embedded && "text-muted-foreground")}>
                  {meUser?.wallets.embedded ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">External wallet</div>
                <div className={cn("text-sm break-all", !meUser?.wallets.external && "text-muted-foreground")}>
                  {meUser?.wallets.external ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
