const HTML_COMMAND_RE = /^\/?html\b/i;

const HTML_KEYWORDS_EN_RE = /(landing page|website|web page|home page|homepage|html)/i;

const HTML_KEYWORDS_ZH_RE = /(網頁|网页|網站|网站|官網|官网|前端|頁面|网页设计|web\s?app)/i;

const VARIATION_COMMAND_RE = /^\/?(regen|regenerate|variation|variant|retry)\b[\s:：,，.。-]*/i;

const VARIATION_KEYWORDS_EN_RE = /\b(regenerate|re-generate|variation|variant|new version|another version|try again|redo|retry)\b/i;

const VARIATION_KEYWORDS_ZH_RE = /(重新生成|再生成|再來一張|再来一张|變體|变体|另一個版本|另一个版本|再試一次|再试一次|重做|換一張|换一张)/;

export const isHtmlPrompt = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return (
    HTML_COMMAND_RE.test(trimmed) ||
    HTML_KEYWORDS_EN_RE.test(trimmed) ||
    HTML_KEYWORDS_ZH_RE.test(trimmed)
  );
};

export const isImageVariationPrompt = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return (
    VARIATION_COMMAND_RE.test(trimmed) ||
    VARIATION_KEYWORDS_EN_RE.test(trimmed) ||
    VARIATION_KEYWORDS_ZH_RE.test(trimmed)
  );
};

export const stripImageVariationPrompt = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return "";

  const withoutCommand = trimmed.replace(VARIATION_COMMAND_RE, "").trim();
  if (withoutCommand && withoutCommand !== trimmed) return withoutCommand;

  const withoutZhPrefix = trimmed
    .replace(
      /^(重新生成|再生成|再來一張|再来一张|變體|变体|再試一次|再试一次|重做|換一張|换一张)[\\s:：,，.。-]*/,
      "",
    )
    .trim();

  return withoutZhPrefix;
};
