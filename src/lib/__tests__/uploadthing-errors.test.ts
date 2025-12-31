import { describe, expect, test } from "bun:test";

import { getUploadthingErrorMessage } from "@/lib/uploadthing-errors";

describe("uploadthing error message", () => {
  test("maps file size mismatch to a friendly message", () => {
    const msg = getUploadthingErrorMessage(
      { message: "Invalid config: FileSizeMismatch" },
      { maxFileSizeLabel: "8MB" },
    );
    expect(msg).toContain("Max size is 8MB");
  });

  test("maps file type mismatch to a friendly message", () => {
    const msg = getUploadthingErrorMessage({ message: "Invalid config: FileTypeMismatch" });
    expect(msg.toLowerCase()).toContain("unsupported");
  });

  test("maps unauthorized to a sign-in message", () => {
    const msg = getUploadthingErrorMessage(new Error("Unauthorized"));
    expect(msg.toLowerCase()).toContain("sign in");
  });

  test("falls back to the original message when possible", () => {
    expect(getUploadthingErrorMessage(new Error("Something went wrong"))).toBe("Something went wrong");
  });
});

