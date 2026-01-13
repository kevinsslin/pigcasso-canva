import type { ExtractTextBlock } from "@/features/ai/api/use-extract-text";

const normalizeOcrText = (value: string) => {
  const raw = (value ?? "").normalize("NFKC").toLowerCase();
  const collapsed = raw.replace(/\s+/g, " ").trim();
  return collapsed.replace(/[^0-9a-z\u00c0-\u024f\u4e00-\u9fff ]+/gi, "");
};

const looksLikeMatch = (a: string, b: string) => {
  const aa = normalizeOcrText(a);
  const bb = normalizeOcrText(b);
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  if (aa.length >= 4 && bb.includes(aa)) return true;
  if (bb.length >= 4 && aa.includes(bb)) return true;
  return false;
};

export type OcrFidelityReport = {
  ok: boolean;
  expectedCount: number;
  actualCount: number;
  matchedCount: number;
  missing: string[];
  summary: string;
};

export const compareOcrTextBlocks = (params: {
  expected: ExtractTextBlock[];
  actual: ExtractTextBlock[];
  options?: { minTextLength?: number; allowMissingRatio?: number };
}): OcrFidelityReport => {
  const minTextLength = Math.max(1, Math.floor(params.options?.minTextLength ?? 3));
  const allowMissingRatio = Math.min(1, Math.max(0, Number(params.options?.allowMissingRatio ?? 0.25)));

  const expectedTexts = params.expected
    .map((b) => (b?.text ?? "").trim())
    .filter(Boolean)
    .filter((text) => normalizeOcrText(text).length >= minTextLength);

  const actualTexts = params.actual
    .map((b) => (b?.text ?? "").trim())
    .filter(Boolean)
    .filter((text) => normalizeOcrText(text).length >= minTextLength);

  const missing: string[] = [];
  let matchedCount = 0;

  for (const expectedText of expectedTexts) {
    const matched = actualTexts.some((actualText) => looksLikeMatch(expectedText, actualText));
    if (matched) {
      matchedCount += 1;
    } else {
      missing.push(expectedText);
    }
  }

  const expectedCount = expectedTexts.length;
  const actualCount = actualTexts.length;
  const missingRatio = expectedCount ? missing.length / expectedCount : 0;
  const ok = expectedCount === 0 ? true : missingRatio <= allowMissingRatio;

  const summary =
    expectedCount === 0
      ? "No prominent text to verify."
      : missing.length === 0
        ? `OCR check passed (${matchedCount}/${expectedCount} matched).`
        : `OCR check flagged (${matchedCount}/${expectedCount} matched; ${missing.length} missing).`;

  return { ok, expectedCount, actualCount, matchedCount, missing, summary };
};
