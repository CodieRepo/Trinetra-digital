import { UnknownQueryLog } from '../../types/chat';

const UNKNOWN_QUERIES_KEY = 'trinetra_unknown_queries_v1';

export class LearningSystem {
  public logUnknownQuery(query: string, topMatches: Array<{ id: string; title: string; score: number }>): void {
    if (typeof window === 'undefined' || !query.trim()) return;

    try {
      const logs = this.getUnknownQueries();
      const newEntry: UnknownQueryLog = {
        id: 'unk-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        query: query.trim(),
        timestamp: Date.now(),
        topMatches,
        resolved: false
      };
      logs.unshift(newEntry);
      // Keep last 100 unknown queries
      localStorage.setItem(UNKNOWN_QUERIES_KEY, JSON.stringify(logs.slice(0, 100)));
    } catch (e) {
      console.error('Failed to log unknown query', e);
    }
  }

  public getUnknownQueries(): UnknownQueryLog[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(UNKNOWN_QUERIES_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse unknown queries', e);
    }
    return [];
  }

  public markAsResolved(id: string): void {
    if (typeof window === 'undefined') return;
    const logs = this.getUnknownQueries();
    const updated = logs.map((log) => (log.id === id ? { ...log, resolved: true } : log));
    localStorage.setItem(UNKNOWN_QUERIES_KEY, JSON.stringify(updated));
  }

  public clearAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(UNKNOWN_QUERIES_KEY);
  }
}

export const learningSystem = new LearningSystem();
