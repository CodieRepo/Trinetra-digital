import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, UserContextMemory } from '../types/chat';
import { intentDetector } from '../lib/chat/intentDetector';
import { hybridSearchEngine } from '../lib/search/hybridSearch';
import { responseComposer } from '../lib/chat/responseComposer';
import { memoryManager } from '../lib/chat/memory';
import { analyticsService } from '../lib/analytics/analyticsService';
import { learningSystem } from '../lib/analytics/learningSystem';
import { crmService } from '../lib/crm/crmService';
import { useVoice } from './useVoice';

export function useTrinetraBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [userMemory, setUserMemory] = useState<UserContextMemory>(memoryManager.getMemory());
  const [activeFormCard, setActiveFormCard] = useState<'lead_capture' | 'appointment_form' | null>(null);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Initialize Chat History
  useEffect(() => {
    const memory = memoryManager.getMemory();
    setUserMemory(memory);

    if (memory.messages.length > 0) {
      setMessages(memory.messages);
    } else {
      const welcomeMsg: ChatMessage = {
        id: 'msg-welcome',
        sender: 'bot',
        text: `Hello! I am your **Trinetra AI Growth Advisor**.\n\nHow can I help you grow your business today?`,
        timestamp: Date.now(),
        suggestedQuestions: [
          'Website Development',
          'Search Engine Optimization (SEO)',
          'See Pricing Plans',
          'Book Free Consultation'
        ]
      };
      setMessages([welcomeMsg]);
      memoryManager.addMessage(welcomeMsg);
    }
  }, []);

  const handleVoiceInput = (transcript: string) => {
    sendMessage(transcript);
  };

  const { isSupported: isVoiceSupported, isListening, isSpeaking, startListening, speakText, stopSpeaking } =
    useVoice(handleVoiceInput);

  const sendMessage = useCallback(
    async (userInput: string) => {
      if (!userInput || !userInput.trim() || isTyping) return;

      const trimmedQuery = userInput.trim();

      // 1. Append User Message
      const userMsg: ChatMessage = {
        id: 'msg-' + Date.now() + '-user',
        sender: 'user',
        text: trimmedQuery,
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, userMsg]);
      memoryManager.addMessage(userMsg);
      setIsTyping(true);

      // Simulate realistic typing delay for conversational feel
      setTimeout(() => {
        // 2. Intent Detection & Entity Extraction
        const intentResult = intentDetector.classify(trimmedQuery);

        // Update memory with extracted entities (Name, Phone, City, Budget, etc.)
        if (Object.keys(intentResult.extractedEntities).length > 0) {
          memoryManager.updateContext(intentResult.extractedEntities);
        }

        memoryManager.setLastIntent(intentResult.primary);

        // 3. Hybrid Semantic Search over Knowledge Base
        const searchHits = hybridSearchEngine.search(trimmedQuery, 5);
        const topHit = searchHits[0];

        // Log unknown query if confidence is low
        if (!topHit || topHit.confidence < 35) {
          learningSystem.logUnknownQuery(
            trimmedQuery,
            searchHits.slice(0, 3).map((h) => ({ id: h.item.id, title: h.item.title, score: h.confidence }))
          );
          analyticsService.logUnknownQueryEvent();
        }

        // Log Analytics interaction
        analyticsService.logInteraction(
          trimmedQuery,
          intentResult.primary,
          topHit ? topHit.confidence : 0,
          topHit ? topHit.item.id : undefined
        );

        // 4. Response Composition
        const currentMemory = memoryManager.getMemory();
        setUserMemory(currentMemory);

        const composed = responseComposer.compose(trimmedQuery, intentResult.primary, searchHits, currentMemory);

        // Track topic in memory graph
        if (topHit) {
          memoryManager.addTopic(topHit.item.category);
        }

        // 5. Build Bot Response Message
        const botMsg: ChatMessage = {
          id: 'msg-' + Date.now() + '-bot',
          sender: 'bot',
          text: composed.text,
          timestamp: Date.now(),
          intent: intentResult.primary,
          confidence: topHit ? topHit.confidence : 20,
          kbItems: searchHits.slice(0, 2).map((h) => h.item),
          suggestedQuestions: composed.suggestedQuestions,
          actionType: composed.actionType,
          highlights: composed.highlights,
          recommendations: composed.recommendations
        };

        setMessages((prev) => [...prev, botMsg]);
        memoryManager.addMessage(botMsg);
        setIsTyping(false);

        if (composed.actionType) {
          setActiveFormCard(composed.actionType === 'appointment_form' ? 'appointment_form' : 'lead_capture');
        }

        // Voice Readout if enabled
        if (ttsEnabled) {
          speakText(composed.text);
        }
      }, 600);
    },
    [isTyping, ttsEnabled, speakText]
  );

  const handleLeadSubmit = (leadData: { name: string; phone: string; email?: string; business: string; budget?: string; city?: string; service?: string }) => {
    crmService.addAppointment({
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      business: leadData.business,
      service: leadData.service || 'General Inquiry',
      budget: leadData.budget,
      city: leadData.city,
      date: new Date().toISOString().slice(0, 10),
      time: '11:00 AM',
      notes: 'Submitted via Chatbot Lead Capture'
    });

    memoryManager.updateContext({
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      businessType: leadData.business,
      budget: leadData.budget,
      city: leadData.city
    });

    analyticsService.logAppointmentCreated();

    const successMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-success',
      sender: 'bot',
      text: `🎉 Thank you **${leadData.name}**! Your request for **${leadData.service || 'Trinetra Growth Services'}** has been logged in our system.\n\nOur senior strategist will reach out to you at **${leadData.phone}** within 2 working hours.`,
      timestamp: Date.now(),
      suggestedQuestions: ['Book Consultation Call', 'Explore Case Studies', 'View Pricing']
    };

    setMessages((prev) => [...prev, successMsg]);
    memoryManager.addMessage(successMsg);
    setActiveFormCard(null);
  };

  const handleAppointmentSubmit = (aptData: { name: string; phone: string; business: string; date: string; time: string; service: string; notes?: string }) => {
    crmService.addAppointment({
      name: aptData.name,
      phone: aptData.phone,
      business: aptData.business,
      service: aptData.service,
      date: aptData.date,
      time: aptData.time,
      notes: aptData.notes
    });

    memoryManager.updateContext({
      name: aptData.name,
      phone: aptData.phone,
      businessType: aptData.business
    });

    analyticsService.logAppointmentCreated();

    const confirmMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-apt-confirm',
      sender: 'bot',
      text: `✅ **Strategy Call Confirmed!**\n\n• **Client**: ${aptData.name} (${aptData.business})\n• **Service**: ${aptData.service}\n• **Date**: ${aptData.date}\n• **Time Slot**: ${aptData.time}\n\nWe have scheduled your 1-on-1 strategy call. A Google Meet / Phone invite link will be sent to ${aptData.phone}.`,
      timestamp: Date.now(),
      suggestedQuestions: ['View Services', 'See Pricing', 'Contact Us']
    };

    setMessages((prev) => [...prev, confirmMsg]);
    memoryManager.addMessage(confirmMsg);
    setActiveFormCard(null);
  };

  const resetChat = () => {
    memoryManager.clearMemory();
    const welcomeMsg: ChatMessage = {
      id: 'msg-welcome-reset',
      sender: 'bot',
      text: `Chat history reset. Hello! How can Trinetra Digital Solution assist your business today?`,
      timestamp: Date.now(),
      suggestedQuestions: ['Website Development', 'SEO Packages', 'See Pricing', 'Book Consultation']
    };
    setMessages([welcomeMsg]);
    setUserMemory(memoryManager.getMemory());
    setActiveFormCard(null);
  };

  return {
    messages,
    isTyping,
    userMemory,
    activeFormCard,
    setActiveFormCard,
    isAdminOpen,
    setIsAdminOpen,
    ttsEnabled,
    setTtsEnabled,
    isVoiceSupported,
    isListening,
    isSpeaking,
    startListening,
    stopSpeaking,
    sendMessage,
    handleLeadSubmit,
    handleAppointmentSubmit,
    resetChat
  };
}
