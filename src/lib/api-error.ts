export type ApiError = Error & {
  status?: number;
  body?: unknown;
};

export const createApiError = (params: {
  message: string;
  status?: number;
  body?: unknown;
}): ApiError => {
  const error = new Error(params.message) as ApiError;
  if (typeof params.status === "number") {
    error.status = params.status;
  }
  if (params.body !== undefined) {
    error.body = params.body;
  }
  return error;
};

export const getApiErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return undefined;
  }
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
};

export const extractBodyErrorMessage = (body: unknown): string | null => {
  if (!body || typeof body !== "object") {
    return null;
  }
  const record = body as Record<string, unknown>;

  const extractIssues = (value: unknown): string | null => {
    if (!Array.isArray(value)) {
      return null;
    }
    for (const item of value) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const message = (item as { message?: unknown }).message;
      if (typeof message === "string" && message.trim().length > 0) {
        return message.trim();
      }
    }
    return null;
  };

  const directError = record.error;
  if (typeof directError === "string" && directError.trim().length > 0) {
    return directError;
  }

  if (directError && typeof directError === "object") {
    const errorRecord = directError as Record<string, unknown>;
    const issuesMessage = extractIssues(errorRecord.issues);
    if (issuesMessage) {
      return issuesMessage;
    }

    const message = errorRecord.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message;
    }

    const detail = errorRecord.detail;
    if (typeof detail === "string" && detail.trim().length > 0) {
      return detail;
    }

    const title = errorRecord.title;
    if (typeof title === "string" && title.trim().length > 0) {
      return title;
    }
  }

  const topLevelIssues = extractIssues(record.issues);
  if (topLevelIssues) {
    return topLevelIssues;
  }

  const message = record.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const detail = record.detail;
  if (typeof detail === "string" && detail.trim().length > 0) {
    return detail;
  }

  const errors = record.errors;
  if (Array.isArray(errors)) {
    const messages = errors.filter((err): err is string => typeof err === "string" && err.trim().length > 0);
    if (messages.length > 0) {
      return messages.join(", ");
    }
  }

  return null;
};
