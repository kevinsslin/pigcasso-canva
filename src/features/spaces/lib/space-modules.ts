import type { LucideIcon } from "lucide-react";
import {
  FileText,
  GalleryThumbnails,
  Image as ImageIcon,
  Link as LinkIcon,
  UserRound,
  Wallet,
} from "lucide-react";

import type { SpaceBlock } from "@/features/spaces/lib/space-document";

export type SpaceModuleCategory = "Basics" | "Web3";

export type SpaceModuleDefinition = {
  type: SpaceBlock["type"];
  label: string;
  description: string;
  category: SpaceModuleCategory;
  icon: LucideIcon;
  defaultLayout: { w: number; h: number };
  createData: () => SpaceBlock["data"];
};

export const SPACE_MODULES: SpaceModuleDefinition[] = [
  {
    type: "bio",
    label: "Bio card",
    description: "Hero identity card.",
    category: "Basics",
    icon: UserRound,
    defaultLayout: { w: 2, h: 2 },
    createData: () => ({
      displayName: "Pigcasso Creator",
      subtitle: "Web3 Builder",
      bio: "A public gateway page powered by Pigcasso.",
      avatarUrl: null,
      statusLabel: "Available",
    }),
  },
  {
    type: "links",
    label: "Link stack",
    description: "Buttons to your links.",
    category: "Basics",
    icon: LinkIcon,
    defaultLayout: { w: 2, h: 1 },
    createData: () => ({
      title: "Links",
      description: null,
      links: [],
    }),
  },
  {
    type: "image",
    label: "Image",
    description: "Photo / banner.",
    category: "Basics",
    icon: ImageIcon,
    defaultLayout: { w: 1, h: 1 },
    createData: () => ({
      title: null,
      imageUrl: null,
    }),
  },
  {
    type: "text",
    label: "Text",
    description: "A short paragraph.",
    category: "Basics",
    icon: FileText,
    defaultLayout: { w: 1, h: 1 },
    createData: () => ({
      title: "Note",
      body: "Write something about yourself.",
    }),
  },
  {
    type: "stat",
    label: "Stat",
    description: "A single metric.",
    category: "Basics",
    icon: Wallet,
    defaultLayout: { w: 1, h: 1 },
    createData: () => ({
      label: "Followers",
      value: "0",
      tone: "secondary",
    }),
  },
  {
    type: "nftShowcase",
    label: "NFT showcase",
    description: "Show NFTs you own (manual add).",
    category: "Web3",
    icon: GalleryThumbnails,
    defaultLayout: { w: 2, h: 2 },
    createData: () => ({
      title: "NFT showcase",
      description: null,
      items: [],
    }),
  },
];

export const getSpaceModuleDefinition = (type: SpaceBlock["type"]) =>
  SPACE_MODULES.find((module) => module.type === type) ?? null;
