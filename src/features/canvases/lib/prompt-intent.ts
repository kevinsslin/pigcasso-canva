const HTML_COMMAND_RE = /^\/?html\b/i;

const HTML_KEYWORDS_EN_RE = /(landing page|website|web page|home page|homepage|html)/i;

const HTML_KEYWORDS_ZH_RE = /(網頁|网页|網站|网站|官網|官网|前端|頁面|网页设计|web\s?app)/i;

export const isHtmlPrompt = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed) return false;
  return (
    HTML_COMMAND_RE.test(trimmed) ||
    HTML_KEYWORDS_EN_RE.test(trimmed) ||
    HTML_KEYWORDS_ZH_RE.test(trimmed)
  );
};

