import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { MessageCircle, Send, Twitter, Wallet } from "lucide-react";

import { getAvatarFallbackText, getUserDisplayLabel, shortenWalletAddress } from "@/features/auth/lib/user-display";
import { getPublicSpaceData } from "@/server/space";
import { getPublishedSpaceDocumentForUserId } from "@/server/space-documents";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { SpaceOwnerActions } from "@/features/spaces/components/space-owner-actions";
import { BentoSpacePage } from "@/features/spaces/components/space-public/bento-space-page";

import { CopySpaceLink } from "./copy-space-link";

type PageProps = {
  params: { handle: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  noStore();
  const data = await getPublicSpaceData(params.handle);
  if (!data) {
    return {
      title: "Pigcasso Space",
      description: "A Web3-native public gateway page for Pigcasso creators.",
    };
  }

  const displayLabel = getUserDisplayLabel({
    name: data.user.name,
    walletAddress: data.user.wallets.primary,
  });

  const title = `${displayLabel} • Pigcasso Space`;

  return {
    title,
    description:
      data.user.bio ??
      "A Web3-native public gateway page for Pigcasso creators.",
    openGraph: {
      title,
      description:
        data.user.bio ??
        "A Web3-native public gateway page for Pigcasso creators.",
      images: data.user.image ? [{ url: data.user.image }] : undefined,
    },
  };
}

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-soft">
    <div className="text-xs font-semibold text-muted-foreground">{label}</div>
    <div className="mt-1 text-lg font-extrabold tracking-tight text-gray-900">{value}</div>
  </div>
);

