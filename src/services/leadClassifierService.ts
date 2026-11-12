import trainingData from "../../scripts/data/training_data.json";

const STOP_WORDS = new Set([
  "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your",
  "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she",
  "her", "hers", "herself", "it", "its", "itself", "they", "them", "their",
  "theirs", "themselves", "what", "which", "who", "whom", "this", "that",
  "these", "those", "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an",
  "the", "and", "but", "if", "or", "because", "as", "until", "while", "of",
  "at", "by", "for", "with", "about", "against", "between", "into", "through",
  "during", "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "then", "once",
  "ka", "ki", "ke", "ko", "se", "aur", "hi", "hai", "hu", "tha", "thi", "the"
]);

function cleanAndTokenize(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().match(/[a-z0-9]+/g) || [];
  return words.filter(w => !STOP_WORDS.has(w) && w.length > 1);
}

interface Sample {
  text: string;
  label: string;
}

class PureNLPClassifier {
  private classCounts: Record<string, number> = {};
  private classWordCounts: Record<string, number> = {};
  private vocabulary = new Set<string>();
  private wordCountsPerClass: Record<string, Record<string, number>> = {};
  private idf: Record<string, number> = {};
  private docCount = 0;

  train(samples: Sample[]) {
    this.docCount = samples.length;
    const docOccurrences: Record<string, number> = {};

    for (const sample of samples) {
      const text = sample.text;
      const label = sample.label;

      if (!this.classCounts[label]) {
        this.classCounts[label] = 0;
        this.classWordCounts[label] = 0;
        this.wordCountsPerClass[label] = {};
      }

      this.classCounts[label] += 1;

      const tokens = cleanAndTokenize(text);
      const uniqueTokens = new Set(tokens);

      for (const token of uniqueTokens) {
        docOccurrences[token] = (docOccurrences[token] || 0) + 1;
      }

      for (const token of tokens) {
        this.vocabulary.add(token);
        this.wordCountsPerClass[label][token] = (this.wordCountsPerClass[label][token] || 0) + 1;
        this.classWordCounts[label] += 1;
      }
    }

    for (const token of this.vocabulary) {
      const df = docOccurrences[token] || 0;
      this.idf[token] = Math.log((this.docCount + 1) / (df + 1)) + 1.0;
    }
  }

  predict(text: string): { intent: string; probability: number } {
    const tokens = cleanAndTokenize(text);
    const totalDocs = this.docCount;
    const vocabSize = this.vocabulary.size;

    const scores: Record<string, number> = {};
    let maxScore = -Infinity;
    let bestClass = "GENERAL_INQUIRY";

    for (const label of Object.keys(this.classCounts)) {
      let logProb = Math.log(this.classCounts[label] / totalDocs);

      for (const token of tokens) {
        if (!this.vocabulary.has(token)) continue;

        const wordFreq = this.wordCountsPerClass[label][token] || 0;
        const tokenWeight = (wordFreq + 1) / (this.classWordCounts[label] + vocabSize);
        const tfIdfWeight = this.idf[token] || 1.0;

        logProb += Math.log(tokenWeight) * tfIdfWeight;
      }

      scores[label] = logProb;
      if (logProb > maxScore) {
        maxScore = logProb;
        bestClass = label;
      }
    }

    let sumExp = 0;
    const probs: Record<string, number> = {};
    for (const label of Object.keys(scores)) {
      sumExp += Math.exp(scores[label] - maxScore);
    }

    for (const label of Object.keys(scores)) {
      probs[label] = Math.exp(scores[label] - maxScore) / sumExp;
    }

    return {
      intent: bestClass,
      probability: probs[bestClass] || 0.5,
    };
  }
}

function checkForLoops(history: string[], currentFlowNode: string): { isLooping: boolean; maxRepetition: number } {
  const counts: Record<string, number> = {};
  for (const h of history) {
    counts[h] = (counts[h] || 0) + 1;
  }
  if (currentFlowNode) {
    counts[currentFlowNode] = (counts[currentFlowNode] || 0) + 1;
  }

  const maxRep = Math.max(0, ...Object.values(counts));
  const isLooping = maxRep >= 3;
  return { isLooping, maxRepetition: maxRep };
}

