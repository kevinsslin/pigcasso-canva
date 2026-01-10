export type ActiveAtMention = {
  start: number;
  query: string;
};

export const getActiveAtMention = (value: string): ActiveAtMention | null => {
  const text = value ?? "";
  const at = text.lastIndexOf("@");
  if (at < 0) return null;

  const tail = text.slice(at + 1);
  if (!tail) return { start: at, query: "" };

  // Only treat it as an active mention when it's the last token (no whitespace).
  if (/\s/.test(tail)) return null;
  return { start: at, query: tail };
};

export const applyAtMentionReplacement = (value: string, label: string): string => {
  const safeLabel = label.trim();
  if (!safeLabel) return value;

  const active = getActiveAtMention(value);
  if (!active) {
    const needsSpace = value.trim().length > 0 && !/\s$/.test(value);
    return `${value}${needsSpace ? " " : ""}@${safeLabel} `;
  }

  return `${value.slice(0, active.start)}@${safeLabel} `;
};

