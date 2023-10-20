export function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * wait for a condition to be true
 */
export function waitFor(
  callback: () => boolean,
  {
    timeout = 30000,
    interval = 100,
  }: {
    timeout?: number;
    interval?: number;
  }
): Promise<void> {
  const startTime = Date.now();
  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      if (callback()) {
        clearInterval(intervalId);
        resolve();
      }
      if (Date.now() - startTime >= timeout) {
        // timeout
        clearInterval(intervalId);
        resolve();
      }
    }, interval);
  });
}

export function waitForStable<T = unknown>(
  accessor: () => T,
  {
    timeout = 30000,
    minDelay = 100,
    interval = 100,
  }: {
    timeout?: number;
    minDelay?: number;
    interval?: number;
  }
) {
  let previousValue = accessor();
  const startTime = Date.now();
  return new Promise<T | undefined>((resolve) => {
    const intervalId = setInterval(() => {
      const currentValue = accessor();

      if (Date.now() - startTime >= timeout) {
        // timeout
        clearInterval(intervalId);
        resolve(undefined);
      }
      if (currentValue === previousValue && Date.now() - startTime >= minDelay) {
        clearInterval(intervalId);
        resolve(currentValue);
      }
      console.log(previousValue, currentValue);
      previousValue = currentValue;
    }, interval);
  });
}
