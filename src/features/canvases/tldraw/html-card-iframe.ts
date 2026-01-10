export const HTML_CARD_IFRAME_SANDBOX = "allow-scripts allow-forms allow-popups";

export const getHtmlCardIframeStyle = (isInteractive: boolean) => ({
  border: 0,
  pointerEvents: isInteractive ? ("auto" as const) : ("none" as const),
  zIndex: isInteractive ? "" : "-1",
  background: "#ffffff",
});

