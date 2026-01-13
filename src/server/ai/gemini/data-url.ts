export const parseDataUrl = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return null;
  }
  return {
    mimeType: match[1],
    base64: match[2],
  };
};

export const toDataUrl = (mimeType: string, base64: string) =>
  `data:${mimeType};base64,${base64}`;

