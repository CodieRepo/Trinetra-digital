export interface AISummaryResult {
  summary: string;
  score: number;
  intent: 'HOT' | 'WARM' | 'COLD' | 'QUOTATION_REQUIRED';
}

export interface AIReplyResult {
  replySuggestion: string;
}

export interface AIProvider {
  generateLeadSummary(conversationText: string): Promise<AISummaryResult>;
  suggestReply(conversationHistory: string, incomingMessage: string): Promise<AIReplyResult>;
}
