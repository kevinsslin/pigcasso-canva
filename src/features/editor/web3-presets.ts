export type Web3PresetKey =
  | "x-post-4-5"
  | "tg-announcement-1-1"
  | "discord-event-16-9";

export type Web3Preset = {
  key: Web3PresetKey;
  name: string;
  description: string;
  width: number;
  height: number;
  safeMargin: number;
};

export const WEB3_PRESETS: Web3Preset[] = [
  {
    key: "x-post-4-5",
    name: "X Post (4:5)",
    description: "1080×1350 feed post (announcement / AMA / hero).",
    width: 1080,
    height: 1350,
    safeMargin: 96,
  },
  {
    key: "tg-announcement-1-1",
    name: "TG Announcement (1:1)",
    description: "1080×1080 Telegram announcement card.",
    width: 1080,
    height: 1080,
    safeMargin: 80,
  },
  {
    key: "discord-event-16-9",
    name: "Discord Event Banner (16:9)",
    description: "1920×1080 banner for events and streams.",
    width: 1920,
    height: 1080,
    safeMargin: 120,
  },
];

export const DEFAULT_PACK_PRESET_KEYS: Web3PresetKey[] = WEB3_PRESETS.map(
  (p) => p.key,
);

export const getPresetByKey = (key: Web3PresetKey) => {
  const preset = WEB3_PRESETS.find((p) => p.key === key);
  if (!preset) {
    throw new Error(`Unknown preset key: ${key}`);
  }
  return preset;
};