function calculateScoreAndTemp(intent: string, text: string, flowNode: string, isLooping: boolean) {
  let score = 30;
  let temp = "warm";

  const loweredText = (text || "").toLowerCase();

  if (intent === "WEBSITE_DEV" || intent === "CRM_INQUIRY" || intent === "DIGITAL_MARKETING") {
    score = 65;
  } else if (intent === "SPAM") {
    score = 5;
  } else if (intent === "GENERAL_INQUIRY") {
    score = 35;
  }

  const commercialKeywords = ["price", "cost", "pricing", "quote", "quotation", "budget", "how much", "rate", "charges", "kitna", "kharcha", "estimate"];
  if (commercialKeywords.some(k => loweredText.includes(k))) {
    score += 20;
  }

  const urgentKeywords = ["urgent", "immediately", "asap", "call me", "meeting", "talk", "today", "contact"];
  if (urgentKeywords.some(k => loweredText.includes(k))) {
    score += 10;
  }

  if (flowNode === "6232") {
    score = Math.max(score, 95);
    temp = "hot";
  } else if (["6225", "6226", "6227", "6228", "6229", "6230"].includes(flowNode)) {
    score = Math.max(score, 75);
  }

  if (score >= 80) {
    temp = "hot";
  } else if (score <= 20) {
    temp = "cold";
  } else {
    temp = "warm";
  }

  if (isLooping) {
    temp = "warm";
  }

  score = Math.max(0, Math.min(100, score));
  return { score, temp };
}

export function classifyInboundMessage(message: string, _phone: string, flowNode: string, history: string[] = []) {
  let samples: Sample[] = Array.isArray((trainingData as { samples?: Sample[] })?.samples)
    ? (trainingData as { samples: Sample[] }).samples
    : [];

  if (samples.length === 0) {
    samples = [
      { text: "hi", label: "GENERAL_INQUIRY" },
      { text: "website price", label: "WEBSITE_DEV" },
      { text: "need crm integration", label: "CRM_INQUIRY" },
      { text: "seo optimization marketing", label: "DIGITAL_MARKETING" },
      { text: "claim free money spam", label: "SPAM" }
    ];
  }

  const classifier = new PureNLPClassifier();
  classifier.train(samples);

  const { intent, probability } = classifier.predict(message);
  const { isLooping, maxRepetition } = checkForLoops(history, flowNode);
  const { score, temp } = calculateScoreAndTemp(intent, message, flowNode, isLooping);

  const mappedIntents: Record<string, string> = {
    "WEBSITE_DEV": "Website Development Inquiry",
    "CRM_INQUIRY": "CRM Software / Integration",
    "DIGITAL_MARKETING": "SEO & Digital Marketing",
    "GENERAL_INQUIRY": "General Inquiry / Welcome Flow",
    "SPAM": "Spam / Unsolicited Message"
  };

  const intentDesc = mappedIntents[intent] || "General Inquiry";
  let summary = `Customer message indicates a ${intentDesc}.`;
  if (flowNode && flowNode !== "6206") {
    summary += ` Interacted with WhatsApp node ${flowNode}.`;
  }
  if (isLooping) {
    summary += ` WARNING: Customer is looping on menu node ${flowNode} (${maxRepetition} times).`;
  }

  let suggestedAction = "Call within 24 hours";
  if (temp === "hot") {
    suggestedAction = "Send quotation & call immediately";
  } else if (intent === "SPAM") {
    suggestedAction = "Archive / Ignore conversation";
  } else if (isLooping) {
    suggestedAction = "Intervene manually - client is stuck in menu";
  }

  return {
    intent,
    probability: parseFloat(probability.toFixed(4)),
    score,
    leadTemperature: temp,
    summary,
    suggestedAction,
    metadata: {
      looping_detected: isLooping,
      max_repetition: maxRepetition,
      flow_node: flowNode
    }
  };
}
