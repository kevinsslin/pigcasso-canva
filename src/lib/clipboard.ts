export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    if (typeof document === "undefined") return false;
    if (!document.body) return false;

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);

    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    const copied = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
};

