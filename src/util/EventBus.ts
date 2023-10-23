import { AsyncQueue } from "@/util/AsyncQueue";
import { EventRef, Events } from "obsidian";

/**
 *  Event bus for internal Plugin communication
 *
 * the on method is patched to add the callback to an async queue
 */
export class AsyncEventBus extends Events {
  asyncQueue = new AsyncQueue();
  constructor() {
    super();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trigger(name: string, ...data: any[]): void {
    super.trigger(name, ...data);
  }

  /**
   * add the callback to an async queue to make sure that the callback is executed one after one
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(name: string, callback: (...data: any) => any, ctx?: any): EventRef {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pushToAsyncQueue = (...data: any) => {
      // add this callback to async queue
      this.asyncQueue.push(() => callback(...data));
    };

    const eventRef = super.on(name, pushToAsyncQueue, ctx);
    console.log(eventRef);
    return eventRef;
  }
}

export const eventBus = new AsyncEventBus();
