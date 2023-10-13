import { Events } from 'obsidian';

// Event bus for internal Plugin communication
export class EventBus extends Events {
  constructor() {
    super();
  }
}

export const eventBus = new EventBus();
