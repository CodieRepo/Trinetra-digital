import { AnalyticsData, SearchLog, PrimaryIntent } from '../../types/chat';

const ANALYTICS_STORAGE_KEY = 'trinetra_analytics_v1';

export class AnalyticsService {
  private data: AnalyticsData;

  constructor() {
    this.data = this.loadAnalytics();
  }

  private getDefaultAnalytics(): AnalyticsData {
    return {
      totalMessages: 0,
      popularQuestions: {},
      intentDistribution: {},
      unknownQueriesCount: 0,
      avgConfidence: 85,
      totalAppointments: 0,
      completedAppointments: 0,
      searchLogs: []
    };
  }

  public loadAnalytics(): AnalyticsData {
    if (typeof window === 'undefined') return this.getDefaultAnalytics();
    try {
      const saved = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      if (saved) {
        return {
          ...this.getDefaultAnalytics(),
          ...JSON.parse(saved)
        };
      }
    } catch (e) {
      console.error('Failed to load analytics from localStorage', e);
    }
    return this.getDefaultAnalytics();
  }

  public saveAnalytics(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save analytics', e);
    }
  }

  public getAnalytics(): AnalyticsData {
    return this.data;
  }

  public logInteraction(query: string, intent: PrimaryIntent, confidence: number, matchedId?: string): void {
    this.data.totalMessages += 1;

    // Track intent distribution
    this.data.intentDistribution[intent] = (this.data.intentDistribution[intent] || 0) + 1;

    // Track popular questions
    const cleanQ = query.trim().toLowerCase();
    if (cleanQ.length > 3) {
      this.data.popularQuestions[cleanQ] = (this.data.popularQuestions[cleanQ] || 0) + 1;
    }

    // Track search confidence average
    const currentAvg = this.data.avgConfidence || 85;
    this.data.avgConfidence = Math.round((currentAvg * 0.9) + (confidence * 0.1));

    // Append to search logs (max 100)
    const logItem: SearchLog = {
      id: 'log-' + Date.now(),
      query,
      matchedId,
      confidence,
      timestamp: Date.now()
    };
    this.data.searchLogs.unshift(logItem);
    if (this.data.searchLogs.length > 100) {
      this.data.searchLogs.pop();
    }

    this.saveAnalytics();
  }

  public logAppointmentCreated(): void {
    this.data.totalAppointments += 1;
    this.saveAnalytics();
  }

  public logAppointmentCompleted(): void {
    this.data.completedAppointments += 1;
    this.saveAnalytics();
  }

  public logUnknownQueryEvent(): void {
    this.data.unknownQueriesCount += 1;
    this.saveAnalytics();
  }

  public resetAnalytics(): void {
    this.data = this.getDefaultAnalytics();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ANALYTICS_STORAGE_KEY);
    }
  }
}

export const analyticsService = new AnalyticsService();
