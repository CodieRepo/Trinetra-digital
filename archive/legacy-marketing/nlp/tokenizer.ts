// English Stopwords list
const ENGLISH_STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', "aren't",
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', "can't",
  'cannot', 'could', "couldn't", 'did', "didn't", 'do', 'does', "doesn't", 'doing', "don't", 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', "hadn't", 'has', "hasn't", 'have', "haven't",
  'having', 'he', "he'd", "he'll", "he's", 'her', 'here', "here's", 'hers', 'herself', 'him', 'himself',
  'his', 'how', "how's", 'i', "i'd", "i'll", "i'm", "i've", 'if', 'in', 'into', 'is', "isn't", 'it', "it's",
  'its', 'itself', 'let', "let's", 'me', 'more', 'most', "mustn't", 'my', 'myself', 'no', 'nor', 'not',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over',
  'own', 'same', "shan't", 'she', "she'd", "she'll", "she's", 'should', "shouldn't", 'so', 'some', 'such',
  'than', 'that', "that's", 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', "there's",
  'these', 'they', "they'd", "they'll", "they're", "they've", 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', "wasn't", 'we', "we'd", "we'll", "we're", "we've", 'were',
  "weren't", 'what', "what's", 'when', "when's", 'where', "where's", 'which', 'while', 'who', "who's",
  'whom', 'why', "why's", 'with', "won't", 'would', "wouldn't", 'you', "you'd", "you'll", "you're",
  "you've", 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Porter Stemmer implementation for English
 */
export function stemWord(word: string): string {
  if (word.length < 3) return word;
  let w = word.toLowerCase();

  // Step 1a
  if (w.endsWith('sses')) w = w.slice(0, -2);
  else if (w.endsWith('ies')) w = w.slice(0, -2);
  else if (w.endsWith('ss')) {}
  else if (w.endsWith('s')) w = w.slice(0, -1);

  // Step 1b
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    if (/[aeiou]/.test(stem)) w = stem;
  } else if (w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    if (/[aeiou]/.test(stem)) w = stem;
  }

  // Step 2
  if (w.endsWith('ational')) w = w.slice(0, -7) + 'ate';
  else if (w.endsWith('tional')) w = w.slice(0, -6) + 'tion';
  else if (w.endsWith('ization')) w = w.slice(0, -7) + 'ize';
  else if (w.endsWith('ation')) w = w.slice(0, -5) + 'ate';
  else if (w.endsWith('ment')) w = w.slice(0, -4);
  else if (w.endsWith('ness')) w = w.slice(0, -4);

  return w;
}

/**
 * Tokenize input text into clean words
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  const cleaned = text
    .toLowerCase()
    .replace(/[^\w\s\d]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned ? cleaned.split(' ') : [];
}

/**
 * Remove stopwords from tokens
 */
export function removeStopwords(tokens: string[]): string[] {
  return tokens.filter((t) => t.length > 1 && !ENGLISH_STOPWORDS.has(t));
}

/**
 * Stem array of tokens
 */
export function stemTokens(tokens: string[]): string[] {
  return tokens.map(stemWord);
}

/**
 * Full preprocessing pipeline: Tokenize -> Remove Stopwords -> Stem
 */
export function preprocessText(text: string): string[] {
  const tokens = tokenize(text);
  const filtered = removeStopwords(tokens);
  return stemTokens(filtered);
}

/**
 * Generate N-grams (unigrams, bigrams, trigrams)
 */
export function generateNGrams(tokens: string[], maxN = 3): string[] {
  const nGrams: string[] = [];
  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      nGrams.push(tokens.slice(i, i + n).join(' '));
    }
  }
  return nGrams;
}
