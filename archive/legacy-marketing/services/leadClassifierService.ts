import fs from "fs";
import path from "path";

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
        this.classWordCounts[label] += 1;
        this.wordCountsPerClass[label][token] = (this.wordCountsPerClass[label][token] || 0) + 1;
      }
    }

    for (const [token, count] of Object.entries(docOccurrences)) {
      this.idf[token] = Math.log((this.docCount + 1) / (count + 1)) + 1.0;
    }
  }

  predict(text: string): { intent: string; probability: number; allProbs: Record<string, number> } {
    const tokens = cleanAndTokenize(text);
    if (tokens.length === 0) {
      return { intent: "GENERAL_INQUIRY", probability: 0.5, allProbs: {} };
    }

    const hasKnownToken = tokens.some(token => this.vocabulary.has(token));
    if (!hasKnownToken) {
      return { intent: "GENERAL_INQUIRY", probability: 0.5, allProbs: {} };
    }

    const scores: Record<string, number> = {};
    const totalDocs = Object.values(this.classCounts).reduce((sum, c) => sum + c, 0);
    const vocabSize = this.vocabulary.size;

    for (const label of Object.keys(this.classCounts)) {
      const classDocCount = this.classCounts[label];
      const priorProb = classDocCount / totalDocs;
      let logProb = Math.log(priorProb);

      const totalClassWords = this.classWordCounts[label];

      for (const token of tokens) {
        if (this.vocabulary.has(token)) {
          const wordFreq = this.wordCountsPerClass[label][token] || 0;
          const tfIdfWeight = this.idf[token] ?? 1.0;
          const condProb = (wordFreq + 1) / (totalClassWords + vocabSize);
          logProb += tfIdfWeight * Math.log(condProb);
        } else {
          logProb += Math.log(1 / (totalClassWords + vocabSize));
        }
      }

      scores[label] = logProb;
    }

    const maxLog = Math.max(...Object.values(scores));
    const expScores: Record<string, number> = {};
    let sumExp = 0;

    for (const [label, val] of Object.entries(scores)) {
      const expVal = Math.exp(val - maxLog);
      expScores[label] = expVal;
      sumExp += expVal;
    }

    const probabilities: Record<string, number> = {};
    let bestLabel = "GENERAL_INQUIRY";
    let bestProb = 0;

    for (const [label, val] of Object.entries(expScores)) {
      const prob = val / sumExp;
      probabilities[label] = prob;
      if (prob > bestProb) {
        bestProb = prob;
        bestLabel = label;
      }
    }

    return { intent: bestLabel, probability: bestProb, allProbs: probabilities };
  }
}

function checkForLoops(history: string[], currentNode: string): { isLooping: boolean; maxRepetition: number } {
  if (!history || history.length === 0) {
    return { isLooping: false, maxRepetition: 0 };
  }

  const combinedNodes = [...history];
  if (currentNode) {
    combinedNodes.push(currentNode);
  }

  const nodeCounts: Record<string, number> = {};
  for (const node of combinedNodes) {
    if (node && node !== "6206") {
      nodeCounts[node] = (nodeCounts[node] || 0) + 1;
    }
  }

  const counts = Object.values(nodeCounts);
  const maxRepetition = counts.length > 0 ? Math.max(...counts) : 0;
  const isLooping = maxRepetition >= 3;

  return { isLooping, maxRepetition };
}

function calculateScoreAndTemp(intent: string, text: string, flowNode: string, isLooping: boolean): { score: number; temp: string } {
  let score = 50;
  let temp = "warm";

  const intentScores: Record<string, number> = {
    "WEBSITE_DEV": 80,
    "CRM_INQUIRY": 85,
    "DIGITAL_MARKETING": 75,
    "GENERAL_INQUIRY": 45,
    "SPAM": 5
  };

  score = intentScores[intent] ?? 50;

  const loweredText = text.toLowerCase();
  const pricingKeywords = ["price", "cost", "budget", "pricing", "how much", "rate", "packages", "charges"];
  if (pricingKeywords.some(k => loweredText.includes(k))) {
    score += 15;
  }

  const urgentKeywords = ["urgent", "immediately", "asap", "quick", "today", "call me", "call"];
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
  // Load training dataset if available
  let samples: Sample[] = [];
  const datasetPath = path.join(process.cwd(), "scripts", "data", "training_data.json");
  
  if (fs.existsSync(datasetPath)) {
    try {
      const fileData = fs.readFileSync(datasetPath, "utf8");
      const parsed = JSON.parse(fileData);
      samples = parsed.samples || [];
    } catch (e) {
      console.warn("⚠️ Failed to load training_data.json:", e);
    }
  }

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
