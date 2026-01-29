import { describe, expect, test } from "bun:test";

import { createAiJobMutex, createAiJobQueue } from "@/features/canvases/lib/ai-job-queue";

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  let reject: (reason?: unknown) => void = () => {};
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("createAiJobQueue", () => {
  test("runs up to the configured concurrency", async () => {
    const queue = createAiJobQueue({ concurrency: 2 });

    let active = 0;
    let maxActive = 0;

    const blocks = [deferred<void>(), deferred<void>(), deferred<void>()];

    const results = blocks.map((block, idx) =>
      queue.enqueue(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await block.promise;
        active -= 1;
        return idx;
      }),
    );

    await Promise.resolve();

    expect(queue.getCounts()).toEqual({ active: 2, queued: 1 });
    expect(maxActive).toBe(2);

    blocks[0].resolve();
    blocks[1].resolve();

    await Promise.all([results[0], results[1]]);
    await Promise.resolve();

    expect(queue.getCounts().active).toBe(1);
    expect(queue.getCounts().queued).toBe(0);

    blocks[2].resolve();
    const values = await Promise.all(results);
    expect(values.sort()).toEqual([0, 1, 2]);
  });

  test("clears queued jobs without running them", async () => {
    const queue = createAiJobQueue({ concurrency: 1 });

    let ran = 0;
    const first = deferred<void>();

    const firstPromise = queue.enqueue(async () => {
      ran += 1;
      await first.promise;
    });

    const secondPromise = queue.enqueue(async () => {
      ran += 1;
    });

    await Promise.resolve();

    expect(queue.getCounts()).toEqual({ active: 1, queued: 1 });
    expect(queue.clearQueued()).toBe(1);
    expect(queue.getCounts()).toEqual({ active: 1, queued: 0 });

    first.resolve();
    await firstPromise;
    await secondPromise;

    expect(ran).toBe(1);
  });
});

describe("createAiJobMutex", () => {
  test("serializes exclusive work", async () => {
    const mutex = createAiJobMutex();

    const first = deferred<void>();
    const second = deferred<void>();

    const order: string[] = [];
    let active = 0;
    let maxActive = 0;

    const one = mutex.runExclusive(async () => {
      order.push("start1");
      active += 1;
      maxActive = Math.max(maxActive, active);
      await first.promise;
      active -= 1;
      order.push("end1");
    });

    const two = mutex.runExclusive(async () => {
      order.push("start2");
      active += 1;
      maxActive = Math.max(maxActive, active);
      await second.promise;
      active -= 1;
      order.push("end2");
    });

    await Promise.resolve();
    expect(order).toEqual(["start1"]);

    first.resolve();
    await one;
    await Promise.resolve();

    expect(order).toEqual(["start1", "end1", "start2"]);
    expect(maxActive).toBe(1);

    second.resolve();
    await two;

    expect(order).toEqual(["start1", "end1", "start2", "end2"]);
  });
});
