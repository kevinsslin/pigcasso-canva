export const createLazyProxy = <T extends object>(factory: () => T): T => {
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = factory();
      const value = (real as unknown as Record<PropertyKey, unknown>)[prop];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(real)
        : value;
    },
  }) as T;
};

