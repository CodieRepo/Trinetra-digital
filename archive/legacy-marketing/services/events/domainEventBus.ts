type EventCallback = (payload: any) => Promise<void> | void;

export interface IDomainEventBus {
  subscribe(eventType: string, callback: EventCallback): void;
  publish(eventType: string, payload: any): void;
}

export class InMemoryDomainEventBus implements IDomainEventBus {
  private static instance: InMemoryDomainEventBus;
  private listeners: Map<string, EventCallback[]> = new Map();

  private constructor() {}

  public static getInstance(): InMemoryDomainEventBus {
    if (!InMemoryDomainEventBus.instance) {
      InMemoryDomainEventBus.instance = new InMemoryDomainEventBus();
    }
    return InMemoryDomainEventBus.instance;
  }

  public subscribe(eventType: string, callback: EventCallback): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
  }

  public publish(eventType: string, payload: any): void {
    const callbacks = this.listeners.get(eventType) || [];
    setTimeout(() => {
      callbacks.forEach(async (cb) => {
        try {
          await cb(payload);
        } catch (err) {
          console.error(`❌ Error executing event listener for ${eventType}:`, err);
        }
      });
    }, 0);
  }
}

export const eventBus: IDomainEventBus = InMemoryDomainEventBus.getInstance();
