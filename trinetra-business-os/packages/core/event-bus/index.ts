export interface EventEnvelope<T = Record<string, unknown>> {
  eventId: string;
  organizationId: string;
  vertical: string;
  eventType: string;
  timestamp: string;
  payload: T;
}

export type EventHandler<T = Record<string, unknown>> = (event: EventEnvelope<T>) => Promise<void>;

class LocalEventBus {
  private handlers: Map<string, EventHandler<any>[]> = new Map();

  async publish<T = Record<string, unknown>>(event: EventEnvelope<T>): Promise<void> {
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

  subscribe<T = Record<string, unknown>>(eventType: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler<any>);
    console.log(`[EventBus] Registered handler for: ${eventType}`);
  }
}

export const eventBus = new LocalEventBus();

export function createEventEnvelope<T extends Record<string, unknown>>(
  organizationId: string,
  vertical: string,
  eventType: string,
  payload: T
): EventEnvelope<T> {
  return {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    organizationId,
    vertical,
    eventType,
    timestamp: new Date().toISOString(),
    payload,
  };
}

