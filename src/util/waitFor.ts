export function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * wait for a condition to be true
 */
export function waitFor(callback: () => boolean, interval: number = 100): Promise<void> {
  return new Promise((resolve) => {
    const intervalId = setInterval(() => {
      if (callback()) {
        clearInterval(intervalId);
        resolve();
      }
    }, interval);
  });
}
