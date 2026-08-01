import { KBItem } from '../../types/chat';
import { getKnowledgeBase } from '../../knowledge';
import { preprocessText, tokenize } from '../nlp/tokenizer';
import { expandQueryWithSynonyms, getCanonicalTerm } from '../nlp/synonyms';
import { TFIDFEngine } from '../nlp/tfidf';
import { BM25Engine } from '../nlp/bm25';
import { calculateCosineSimilarity } from '../nlp/cosine';
import { levenshteinSimilarity, jaccardSimilarity } from '../nlp/fuzzy';

export interface SearchResult {
  item: KBItem;
  score: number; // Raw combined score
  confidence: number; // 0 to 100 percentage
  bm25Score: number;
  tfidfScore: number;
  keywordScore: number;
  synonymScore: number;
  fuzzyScore: number;
}

export class HybridSearchEngine {
  private kb: KBItem[] = [];
  private tfidfEngine!: TFIDFEngine;
  private bm25Engine!: BM25Engine;

  constructor() {
    this.reloadKnowledgeBase();
  }

  public reloadKnowledgeBase(): void {
    this.kb = getKnowledgeBase();
    this.tfidfEngine = new TFIDFEngine(this.kb);
    this.bm25Engine = new BM25Engine(this.kb);
  }

  /**
   * Performs hybrid multi-layer semantic search over the Knowledge Base
   */
  public search(query: string, topK = 5): SearchResult[] {
    if (!query || !query.trim()) return [];

    this.reloadKnowledgeBase();

    const rawTokens = tokenize(query);
    const preprocessedTokens = preprocessText(query);
    const expandedTokens = expandQueryWithSynonyms(query);

    const queryVector = this.tfidfEngine.queryToVector(query);

    const results: SearchResult[] = this.kb.map((item) => {
      // 1. BM25 Score
      const rawBm25 = this.bm25Engine.scoreDocument(item.id, preprocessedTokens);
      const normalizedBm25 = Math.min(1.0, rawBm25 / 5.0);

      // 2. TF-IDF Cosine Similarity Score
      const docVector = this.tfidfEngine.getDocumentVector(item.id) || {};
      const cosineSim = calculateCosineSimilarity(queryVector, docVector);

      // 3. Direct Keyword & Priority Score
      let keywordHits = 0;
      const lowerTitle = item.title.toLowerCase();
      const lowerCategory = item.category.toLowerCase();

      item.keywords.forEach((kw) => {
        const kwLower = kw.toLowerCase();
        if (query.toLowerCase().includes(kwLower)) {
          keywordHits += 2.0;
        } else {
          preprocessedTokens.forEach((pt) => {
            if (kwLower.includes(pt)) keywordHits += 0.8;
          });
        }
      });

      if (rawTokens.some((t) => lowerTitle.includes(t))) keywordHits += 1.5;
      if (rawTokens.some((t) => lowerCategory.includes(t))) keywordHits += 1.0;

      const keywordScore = Math.min(1.0, keywordHits / 4.0);

      // 4. Synonym Match Score
      let synonymHits = 0;
      expandedTokens.forEach((et) => {
        const canonical = getCanonicalTerm(et);
        item.keywords.forEach((kw) => {
          if (kw.toLowerCase().includes(canonical)) synonymHits += 1.0;
        });
      });
      const synonymScore = Math.min(1.0, synonymHits / 3.0);

      // 5. Fuzzy Match Score (Levenshtein & Jaccard over Title & Keywords)
      let maxFuzzy = 0;
      item.keywords.forEach((kw) => {
        const sim = levenshteinSimilarity(query, kw);
        if (sim > maxFuzzy) maxFuzzy = sim;
      });
      const titleFuzzy = levenshteinSimilarity(query, item.title);
      const jaccard = jaccardSimilarity(preprocessedTokens, preprocessText(item.title));
      const fuzzyScore = Math.max(maxFuzzy, titleFuzzy, jaccard);

      // Weighted Fusion of Scores
      // Weights: BM25 (30%), TF-IDF Cosine (30%), Keywords (20%), Synonyms (10%), Fuzzy (10%)
      const combinedScore =
        normalizedBm25 * 0.30 +
        cosineSim * 0.30 +
        keywordScore * 0.20 +
        synonymScore * 0.10 +
        fuzzyScore * 0.10;

      // Priority booster
      const priorityBoost = (item.priority || 5) / 100;
      const finalScore = combinedScore + priorityBoost;

      // Calculate confidence percentage (0 to 100%)
      const confidence = Math.min(99, Math.round(finalScore * 100));

      return {
        item,
        score: finalScore,
        confidence,
        bm25Score: Math.round(normalizedBm25 * 100),
        tfidfScore: Math.round(cosineSim * 100),
        keywordScore: Math.round(keywordScore * 100),
        synonymScore: Math.round(synonymScore * 100),
        fuzzyScore: Math.round(fuzzyScore * 100)
      };
    });

    // Sort descending by score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }
}

export const hybridSearchEngine = new HybridSearchEngine();
