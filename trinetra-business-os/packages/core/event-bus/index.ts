export interface EventEnvelope<T = any> {
  eventId: string;
  organizationId: string;
  vertical: string;
  eventType: string;
  timestamp: string;
  payload: T;
}

type EventHandler = (event: EventEnvelope) => Promise<void>;

class LocalEventBus {
  private handlers: Map<string, EventHandler[]> = new Map();

  async publish(event: EventEnvelope): Promise<void> {
    console.log(`[EventBus] Publishing ${event.eventType} for Org ${event.organizationId}`);
    const list = this.handlers.get(event.eventType) || [];
    for (const handler of list) {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error handling event ${event.eventType}:`, err);
      }
    }
  }

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    console.log(`[EventBus] Registered handler for: ${eventType}`);
  }
}

export const eventBus = new LocalEventBus();
