export interface KBItem {
  id: string;
  title: string;
  keywords: string[];
  category: string;
  content: string;
  related_topics: string[];
  priority: number;
  // Knowledge Graph Extensions
  related_services?: string[];
  prerequisites?: string[];
  next_step?: string;
  upsell?: string;
  cross_sell?: string[];
}

export type PrimaryIntent =
  | 'Greeting'
  | 'Pricing'
  | 'Appointment'
  | 'Website'
  | 'SEO'
  | 'Google Ads'
  | 'Meta Ads'
  | 'WhatsApp Automation'
  | 'CRM'
  | 'AI Automation'
  | 'AI Avatar'
  | 'Social Media Marketing'
  | 'Business Automation'
  | 'Support'
  | 'Contact'
  | 'Career'
  | 'Thanks'
  | 'Goodbye'
  | 'Unknown';

export type SecondaryIntent =
  | 'Buying Intent'
  | 'Information Seeking'
  | 'Price Sensitivity'
  | 'Urgency'
  | 'Technical Question'
  | 'Objection';

export interface IntentResult {
  primary: PrimaryIntent;
  secondary: SecondaryIntent[];
  confidence: number; // 0 to 100
  extractedEntities: Partial<UserContextMemory>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: number;
  intent?: PrimaryIntent;
  confidence?: number;
  kbItems?: KBItem[];
  suggestedQuestions?: string[];
  actionType?: 'lead_capture' | 'appointment_form' | 'admin_trigger' | 'call_cta';
  highlights?: string[];
  recommendations?: string[];
}

export interface UserContextMemory {
  name?: string;
  phone?: string;
  email?: string;
  businessType?: string;
  preferredService?: string;
  budget?: string;
  city?: string;
  timeline?: string;
  notes?: string;
  lastIntent?: PrimaryIntent;
  previousTopics: string[];
  messages: ChatMessage[];
  activeFlow?: 'idle' | 'lead_capture' | 'appointment_booking';
}

export interface AppointmentLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  business: string;
  service: string;
  budget?: string;
  city?: string;
  date: string;
  time: string;
  notes?: string;
  status: 'Upcoming' | 'Completed' | 'Cancelled';
  createdAt: number;
}

export interface UnknownQueryLog {
  id: string;
  query: string;
  timestamp: number;
  topMatches: Array<{ id: string; title: string; score: number }>;
  resolved: boolean;
}

export interface SearchLog {
  id: string;
  query: string;
  matchedId?: string;
  confidence: number;
  timestamp: number;
}

export interface AnalyticsData {
  totalMessages: number;
  popularQuestions: Record<string, number>;
  intentDistribution: Record<string, number>;
  unknownQueriesCount: number;
  avgConfidence: number;
  totalAppointments: number;
  completedAppointments: number;
  searchLogs: SearchLog[];
}
