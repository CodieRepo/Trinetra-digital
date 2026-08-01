import { preprocessText } from './tokenizer';
import { KBItem } from '../../types/chat';

export class BM25Engine {
  private k1 = 1.5;
  private b = 0.75;
  private docLengths: Map<string, number> = new Map();
  private avgDocLength = 0;
  private docTermFreqs: Map<string, Map<string, number>> = new Map();
  private docFrequencies: Map<string, number> = new Map();
  private totalDocs = 0;

  constructor(items: KBItem[]) {
    this.indexDocuments(items);
  }

  public indexDocuments(items: KBItem[]): void {
    this.docLengths.clear();
    this.docTermFreqs.clear();
    this.docFrequencies.clear();
    this.totalDocs = items.length;

    let totalLength = 0;

    items.forEach((item) => {
      const fullText = `${item.title} ${item.keywords.join(' ')} ${item.category} ${item.content}`;
      const tokens = preprocessText(fullText);
      const docLength = tokens.length;
      this.docLengths.set(item.id, docLength);
      totalLength += docLength;

      const termFreqs = new Map<string, number>();
      const uniqueTokens = new Set<string>();

      tokens.forEach((token) => {
        termFreqs.set(token, (termFreqs.get(token) || 0) + 1);
        uniqueTokens.add(token);
      });

      this.docTermFreqs.set(item.id, termFreqs);

      uniqueTokens.forEach((token) => {
        this.docFrequencies.set(token, (this.docFrequencies.get(token) || 0) + 1);
      });
    });

    this.avgDocLength = totalLength / (this.totalDocs || 1);
  }

  /**
   * Calculate BM25 relevance score for a document given query tokens
   */
  public scoreDocument(docId: string, queryTokens: string[]): number {
    const docLength = this.docLengths.get(docId) || 0;
    const termFreqs = this.docTermFreqs.get(docId);
    if (!termFreqs || docLength === 0) return 0;

    let score = 0;

    queryTokens.forEach((term) => {
      const tf = termFreqs.get(term) || 0;
      if (tf === 0) return;

      const df = this.docFrequencies.get(term) || 0;
      // IDF using Okapi BM25 formula
      const idf = Math.log((this.totalDocs - df + 0.5) / (df + 0.5) + 1);

      const numerator = tf * (this.k1 + 1);
      const denominator = tf + this.k1 * (1 - this.b + (this.b * docLength) / (this.avgDocLength || 1));

      score += idf * (numerator / denominator);
    });

    return Math.max(0, score);
  }
}
