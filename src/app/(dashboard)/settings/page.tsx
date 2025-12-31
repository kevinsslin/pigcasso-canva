"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useMe } from "@/features/auth/api/use-me";
import { useUpdateMe } from "@/features/auth/api/use-update-me";
import { getAvatarFallbackText, getUserDisplayLabel } from "@/features/auth/lib/user-display";

import { UploadButton } from "@/lib/uploadthing";
import { getAuthToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import { getUploadthingErrorMessage } from "@/lib/uploadthing-errors";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

const AVATAR_UPLOAD_TOAST_ID = "pigcasso:upload-avatar";

export default function SettingsPage() {
  const { ready, authenticated } = useRequireAuth("/settings");
  const { logout } = usePrivy();
  const me = useMe({ enabled: ready && authenticated });
  const updateMe = useUpdateMe();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [bio, setBio] = useState("");
  const avatarUploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAvatarUploadTimeout = () => {
    if (!avatarUploadTimeoutRef.current) return;
    clearTimeout(avatarUploadTimeoutRef.current);
    avatarUploadTimeoutRef.current = null;
  };

  const meUser = me.data?.data.user;
  const integrations = me.data?.data.integrations;
  const displayLabel = useMemo(() => {
    const walletAddress = meUser?.wallets.external ?? meUser?.wallets.embedded ?? null;
    return getUserDisplayLabel({
      name,
      email: meUser?.email,
      walletAddress,
    });
  }, [meUser?.email, meUser?.wallets.embedded, meUser?.wallets.external, name]);

  useEffect(() => {
    if (!meUser) {
      return;
    }
    setName(meUser.name ?? "");
    setImage(meUser.image ?? "");
    setBio(meUser.bio ?? "");
  }, [meUser]);

  useEffect(() => {
    return () => clearAvatarUploadTimeout();
  }, []);

  if (!ready || !authenticated) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (me.isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader className="size-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <div className="max-w-screen-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and preferences.
          </p>
        </div>

        <div className="rounded-lg border p-4 flex items-start gap-3">
          <TriangleAlert className="mt-0.5 size-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Failed to load your account</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {me.error?.message || "Unauthorized"}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => me.refetch()}>
                Retry
              </Button>
              <Button type="button" variant="outline" onClick={() => logout()}>
                Log out
              </Button>
            </div>
          </div>
        </div>
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

  const uploadthingConfigured = integrations?.uploadthing.configured === true;
  const avatarUrl = image.trim() ? image.trim() : null;

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
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={displayLabel} />
              ) : null}
              <AvatarFallback className="bg-slate-900 font-medium text-white">
                {getAvatarFallbackText(displayLabel)}
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
                onUploadBegin={() => {
                  clearAvatarUploadTimeout();
                  toast.loading("Uploading avatar…", { id: AVATAR_UPLOAD_TOAST_ID });
                  avatarUploadTimeoutRef.current = setTimeout(() => {
                    toast.dismiss(AVATAR_UPLOAD_TOAST_ID);
                    avatarUploadTimeoutRef.current = null;
                  }, 60_000);
                }}
                onUploadError={(err) => {
                  clearAvatarUploadTimeout();
                  toast.error(getUploadthingErrorMessage(err, { maxFileSizeLabel: "8MB" }), {
                    id: AVATAR_UPLOAD_TOAST_ID,
                    duration: 4000,
                  });
                }}
                onClientUploadComplete={async (res) => {
                  clearAvatarUploadTimeout();
                  const url = res?.[0]?.ufsUrl ?? res?.[0]?.url;
                  if (url) {
                    setImage(url);
                  }
                  toast.success("Avatar updated.", {
                    id: AVATAR_UPLOAD_TOAST_ID,
                    duration: 2000,
                  });
                  await queryClient.invalidateQueries({ queryKey: ["me"] });
                }}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {uploadthingConfigured
                  ? "PNG/JPG up to 8MB. You can also paste an image URL below."
                  : "Avatar uploads are currently unavailable."}
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
