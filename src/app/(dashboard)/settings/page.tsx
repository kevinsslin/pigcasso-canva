"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader, MessageCircle, Send, TriangleAlert, Twitter } from "lucide-react";
import { toast } from "sonner";
import { usePrivy } from "@privy-io/react-auth";

import { useRequireAuth } from "@/features/auth/hooks/use-require-auth";
import { useMe } from "@/features/auth/api/use-me";
import { useUpdateMe } from "@/features/auth/api/use-update-me";
import { getAvatarFallbackText, getUserDisplayLabel } from "@/features/auth/lib/user-display";

import { uploadFiles } from "@/lib/uploadthing";
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
type SocialProvider = "twitter" | "discord" | "telegram";

export default function SettingsPage() {
  const { ready, authenticated } = useRequireAuth("/settings");
  const {
    logout,
    user: privyUser,
    linkTwitter,
    linkDiscord,
    linkTelegram,
    unlinkTwitter,
    unlinkDiscord,
    unlinkTelegram,
  } = usePrivy();
  const me = useMe({ enabled: ready && authenticated });
  const updateMe = useUpdateMe();

  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [bio, setBio] = useState("");
  const [unlinkingSocial, setUnlinkingSocial] = useState<SocialProvider | null>(null);
  const avatarUploadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const initializedUserIdRef = useRef<string | null>(null);

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

    if (initializedUserIdRef.current === meUser.id) {
      return;
    }

    initializedUserIdRef.current = meUser.id;
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
  const avatarUploadEnabled = uploadthingConfigured && !updateMe.isPending && !uploadingAvatar;

  const twitterAccount = privyUser?.twitter ?? null;
  const discordAccount = privyUser?.discord ?? null;
  const telegramAccount = privyUser?.telegram ?? null;

  const onConnectTwitter = () => {
    try {
      linkTwitter();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect X");
    }
  };

  const onConnectDiscord = () => {
    try {
      linkDiscord();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Discord");
    }
  };

  const onConnectTelegram = () => {
    try {
      linkTelegram();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to connect Telegram");
    }
  };

  const onDisconnectTwitter = async () => {
    if (!twitterAccount) return;
    setUnlinkingSocial("twitter");
    try {
      await unlinkTwitter(twitterAccount.subject);
      toast.success("Disconnected X.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect X");
    } finally {
      setUnlinkingSocial(null);
    }
  };

  const onDisconnectDiscord = async () => {
    if (!discordAccount) return;
    setUnlinkingSocial("discord");
    try {
      await unlinkDiscord(discordAccount.subject);
      toast.success("Disconnected Discord.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Discord");
    } finally {
      setUnlinkingSocial(null);
    }
  };

  const onDisconnectTelegram = async () => {
    if (!telegramAccount) return;
    setUnlinkingSocial("telegram");
    try {
      await unlinkTelegram(telegramAccount.telegramUserId);
      toast.success("Disconnected Telegram.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to disconnect Telegram");
    } finally {
      setUnlinkingSocial(null);
    }
  };

  const onUploadAvatar = async (file: File) => {
    if (!uploadthingConfigured) {
      toast.error("Avatar uploads are currently unavailable.");
      return;
    }

    setUploadingAvatar(true);
    clearAvatarUploadTimeout();
    toast.loading("Uploading avatar…", { id: AVATAR_UPLOAD_TOAST_ID });

    avatarUploadTimeoutRef.current = setTimeout(() => {
      toast.error("Upload is taking longer than expected. Please try again.", {
        id: AVATAR_UPLOAD_TOAST_ID,
        duration: 4000,
      });
      avatarUploadTimeoutRef.current = null;
      setUploadingAvatar(false);
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

      const uploaded = await uploadFiles("avatarUploader", {
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

      setImage(url);

      try {
        await updateMe.mutateAsync({ image: url });
        toast.success("Avatar updated.", {
          id: AVATAR_UPLOAD_TOAST_ID,
          duration: 3000,
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save avatar", {
          id: AVATAR_UPLOAD_TOAST_ID,
          duration: 4000,
        });
      }
    } catch (err) {
      toast.error(getUploadthingErrorMessage(err, { maxFileSizeLabel: "8MB" }), {
        id: AVATAR_UPLOAD_TOAST_ID,
        duration: 4000,
      });
    } finally {
      clearAvatarUploadTimeout();
      setUploadingAvatar(false);
    }
  };

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
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) {
                    void onUploadAvatar(file);
                  }
                }}
              />
              <Button
                type="button"
                variant="secondary"
                className="text-sm font-medium"
                disabled={!avatarUploadEnabled}
                onClick={() => avatarInputRef.current?.click()}
              >
                {uploadingAvatar ? <Loader className="mr-2 size-4 animate-spin" /> : null}
                Upload avatar
              </Button>
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
                <div className="text-xs text-muted-foreground">External wallets</div>
                {meUser?.wallets.externals?.length ? (
                  <div className="space-y-1">
                    {meUser.wallets.externals.map((address) => (
                      <div key={address} className="text-sm break-all">
                        {address}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">—</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social connections</CardTitle>
          <CardDescription>
            Link your social accounts for cross-channel attribution and future rewards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-sky-500/10">
                <Twitter className="size-4 text-sky-600" />
              </div>
              <div>
                <div className="text-sm font-medium">X</div>
                <div className="text-xs text-muted-foreground">
                  {twitterAccount?.username ? `@${twitterAccount.username}` : twitterAccount ? "Connected" : "Not connected"}
                </div>
              </div>
            </div>
            {twitterAccount ? (
              <Button
                type="button"
                variant="outline"
                disabled={unlinkingSocial === "twitter"}
                onClick={() => void onDisconnectTwitter()}
              >
                {unlinkingSocial === "twitter" ? (
                  <Loader className="mr-2 size-4 animate-spin" />
                ) : null}
                Disconnect
              </Button>
            ) : (
              <Button type="button" onClick={onConnectTwitter}>
                Connect
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-indigo-500/10">
                <MessageCircle className="size-4 text-indigo-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Discord</div>
                <div className="text-xs text-muted-foreground">
                  {discordAccount?.username ? `@${discordAccount.username}` : discordAccount ? "Connected" : "Not connected"}
                </div>
              </div>
            </div>
            {discordAccount ? (
              <Button
                type="button"
                variant="outline"
                disabled={unlinkingSocial === "discord"}
                onClick={() => void onDisconnectDiscord()}
              >
                {unlinkingSocial === "discord" ? (
                  <Loader className="mr-2 size-4 animate-spin" />
                ) : null}
                Disconnect
              </Button>
            ) : (
              <Button type="button" onClick={onConnectDiscord}>
                Connect
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-cyan-500/10">
                <Send className="size-4 text-cyan-600" />
              </div>
              <div>
                <div className="text-sm font-medium">Telegram</div>
                <div className="text-xs text-muted-foreground">
                  {telegramAccount?.username ? `@${telegramAccount.username}` : telegramAccount ? "Connected" : "Not connected"}
                </div>
              </div>
            </div>
            {telegramAccount ? (
              <Button
                type="button"
                variant="outline"
                disabled={unlinkingSocial === "telegram"}
                onClick={() => void onDisconnectTelegram()}
              >
                {unlinkingSocial === "telegram" ? (
                  <Loader className="mr-2 size-4 animate-spin" />
                ) : null}
                Disconnect
              </Button>
            ) : (
              <Button type="button" onClick={onConnectTelegram}>
                Connect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
