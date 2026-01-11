import { describe, expect, test } from "bun:test";

import { isHtmlPrompt, isImageVariationPrompt, stripImageVariationPrompt } from "@/features/canvases/lib/prompt-intent";

describe("isHtmlPrompt", () => {
  test("matches explicit /html command", () => {
    expect(isHtmlPrompt("/html build a landing page")).toBe(true);
    expect(isHtmlPrompt("html build a landing page")).toBe(true);
  });

  test("matches English website keywords", () => {
    expect(isHtmlPrompt("Landing page for Pigcasso")).toBe(true);
    expect(isHtmlPrompt("Website hero section")).toBe(true);
    expect(isHtmlPrompt("Home page redesign")).toBe(true);
  });

  test("matches Chinese website keywords", () => {
    expect(isHtmlPrompt("幫我做一個網頁")).toBe(true);
    expect(isHtmlPrompt("做個網站首頁")).toBe(true);
    expect(isHtmlPrompt("這個前端頁面要更簡潔")).toBe(true);
  });

  test("returns false for typical image prompts", () => {
    expect(isHtmlPrompt("Design a poster")).toBe(false);
    expect(isHtmlPrompt("Generate a cute pig illustration")).toBe(false);
  });
});

describe("isImageVariationPrompt", () => {
  test("matches explicit regen/variation phrases", () => {
    expect(isImageVariationPrompt("regenerate")).toBe(true);
    expect(isImageVariationPrompt("/regen")).toBe(true);
    expect(isImageVariationPrompt("make a variation")).toBe(true);
    expect(isImageVariationPrompt("variant")).toBe(true);
    expect(isImageVariationPrompt("create a variant of this")).toBe(true);
    expect(isImageVariationPrompt("new version please")).toBe(true);
  });

  test("matches Chinese variation phrases", () => {
    expect(isImageVariationPrompt("重新生成")).toBe(true);
    expect(isImageVariationPrompt("再來一張")).toBe(true);
    expect(isImageVariationPrompt("做個變體")).toBe(true);
  });

  test("returns false for typical edit instructions", () => {
    expect(isImageVariationPrompt("make the background blue")).toBe(false);
    expect(isImageVariationPrompt("remove the background")).toBe(false);
  });
});

describe("stripImageVariationPrompt", () => {
  test("removes leading variation commands", () => {
    expect(stripImageVariationPrompt("/regen make the background blue")).toBe("make the background blue");
    expect(stripImageVariationPrompt("regenerate: add a border")).toBe("add a border");
    expect(stripImageVariationPrompt("variant: add a border")).toBe("add a border");
    expect(stripImageVariationPrompt("重新生成：背景換成藍色")).toBe("背景換成藍色");
  });
});
