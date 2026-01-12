"use client";

import { uploadFiles } from "@/lib/uploadthing";
import { getAuthToken } from "@/lib/auth-token";

export const dataUrlToFile = async (dataUrl: string, fileName: string) => {
  const res = await fetch(dataUrl);
  if (!res.ok) {
    throw new Error("Failed to read data URL");
  }
  const blob = await res.blob();
  return new File([blob], fileName, { type: blob.type || "image/png" });
};

export const uploadImageDataUrl = async (dataUrl: string, fileName: string) => {
  const token = await getAuthToken({
    maxWaitMs: 5000,
    retries: 8,
    retryDelayMs: 250,
  });
  if (!token) {
    throw new Error("Missing auth token. Please sign in again.");
  }

  const file = await dataUrlToFile(dataUrl, fileName);

  const uploaded = await uploadFiles("imageUploader", {
    files: [file],
    headers: { Authorization: `Bearer ${token}` },
  });

  const url = uploaded?.[0]?.url;
  if (!url) {
    throw new Error("Failed to upload image");
  }

  return url;
};
