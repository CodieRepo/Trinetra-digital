import { preprocessText } from './tokenizer';
import { KBItem } from '../../types/chat';

export interface TermVector {
  [term: string]: number;
}

export class TFIDFEngine {
  private documents: Map<string, string[]> = new Map();
  private docFrequencies: Map<string, number> = new Map();
  private tfidfVectors: Map<string, TermVector> = new Map();
  private totalDocs = 0;

  constructor(items: KBItem[]) {
    this.indexDocuments(items);
  }

  public indexDocuments(items: KBItem[]): void {
    this.documents.clear();
    this.docFrequencies.clear();
    this.tfidfVectors.clear();
    this.totalDocs = items.length;

    // 1. Preprocess each document (combine title, keywords, content, category)
    items.forEach((item) => {
      const fullText = `${item.title} ${item.keywords.join(' ')} ${item.category} ${item.content}`;
      const tokens = preprocessText(fullText);
      this.documents.set(item.id, tokens);

      const uniqueTokens = new Set(tokens);
      uniqueTokens.forEach((token) => {
        const currentCount = this.docFrequencies.get(token) || 0;
        this.docFrequencies.set(token, currentCount + 1);
      });
    });

    // 2. Compute TF-IDF vectors for each document
    this.documents.forEach((tokens, docId) => {
      const vector: TermVector = {};
      const tokenCounts: Map<string, number> = new Map();

      tokens.forEach((t) => tokenCounts.set(t, (tokenCounts.get(t) || 0) + 1));

      tokenCounts.forEach((count, token) => {
        const tf = count / tokens.length;
        const df = this.docFrequencies.get(token) || 1;
        const idf = Math.log((this.totalDocs + 1) / (df + 0.5)) + 1;
        vector[token] = tf * idf;
      });

      this.tfidfVectors.set(docId, vector);
    });
  }

  /**
   * Convert raw text query into a TF-IDF vector
   */
  public queryToVector(query: string): TermVector {
    const tokens = preprocessText(query);
    const vector: TermVector = {};
    const counts: Map<string, number> = new Map();

    tokens.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1));

    counts.forEach((count, token) => {
      const tf = count / (tokens.length || 1);
      const df = this.docFrequencies.get(token) || 1;
      const idf = Math.log((this.totalDocs + 1) / (df + 0.5)) + 1;
      vector[token] = tf * idf;
    });

    return vector;
  }

  public getDocumentVector(docId: string): TermVector | undefined {
    return this.tfidfVectors.get(docId);
  }
}
