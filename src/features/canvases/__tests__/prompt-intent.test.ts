import { describe, expect, test } from "bun:test";

import { isHtmlPrompt } from "@/features/canvases/lib/prompt-intent";

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

