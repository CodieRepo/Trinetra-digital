import { PrimaryIntent, UserContextMemory } from '../../types/chat';
import { SearchResult } from '../search/hybridSearch';
import { getRecommendedNextSteps } from '../../knowledge/graph';

export interface ComposedResponse {
  text: string;
  suggestedQuestions: string[];
  actionType?: 'lead_capture' | 'appointment_form' | 'admin_trigger' | 'call_cta';
  highlights: string[];
  recommendations: string[];
}

export class ResponseComposer {
  /**
   * Composes a natural, intelligent conversational reply by combining KB results, Intent, and Memory
   */
  public compose(
    query: string,
    intent: PrimaryIntent,
    searchHits: SearchResult[],
    memory: UserContextMemory
  ): ComposedResponse {
    const userPrefix = memory.name ? `${memory.name}, ` : '';
    const citySuffix = memory.city ? ` in ${memory.city}` : '';
    const bizNote = memory.businessType ? ` for your ${memory.businessType}` : '';

    // 1. Handle Greetings
    if (intent === 'Greeting') {
      const greetingText = memory.name
        ? `Hello ${memory.name}! Welcome back to Trinetra Digital Solution. How can I assist your business${citySuffix} today?`
        : `Hello! Welcome to Trinetra Digital Solution. I am your Trinetra AI Advisor. How can we help grow your business today?`;
      return {
        text: greetingText,
        suggestedQuestions: [
          'Website Development',
          'Search Engine Optimization (SEO)',
          'See Pricing Plans',
          'Book Free Consultation'
        ],
        highlights: ['Custom Web Development', 'Local & Global SEO', 'WhatsApp & AI Automation'],
        recommendations: ['Website Development', 'SEO Optimization']
      };
    }

    // 2. Handle Thanks / Goodbye
    if (intent === 'Thanks') {
      return {
        text: `You're very welcome${userPrefix ? ', ' + memory.name : ''}! We're always here to assist you. Is there anything else about our services, pricing, or strategy you'd like to explore?`,
        suggestedQuestions: ['See Pricing', 'Book Free Consultation', 'Contact Support'],
        highlights: ['24/7 Digital Consultation'],
        recommendations: []
      };
    }

    if (intent === 'Goodbye') {
      return {
        text: `Goodbye${userPrefix ? ' ' + memory.name : ''}! Have a fantastic day. Whenever you're ready to scale your business${bizNote}, feel free to reach back out!`,
        suggestedQuestions: ['Book Free Consultation', 'Visit Website'],
        highlights: [],
        recommendations: []
      };
    }

    // 3. Handle Appointment Intent explicitly
    if (intent === 'Appointment') {
      return {
        text: `${userPrefix}I can schedule a free 30-minute 1-on-1 growth strategy consultation for you${bizNote}${citySuffix}! Please complete the quick booking form below:`,
        suggestedQuestions: ['Website Pricing', 'SEO Packages', 'WhatsApp Bot Info'],
        actionType: 'appointment_form',
        highlights: ['Free 30-Min Strategy Call', 'Expert 1-on-1 Consultation', 'No Obligation Roadmap'],
        recommendations: ['Custom CRM', 'AI Automation']
      };
    }

    // 4. Handle Contact Intent
    if (intent === 'Contact') {
      return {
        text: `Here are our official contact details:\n• Direct Line / WhatsApp: +91 91258 76789\n• Email: info@trinetradigital.com\n• Head Office: Gorakhpur, Uttar Pradesh, India.\n• Hours: Mon-Sat 9:00 AM – 7:00 PM IST.`,
        suggestedQuestions: ['Book Consultation', 'View Services', 'See Pricing'],
        actionType: 'call_cta',
        highlights: ['Head Office: Gorakhpur, UP', 'WhatsApp: +91 91258 76789'],
        recommendations: []
      };
    }

    // 5. Handle Knowledge Base Search Hits (Top Hits Merging)
    const topHit = searchHits[0];

    // Low confidence / No match fallback
    if (!topHit || topHit.confidence < 30) {
      return {
        text: `I understand you're inquiring about "${query}". While I am continuously expanding my local knowledge, here are our most popular growth solutions for your business:`,
        suggestedQuestions: [
          'Website Development',
          'SEO Packages',
          'Google & Meta Ads',
          'WhatsApp Automation',
          'Book Free Consultation'
        ],
        actionType: 'lead_capture',
        highlights: ['Explore Popular Solutions', 'Book 1-on-1 Strategy Call'],
        recommendations: ['Website Development', 'SEO Packages']
      };
    }

    // Merge content from top 2 non-duplicative hits if available
    let combinedContent = topHit.item.content;
    const highlights: string[] = [topHit.item.title];

    if (searchHits.length > 1 && searchHits[1].confidence > 45) {
      const secondHit = searchHits[1];
      if (secondHit.item.id !== topHit.item.id) {
        combinedContent += `\n\n📌 Related Note (${secondHit.item.title}):\n${secondHit.item.content}`;
        highlights.push(secondHit.item.title);
      }
    }

    // Personalized conclusion
    let conversationalReply = `${userPrefix}${combinedContent}`;
    if (bizNote) {
      conversationalReply += `\n\n💡 *Tailored Note*: This solution is especially powerful ${bizNote}${citySuffix} to maximize qualified inbound leads.`;
    }

    // Graph recommendations for dynamic suggestion chips
    const graphNextItems = getRecommendedNextSteps(topHit.item.id);
    const suggestedQuestions: string[] = [];

    // Always include a pricing or booking chip
    if (intent !== 'Pricing') suggestedQuestions.push('View Pricing');
    suggestedQuestions.push('Book Consultation');

    graphNextItems.forEach((item) => {
      if (suggestedQuestions.length < 5 && !suggestedQuestions.includes(item.title)) {
        suggestedQuestions.push(item.title);
      }
    });

    const recommendations = graphNextItems.map((item) => item.title);

    // Determine buying intent to trigger Lead Capture form
    let actionType: ComposedResponse['actionType'] = undefined;
    if (intent === 'Pricing' || topHit.confidence > 75) {
      actionType = 'lead_capture';
    }

    return {
      text: conversationalReply,
      suggestedQuestions,
      actionType,
      highlights,
      recommendations
    };
  }
}

export const responseComposer = new ResponseComposer();
