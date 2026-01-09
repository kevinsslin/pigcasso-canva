import { describe, expect, test } from "bun:test";

import { DASHBOARD_NAV_ITEMS, MOBILE_DOCK_ITEMS } from "../nav-items";

describe("dashboard nav items (UX regression)", () => {
  test("includes Canvases and removes Creator Hub", () => {
    expect(DASHBOARD_NAV_ITEMS.some((item) => item.href === "/canvases")).toBe(true);
    expect(DASHBOARD_NAV_ITEMS.some((item) => item.href === "/creator-hub")).toBe(false);
  });

  test("mobile dock includes Canvases", () => {
    expect(MOBILE_DOCK_ITEMS.some((item) => item.href === "/canvases")).toBe(true);
  });
});

