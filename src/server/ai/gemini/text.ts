export const stripCodeFences = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/```(?:html)?\\s*([\\s\\S]*?)\\s*```/i);
  return match ? match[1].trim() : trimmed;
};

export const stripJsonFences = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/```(?:json)?\\s*([\\s\\S]*?)\\s*```/i);
  return match ? match[1].trim() : trimmed;
};

