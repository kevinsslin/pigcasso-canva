export type PromptPreset = {
  id: string;
  label: string;
  prompt: string;
};

export const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "design",
    label: "Design",
    prompt:
      "Design a clean, modern graphic for [topic]. Include a bold title and a simple subtitle. Use a cohesive color palette and strong typography.",
  },
  {
    id: "branding",
    label: "Branding",
    prompt:
      "Create a mini brand kit for [brand]: logo mark + wordmark, color palette (5 swatches), typography pairing, and a sample social post — all in one cohesive style.",
  },
  {
    id: "illustration",
    label: "Illustration",
    prompt:
      "Illustrate [subject] in a [style] style. High detail, clean composition, vibrant but tasteful colors, and a clear focal point.",
  },
  {
    id: "video",
    label: "Video",
    prompt:
      "Create a 4-shot storyboard for a 10-second short video about [topic]. For each shot: describe the scene, camera framing, on-screen text, and the key action.",
  },
  {
    id: "meme",
    label: "Meme",
    prompt:
      "Create a meme image about [topic] in the style of [meme format]. Keep it simple, high-contrast, and leave clear space for caption text.",
  },
  {
    id: "pfp",
    label: "PFP",
    prompt:
      "Design a profile picture (PFP) of [character] in [style]. Centered portrait, clean background, strong silhouette, crisp details, and vibrant but cohesive colors.",
  },
  {
    id: "logo",
    label: "Logo",
    prompt:
      "Design a modern logo for [brand]. Provide an icon + wordmark. Flat vector style, minimal, high contrast, and a transparent/clean background.",
  },
  {
    id: "social-post",
    label: "Social",
    prompt:
      "Create a square social post announcing [announcement]. Modern layout, bold headline, clear hierarchy, and a small CTA. Leave safe margins for text.",
  },
  {
    id: "poster",
    label: "Poster",
    prompt:
      "Design a poster for [event]. Include title, date/time, location, and a QR placeholder. Use a striking visual motif and readable typography.",
  },
  {
    id: "banner",
    label: "Banner",
    prompt:
      "Design a banner for [project]. Bold headline, simple visual motif, and clean composition with clear space for a logo and CTA.",
  },
  {
    id: "product-shot",
    label: "Product",
    prompt:
      "Create a premium product hero image for [product]. Studio lighting, clean background, subtle shadows, and a polished, high-end look.",
  },
  {
    id: "sticker-pack",
    label: "Stickers",
    prompt:
      "Design a set of 12 cute sticker-style icons for [theme]. Consistent style, white outline, high contrast, and a clean background.",
  },
  {
    id: "web-hero",
    label: "Web",
    prompt:
      "Design a landing page hero section for [product]. Include headline, subheadline, CTA button, and a clean UI layout with modern gradients.",
  },
];