const SocialLink = ({
  icon,
  label,
  username,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  username: string | null;
  href?: string | null;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-soft">
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-cyan-400/15 border border-white/50">
        {icon}
      </div>
      <div>
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="text-xs text-muted-foreground">
          {username ? `@${username}` : "Not linked"}
        </div>
      </div>
    </div>
    {username && href ? (
      <Button asChild variant="outline" size="sm">
        <Link href={href} target="_blank" rel="noreferrer">
          Visit
        </Link>
      </Button>
    ) : (
      <span className="text-xs text-muted-foreground">—</span>
    )}
  </div>
);

export default async function SpacePage({ params }: PageProps) {
  noStore();
  const data = await getPublicSpaceData(params.handle);
  if (!data) {
    notFound();
  }

  const displayLabel = getUserDisplayLabel({
    name: data.user.name,
    walletAddress: data.user.wallets.primary,
  });

  const pagePath = `/space/${encodeURIComponent(data.handle)}`;

  const twitterUrl = data.user.socials.twitter?.username
    ? `https://x.com/${data.user.socials.twitter.username}`
    : null;
  const discordUrl = null;
  const telegramUrl = data.user.socials.telegram?.username
    ? `https://t.me/${data.user.socials.telegram.username}`
    : null;

  const wallet = data.user.wallets.primary;
  const walletLabel = wallet ? shortenWalletAddress(wallet) : "—";

  const publishedDocument = await getPublishedSpaceDocumentForUserId(data.user.id);
  if (publishedDocument) {
    return (
      <main className="relative min-h-screen bg-background">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute top-[30%] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="absolute bottom-[-12rem] right-[20%] h-[30rem] w-[30rem] rounded-full bg-yellow-300/10 blur-3xl" />
        </div>

        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/logo-pig.png"
                alt="Pigcasso"
                width={40}
                height={40}
                className="rounded-2xl"
              />
              <div className="leading-tight">
                <div className="text-sm font-extrabold tracking-tight text-gray-900">
                  Pigcasso Space
                </div>
                <div className="text-xs text-muted-foreground">
                  Public gateway page
                </div>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <CopySpaceLink path={pagePath} />
              <SpaceOwnerActions spaceUserId={data.user.id} hasPublishedDocument />
              <Button asChild size="sm">
                <Link href="/app">Open App</Link>
              </Button>
            </div>
          </div>
        </header>

        <BentoSpacePage
          handle={data.handle}
          walletLabel={walletLabel === "—" ? null : walletLabel}
          document={publishedDocument}
        />

        <footer className="border-t border-white/60 bg-white/70 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>© {new Date().getFullYear()} Pigcasso.</div>
              <div className="flex items-center gap-4">
                <Link href="/" className="hover:text-gray-900 transition-colors">
                  Home
                </Link>
                <Link href="/app" className="hover:text-gray-900 transition-colors">
                  Open App
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute top-[30%] left-[-10rem] h-[28rem] w-[28rem] rounded-full bg-cyan-400/12 blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[20%] h-[30rem] w-[30rem] rounded-full bg-yellow-300/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-pig.png"
              alt="Pigcasso"
              width={40}
              height={40}
              className="rounded-2xl"
            />
            <div className="leading-tight">
              <div className="text-sm font-extrabold tracking-tight text-gray-900">
                Pigcasso Space
              </div>
              <div className="text-xs text-muted-foreground">
                Public gateway page
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <CopySpaceLink path={pagePath} />
            <SpaceOwnerActions spaceUserId={data.user.id} hasPublishedDocument={false} />
            <Button asChild size="sm">
              <Link href="/app">Open App</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5 bg-white/80 backdrop-blur border-white/60 shadow-soft overflow-hidden">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-white/0 to-cyan-400/15" />
              <div className="relative p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <Avatar className="size-16 ring-2 ring-white/70 shadow-soft">
                    {data.user.image ? (
                      <AvatarImage src={data.user.image} alt={displayLabel} />
                    ) : null}
                    <AvatarFallback className="bg-slate-900 font-bold text-white">
                      {getAvatarFallbackText(displayLabel)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="text-2xl font-extrabold tracking-tight text-gray-900 truncate">
                      {displayLabel}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center rounded-full border border-white/70 bg-white/70 px-3 py-1 font-semibold">
                        @{data.handle}
                      </span>
                      {wallet ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/70 bg-white/70 px-3 py-1 font-semibold">
                          <Wallet className="size-3" />
                          {walletLabel}
                        </span>
                      ) : null}
                    </div>

                    {data.user.bio ? (
                      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                        {data.user.bio}
                      </p>
                    ) : (
                      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                        This creator hasn’t added a bio yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <Stat label="Public templates" value={data.stats.templates.public} />
                  <Stat label="Remixes received" value={data.stats.templates.remixesReceived} />
                  <Stat label="Template tokens" value={data.stats.templates.tokens} />
                  <Stat label="NFTs minted" value={data.stats.nfts.minted} />
                </div>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-7 grid gap-6">
            <Card className="bg-white/80 backdrop-blur border-white/60 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Social & Communities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SocialLink
                  icon={<Twitter className="size-4 text-sky-600" />}
                  label="X"
                  username={data.user.socials.twitter?.username ?? null}
                  href={twitterUrl}
                />
                <SocialLink
                  icon={<MessageCircle className="size-4 text-indigo-600" />}
                  label="Discord"
                  username={data.user.socials.discord?.username ?? null}
                  href={discordUrl}
                />
                <SocialLink
                  icon={<Send className="size-4 text-cyan-700" />}
                  label="Telegram"
                  username={data.user.socials.telegram?.username ?? null}
                  href={telegramUrl}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/80 backdrop-blur border-white/60 shadow-soft">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Pigcasso Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                {data.highlights.templates.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {data.highlights.templates.map((template) => (
                      <div
                        key={template.id}
                        className="group overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-soft"
                      >
                        <div
                          className="relative w-full overflow-hidden"
                          style={{ aspectRatio: `${template.width}/${template.height}` }}
                        >
                          {template.thumbnailUrl ? (
                            <Image
                              fill
                              src={template.thumbnailUrl}
                              alt={template.name}
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
                              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FBE9E8] via-[#F7A9B8] to-[#25D6FF]" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-gray-900">
                              {template.remixCount} remixes
                            </span>
                            {template.token.printrTokenId ? (
                              <span className="rounded-full bg-white/85 px-2 py-1 text-[10px] font-semibold text-gray-900">
                                Token
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="p-3">
                          <div className="text-sm font-semibold text-gray-900 truncate">
                            {template.name}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {template.width}×{template.height}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/70 bg-white/60 p-6 text-sm text-muted-foreground">
                    No public templates yet.
                  </div>
                )}

                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Want to remix or mint? Sign in to open the full editor.
                  </div>
                  <Button asChild size="sm">
                    <Link href="/app">Open Pigcasso</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/60 bg-white/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} Pigcasso.</div>
            <div className="flex items-center gap-4">
              <Link href="/" className="hover:text-gray-900 transition-colors">
                Home
              </Link>
              <Link href="/app" className="hover:text-gray-900 transition-colors">
                Open App
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
