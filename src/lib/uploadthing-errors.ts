const getErrorMessage = (err: unknown) => {
  if (!err) return null;
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  if (typeof err === "string") return err;
  return null;
};

export const getUploadthingErrorMessage = (
  err: unknown,
  options?: { maxFileSizeLabel?: string },
) => {
  const message = getErrorMessage(err) ?? "";

  if (message.includes("FileSizeMismatch")) {
    const size = options?.maxFileSizeLabel ?? "4MB";
    return `File is too large. Max size is ${size}.`;
  }

  if (message.includes("FileTypeMismatch")) {
    return "Unsupported file type. Please upload an image file.";
  }

  if (message.toLowerCase().includes("unauthorized")) {
    return "Please sign in again, then retry the upload.";
  }

  return message || "Upload failed. Please try again.";
};

