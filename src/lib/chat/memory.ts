import { UserContextMemory, ChatMessage, PrimaryIntent } from '../../types/chat';

const MEMORY_STORAGE_KEY = 'trinetra_chat_user_memory_v1';

export class ConversationMemoryManager {
  private memory: UserContextMemory;

  constructor() {
    this.memory = this.loadFromStorage();
  }

  private getDefaultMemory(): UserContextMemory {
    return {
      previousTopics: [],
      messages: [],
      activeFlow: 'idle'
    };
  }

  public loadFromStorage(): UserContextMemory {
    if (typeof window === 'undefined') return this.getDefaultMemory();
    try {
      const saved = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...this.getDefaultMemory(),
          ...parsed,
          messages: (parsed.messages || []).slice(-20)
        };
      }
    } catch (e) {
      console.error('Error loading memory from localStorage', e);
    }
    return this.getDefaultMemory();
  }

  public saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.memory));
    } catch (e) {
      console.error('Error saving memory to localStorage', e);
    }
  }

  public getMemory(): UserContextMemory {
    return this.memory;
  }

  public updateContext(entities: Partial<UserContextMemory>): void {
    if (entities.name) this.memory.name = entities.name;
    if (entities.phone) this.memory.phone = entities.phone;
    if (entities.email) this.memory.email = entities.email;
    if (entities.businessType) this.memory.businessType = entities.businessType;
    if (entities.preferredService) this.memory.preferredService = entities.preferredService;
    if (entities.budget) this.memory.budget = entities.budget;
    if (entities.city) this.memory.city = entities.city;
    if (entities.timeline) this.memory.timeline = entities.timeline;
    if (entities.activeFlow) this.memory.activeFlow = entities.activeFlow;

    this.saveToStorage();
  }

  public setLastIntent(intent: PrimaryIntent): void {
    this.memory.lastIntent = intent;
    this.saveToStorage();
  }

  public addTopic(topic: string): void {
    if (!this.memory.previousTopics.includes(topic)) {
      this.memory.previousTopics.push(topic);
      if (this.memory.previousTopics.length > 10) {
        this.memory.previousTopics.shift();
      }
      this.saveToStorage();
    }
  }

  public addMessage(msg: ChatMessage): void {
    this.memory.messages.push(msg);
    // Keep max 20 messages
    if (this.memory.messages.length > 20) {
      this.memory.messages.shift();
    }
    this.saveToStorage();
  }

  public clearMemory(): void {
    this.memory = this.getDefaultMemory();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(MEMORY_STORAGE_KEY);
    }
  }
}

export const memoryManager = new ConversationMemoryManager();
