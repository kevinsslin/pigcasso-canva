export type PresentationTone = "professional" | "friendly" | "bold";

export type PresentationTheme = {
  background: string;
  surface: string;
  text: string;
  primary: string;
  secondary: string;
  accent: string;
  fontFamily: string;
};

export type PresentationSlideLayout = "title" | "bullets" | "quote" | "diagram";

export type PresentationSlideSpec = {
  layout: PresentationSlideLayout;
  title: string;
  subtitle?: string;
  bullets?: string[];
  speakerNotes?: string;
};

export type PresentationDeckSpec = {
  title: string;
  theme: PresentationTheme;
  slides: PresentationSlideSpec[];
};

export const PRESENTATION_DIMENSIONS = {
  width: 1920,
  height: 1080,
} as const;

