import { TermVector } from './tfidf';

/**
 * Calculates cosine similarity between two term vectors: (A · B) / (||A|| * ||B||)
 */
export function calculateCosineSimilarity(vecA: TermVector, vecB: TermVector): number {
  const keysA = Object.keys(vecA);
  const keysB = Object.keys(vecB);
  if (keysA.length === 0 || keysB.length === 0) return 0;

  let dotProduct = 0;
  let normASq = 0;
  let normBSq = 0;

  for (const key of keysA) {
    const valA = vecA[key];
    normASq += valA * valA;
    if (vecB[key]) {
      dotProduct += valA * vecB[key];
    }
  }

  for (const key of keysB) {
    const valB = vecB[key];
    normBSq += valB * valB;
  }

  const magnitude = Math.sqrt(normASq) * Math.sqrt(normBSq);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
