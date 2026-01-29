export type AiJobQueueCounts = {
  active: number;
  queued: number;
};

export type AiJobQueue = {
  enqueue: <T>(job: () => Promise<T>) => Promise<T>;
  getCounts: () => AiJobQueueCounts;
  clearQueued: () => number;
};

export function createAiJobQueue(options?: {
  concurrency?: number;
  onChange?: (counts: AiJobQueueCounts) => void;
}): AiJobQueue {
  const concurrency = Math.max(1, Math.floor(options?.concurrency ?? 3));
  const onChange = options?.onChange;

  let active = 0;
  const queue: Array<{
    job: () => Promise<unknown>;
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
  }> = [];

  const notify = () => {
    onChange?.({ active, queued: queue.length });
  };

  const pump = () => {
    while (active < concurrency && queue.length > 0) {
      const item = queue.shift();
      if (!item) return;

      active += 1;
      notify();

      void item
        .job()
        .then((value) => item.resolve(value))
        .catch((error) => item.reject(error))
        .finally(() => {
          active -= 1;
          notify();
          pump();
        });
    }
  };

  return {
    enqueue: <T,>(job: () => Promise<T>) =>
      new Promise<T>((resolve, reject) => {
        queue.push({ job: job as () => Promise<unknown>, resolve: resolve as any, reject });
        notify();
        pump();
      }),
    getCounts: () => ({ active, queued: queue.length }),
    clearQueued: () => {
      if (!queue.length) return 0;
      const cleared = queue.splice(0, queue.length);
      cleared.forEach((item) => item.resolve(undefined));
      notify();
      return cleared.length;
    },
  };
}

export type AiJobMutex = {
  runExclusive: <T>(fn: () => Promise<T> | T) => Promise<T>;
};

export function createAiJobMutex(): AiJobMutex {
  let tail = Promise.resolve();

  return {
    runExclusive: <T,>(fn: () => Promise<T> | T) => {
      const run = async () => fn();
      const result = tail.then(run, run);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
