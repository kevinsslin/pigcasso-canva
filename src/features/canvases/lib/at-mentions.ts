export type ActiveAtMention = {
  start: number;
  query: string;
};

const clampCursor = (cursorIndex: number, value: string) => {
  const max = value.length;
  if (!Number.isFinite(cursorIndex)) return max;
  return Math.max(0, Math.min(Math.floor(cursorIndex), max));
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

export const getActiveAtMentionAtCursor = (value: string, cursorIndex: number): ActiveAtMention | null => {
  const text = value ?? "";
  const cursor = clampCursor(cursorIndex, text);

  const beforeCursor = text.slice(0, cursor);
  const at = beforeCursor.lastIndexOf("@");
  if (at < 0) return null;

  // Mentions must start at the beginning of a token.
  if (at > 0 && !/\s/.test(text[at - 1] ?? "")) return null;

  const tail = beforeCursor.slice(at + 1);
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

export const applyAtMentionReplacementAtCursor = (
  value: string,
  label: string,
  cursorIndex: number,
): { value: string; cursorIndex: number } => {
  const safeLabel = label.trim();
  if (!safeLabel) return { value, cursorIndex };

  const text = value ?? "";
  const cursor = clampCursor(cursorIndex, text);

  const active = getActiveAtMentionAtCursor(text, cursor);
  const insertion = `@${safeLabel} `;

  if (!active) {
    const before = text.slice(0, cursor);
    const afterRaw = text.slice(cursor);
    const needsSpace = before.trim().length > 0 && !/\s$/.test(before);
    const prefix = needsSpace ? `${before} ` : before;
    const after = afterRaw.startsWith(" ") ? afterRaw.slice(1) : afterRaw;
    const next = `${prefix}${insertion}${after}`;
    return { value: next, cursorIndex: prefix.length + insertion.length };
  }

  const before = text.slice(0, active.start);
  const afterRaw = text.slice(cursor);
  const after = afterRaw.startsWith(" ") ? afterRaw.slice(1) : afterRaw;
  const next = `${before}${insertion}${after}`;
  return { value: next, cursorIndex: before.length + insertion.length };
};
