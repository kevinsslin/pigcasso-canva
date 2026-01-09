export type HistoryBatchEditor = {
  markHistoryStoppingPoint: (name?: string) => string;
  squashToMark: (markId: string) => unknown;
  bailToMark?: (markId: string) => unknown;
};

export const withHistorySquash = async <T>(
  editor: HistoryBatchEditor,
  name: string,
  fn: () => Promise<T> | T,
): Promise<T> => {
  const markId = editor.markHistoryStoppingPoint(name);
  try {
    const result = await fn();
    editor.squashToMark(markId);
    return result;
  } catch (error) {
    try {
      editor.bailToMark?.(markId);
    } catch {
      // ignore
    }
    throw error;
  }
};

