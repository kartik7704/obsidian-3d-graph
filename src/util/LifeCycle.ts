export interface LifeCycle {
  onReady(): void;
}

// a factory function
export function createInstance<T extends LifeCycle, B extends unknown[]>(
  temp: new (...args: B) => T,
  ...args: B
): T {
  const instance = new temp(...args);
  instance.onReady();
  return instance;
}
