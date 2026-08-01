import { PrimaryIntent, SecondaryIntent, IntentResult } from '../../types/chat';
import { expandQueryWithSynonyms } from '../nlp/synonyms';
import { extractEntitiesFromMessage } from '../nlp/entityExtractor';

const INTENT_PATTERNS: Record<PrimaryIntent, RegExp[]> = {
  Greeting: [/^(hi|hello|hey|namaste|greetings|good\s*(morning|afternoon|evening))/i],
  Pricing: [/(price|pricing|cost|how much|charge|rate|package|fee|budget|expensive|cheap|discount)/i],
  Appointment: [/(appointment|book|schedule|call|meeting|consultation|demo|slot|talk to|speak with)/i],
  Website: [/(website|site|webpage|web design|web dev|landing page|ecommerce|e-commerce|nextjs|react)/i],
  SEO: [/(seo|search engine|google rank|google ranking|first page|rank on google|organic traffic|keywords)/i],
  'Google Ads': [/(google ad|ppc|pay per click|search ad|youtube ad|sem)/i],
  'Meta Ads': [/(meta ad|facebook ad|instagram ad|fb ad|ig ad|social ad)/i],
  'WhatsApp Automation': [/(whatsapp|wa bot|whatsapp api|bulk whatsapp|auto reply|whatsapp business)/i],
  CRM: [/(crm|lead management|sales tracking|pipeline|customer tracking)/i],
  'AI Automation': [/(ai automation|ai agent|artificial intelligence|ai workflow|n8n|make\.com|automation)/i],
  'AI Avatar': [/(ai avatar|digital human|ai video|spokesperson)/i],
  'Social Media Marketing': [/(social media|smm|instagram management|reels|branding)/i],
  'Business Automation': [/(business automation|workflow|process automation|operations)/i],
  Support: [/(support|help|issue|bug|maintenance|problem|ticket)/i],
  Contact: [/(contact|phone|email|address|location|reach|where is office|gorakhpur)/i],
  Career: [/(career|job|hiring|internship|vacancy|join team)/i],
  Thanks: [/^(thank|thanks|thank you|thx|awesome|great|perfect)/i],
  Goodbye: [/^(bye|goodbye|see you|take care|later)/i],
  Unknown: []
};

const SECONDARY_INTENT_PATTERNS: Record<SecondaryIntent, RegExp[]> = {
  'Buying Intent': [/(want to buy|need to hire|ready to start|interested in|sign up|book now|give quote|get started)/i],
  'Information Seeking': [/(what is|how does|tell me|explain|details|overview|features)/i],
  'Price Sensitivity': [/(expensive|cheaper|discount|best price|lowest rate|negociate)/i],
  Urgency: [/(urgent|asap|fast|today|immediately|quick)/i],
  'Technical Question': [/(stack|tech|react|nextjs|code|hosting|server|database)/i],
  Objection: [/(already have|too costly|other agency|why trinetra|not sure)/i]
};

export class IntentDetector {
  /**
   * Classifies user input into Primary & Secondary Intents with confidence score
   */
  public classify(text: string): IntentResult {
    const extractedEntities = extractEntitiesFromMessage(text);
    const lower = text.toLowerCase().trim();
    const expandedTokens = expandQueryWithSynonyms(text);

    if (!lower) {
      return {
        primary: 'Unknown',
        secondary: [],
        confidence: 0,
        extractedEntities
      };
    }

    // 1. Layer 1: Regex Pattern Matching
    for (const [intentKey, patterns] of Object.entries(INTENT_PATTERNS)) {
      if (intentKey === 'Unknown') continue;
      for (const pattern of patterns) {
        if (pattern.test(lower)) {
          const secondary = this.detectSecondaryIntents(lower);
          return {
            primary: intentKey as PrimaryIntent,
            secondary,
            confidence: 95,
            extractedEntities
          };
        }
      }
    }

    // 2. Layer 2: Keyword Cluster & Synonym Matching
    const intentScores: Record<PrimaryIntent, number> = {
      Greeting: 0, Pricing: 0, Appointment: 0, Website: 0, SEO: 0,
      'Google Ads': 0, 'Meta Ads': 0, 'WhatsApp Automation': 0, CRM: 0,
      'AI Automation': 0, 'AI Avatar': 0, 'Social Media Marketing': 0,
      'Business Automation': 0, Support: 0, Contact: 0, Career: 0,
      Thanks: 0, Goodbye: 0, Unknown: 0
    };

    expandedTokens.forEach((token) => {
      if (['website', 'site', 'webpage'].includes(token)) intentScores.Website += 3;
      if (['seo', 'ranking', 'keywords'].includes(token)) intentScores.SEO += 3;
      if (['price', 'cost', 'charge', 'rate', 'budget'].includes(token)) intentScores.Pricing += 3;
      if (['book', 'appointment', 'meeting', 'call', 'consultation'].includes(token)) intentScores.Appointment += 3;
      if (['whatsapp', 'bot'].includes(token)) intentScores['WhatsApp Automation'] += 3;
      if (['crm', 'pipeline', 'lead'].includes(token)) intentScores.CRM += 3;
      if (['ai', 'automation', 'agent'].includes(token)) intentScores['AI Automation'] += 3;
      if (['contact', 'phone', 'email', 'gorakhpur'].includes(token)) intentScores.Contact += 3;
    });

    let bestIntent: PrimaryIntent = 'Unknown';
    let maxScore = 0;

    for (const [intent, score] of Object.entries(intentScores)) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent as PrimaryIntent;
      }
    }

    const secondary = this.detectSecondaryIntents(lower);

    if (maxScore > 0) {
      const confidence = Math.min(90, 50 + maxScore * 10);
      return {
        primary: bestIntent,
        secondary,
        confidence,
        extractedEntities
      };
    }

    return {
      primary: 'Unknown',
      secondary,
      confidence: 20,
      extractedEntities
    };
  }

  private detectSecondaryIntents(text: string): SecondaryIntent[] {
    const detected: SecondaryIntent[] = [];
    for (const [intentKey, patterns] of Object.entries(SECONDARY_INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          detected.push(intentKey as SecondaryIntent);
          break;
        }
      }
    }
    return detected;
  }
}

export const intentDetector = new IntentDetector();
