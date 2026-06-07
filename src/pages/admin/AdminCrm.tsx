import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation, Link as RouterLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Pencil,
  CheckCircle,
  TrendingUp,
  MessageSquare,
  Send,
  RefreshCw,
  QrCode,
  LogOut,
  Sparkles,
  ArrowRight,
  Loader2,
  Lock,
  Search,
  Plus,
  Settings,
  ShieldAlert,
  Zap,
  Database,
  Play,
  Menu,
  X,
  Activity,
  Clock,
  Compass,
  CheckSquare,
  Calendar,
  Award,
  FileText,
  Trash2,
  Link,
  DollarSign,
  Percent,
  Copy,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { useDashboard } from "../../hooks/useApi";
import { apiService, Lead, Task, TimelineEvent, API_BASE_URL } from "../../services/api";

type ViewSection = 
  | 'overview' 
  | 'conversations' 
  | 'leads' 
  | 'pipelines' 
  | 'conversions' 
  | 'campaigns' 
  | 'automations' 
  | 'agents' 
  | 'reports' 
  | 'integrations' 
  | 'settings' 
  | 'billing' 
  | 'qr';

import { normalizeRawPhone, formatPhoneForDisplay, getDisplayName } from "../../utils/contact";
import AdminPipeline from "./AdminPipeline";

export default function AdminCrm() {
  const {
    token,
    login,
    logout,
    loginLoading,
    loginError,
    
    leads,
    analytics,
    waStatus,
    healthTelemetry,
    auditLogs,
    selectedLeadId,
    setSelectedLeadId,
    leadDetail,
    
    campaigns,
    workflows,
    agents,
    billing,
    
    refreshing,
    backendOnline,
    backupLoading,
    lastSuccessTime,
    
    sendManualMessage,
    updateLeadStatus,
    renameLead,
    updateLeadField,
    toggleAI,
    triggerDatabaseBackup,
    triggerRefresh,
    restartWhatsAppGateway,
    fetchBackups,
    rollbackBackup
  } = useDashboard();

  const navigate = useNavigate();
  const location = useLocation();

  // Navigation and Layout Controls
  const getInitialView = (): ViewSection => {
    const path = window.location.pathname;
    if (path.startsWith('/admin/leads')) return 'leads';
    if (path.startsWith('/admin/conversions')) return 'conversions';
    if (path.startsWith('/admin/pipeline')) return 'pipelines';
    return 'overview';
  };

  const [activeView, setActiveView] = useState<ViewSection>(getInitialView);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sync activeView when URL pathname changes (e.g. back/forward navigation)
  useEffect(() => {
    const path = location.pathname;
    if (path === '/admin') {
      setActiveView('overview');
    } else if (path.startsWith('/admin/leads')) {
      setActiveView('leads');
    } else if (path.startsWith('/admin/conversions')) {
      setActiveView('conversions');
    } else if (path.startsWith('/admin/pipeline')) {
      setActiveView('pipelines');
    }
  }, [location.pathname]);
  const [workspace, setWorkspace] = useState("Trinetra Digital Primary");
  const [activityTab, setActivityTab] = useState<'chats' | 'audit'>('chats');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // WhatsApp Backups and Gateway Control States
  const [backups, setBackups] = useState<Array<{ name: string; timestamp: string; reason: string; connectionStatus: string }>>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [restartingGateway, setRestartingGateway] = useState(false);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  // Phase 3D: Tasks and Timeline state
  const [leadTasks, setLeadTasks] = useState<Task[]>([]);
  const [leadTimeline, setLeadTimeline] = useState<TimelineEvent[]>([]);
  const [tasksPanelTab, setTasksPanelTab] = useState<'tasks' | 'timeline'>('tasks');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [rightPanelTab, setRightPanelTab] = useState<'profile' | 'intelligence' | 'tasks'>('profile');

  // Custom Form & Interactive States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [manualMsgText, setManualMsgText] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [aiMsgText, setAiMsgText] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    { role: 'assistant', text: "Hello! I am your Trinetra AI Copilot. I can write automated replies, score leads, analyze analytics pipelines, or trigger DB backups. Try saying: 'Review latest lead' or 'Create a database backup'." }
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // Phase 4A: Conversions & Slots states
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [conversionStats, setConversionStats] = useState<any>(null);
  const [calendarData, setCalendarData] = useState<{ appointments: any[]; slots: any[] }>({ appointments: [], slots: [] });
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [newSlotDate, setNewSlotDate] = useState("");
  const [newSlotTime, setNewSlotTime] = useState("");
  const [weekOffset, setWeekOffset] = useState(0);
  const [settingsSubTab, setSettingsSubTab] = useState<'general' | 'developer'>('general');
  
  // Selected Package tier for QuoteModal
  const [quoteTier, setQuoteTier] = useState<'starter_presence' | 'growth_engine' | 'sales_system' | 'business_os' | 'custom'>('growth_engine');
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [quoteNotes, setQuoteNotes] = useState("");

  // Load backups when view is changed to QR or developer settings tab
  useEffect(() => {
    if ((activeView === 'qr' || (activeView === 'settings' && settingsSubTab === 'developer')) && token) {
      setLoadingBackups(true);
      fetchBackups().then(data => {
        setBackups(data);
        setLoadingBackups(false);
      }).catch(() => {
        setLoadingBackups(false);
      });
    }
  }, [activeView, settingsSubTab, token]);

  // Phase 3D: Fetch tasks and timeline when a lead is selected
  useEffect(() => {
    if (!selectedLeadId || !token) {
      setLeadTasks([]);
      setLeadTimeline([]);
      return;
    }
    const fetchTasksAndTimeline = async () => {
      try {
        const [tasksRes, timelineRes] = await Promise.all([
          apiService.leads.getTasks(selectedLeadId),
          apiService.leads.getTimeline(selectedLeadId),
        ]);
        setLeadTasks(tasksRes.data || []);
        setLeadTimeline(timelineRes.data || []);
      } catch (err) {
        console.warn('Failed to fetch tasks/timeline:', err);
      }
    };
    fetchTasksAndTimeline();
    const timer = setInterval(fetchTasksAndTimeline, 5000);
    return () => clearInterval(timer);
  }, [selectedLeadId, token]);

  // Phase 3D: Update task status
  const handleUpdateTask = async (taskId: string, status: Task['status']) => {
    setUpdatingTaskId(taskId);
    try {
      await apiService.leads.updateTask(taskId, status);
      setLeadTasks(prev => prev.map(t => t.id === taskId ? { ...t, status } : t));
    } catch (err) {
      console.warn('Failed to update task:', err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  // Handle manual gateway restart
  const handleRestartGateway = async () => {
    if (window.confirm("Are you sure you want to restart the WhatsApp gateway? This will disconnect and rebuild the socket instance.")) {
      setRestartingGateway(true);
      const success = await restartWhatsAppGateway();
      setRestartingGateway(false);
      if (success) {
        alert("Gateway successfully restarted and initialized!");
      } else {
        alert("Failed to restart gateway. Check console logs.");
      }
    }
  };
  
  // Copy phone number to clipboard
  const handleCopyPhone = (phone: string) => {
    navigator.clipboard.writeText(normalizeRawPhone(phone));
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 1500);
  };

  // Inline lead field updates
  const handleUpdateName = async (leadId: string, currentName: string) => {
    const newName = window.prompt("Edit Client Name:", currentName);
    if (newName !== null && newName.trim() !== "") {
      await updateLeadField(leadId, { name: newName.trim() });
    }
  };

  const handleUpdatePhone = async (leadId: string, currentPhone: string) => {
    const newPhone = window.prompt("Edit Client Phone Number:", currentPhone);
    if (newPhone !== null && newPhone.trim() !== "") {
      await updateLeadField(leadId, { phone: newPhone.trim() });
    }
  };

  const handleUpdateCompany = async (leadId: string, currentCompany: string) => {
    const newCompany = window.prompt("Edit Client Company Name:", currentCompany);
    if (newCompany !== null) {
      await updateLeadField(leadId, { company: newCompany.trim() });
    }
  };
  


  // ── 6 Live Sales Metrics for Dashboard Redesign ──
  const leadsTodayCount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return leads.filter(l => l.created_at?.startsWith(todayStr)).length;
  }, [leads]);

  const unreadChatsCount = useMemo(() => {
    return leads.filter(l => l.status === 'new').length;
  }, [leads]);

  const pendingFollowupsCount = useMemo(() => {
    return leads.filter(l => l.status === 'nurturing').length;
  }, [leads]);

  const appointmentsTodayCount = useMemo(() => {
    if (!calendarData?.appointments) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    return calendarData.appointments.filter((appt: any) => {
      const apptDate = appt.preferred_date?.split('T')[0];
      return apptDate === todayStr && appt.status !== 'cancelled';
    }).length;
  }, [calendarData]);

  const revenuePipelineSum = useMemo(() => {
    return leads
      .filter(l => l.status === 'qualified' || l.status === 'nurturing' || l.status === 'ai_qualifying')
      .reduce((sum, l) => sum + (l.deal_setup_value || 0) + ((l.deal_mrr || 0) * 12), 0);
  }, [leads]);

  const wonDealsStats = useMemo(() => {
    const wonLeads = leads.filter(l => l.status === 'won');
    const revenue = wonLeads.reduce((sum, l) => sum + (l.deal_setup_value || 0) + ((l.deal_mrr || 0) * 12), 0);
    return {
      count: wonLeads.length,
      revenue
    };
  }, [leads]);

  // Auto-select package tier from lead profile
  useEffect(() => {
    if (showQuoteModal && leadDetail?.lead?.recommended_package) {
      const rec = leadDetail.lead.recommended_package.toLowerCase();
      if (rec.includes('starter') || rec.includes('presence')) {
        setQuoteTier('starter_presence');
      } else if (rec.includes('growth') || rec.includes('engine')) {
        setQuoteTier('growth_engine');
      } else if (rec.includes('sales') || rec.includes('system')) {
        setQuoteTier('sales_system');
      } else if (rec.includes('business') || rec.includes('os')) {
        setQuoteTier('business_os');
      }
    }
  }, [showQuoteModal, leadDetail]);

  // Pre-populate quotation notes template
  useEffect(() => {
    if (showQuoteModal && leadDetail?.lead) {
      const leadName = getDisplayName(leadDetail.lead);
      const pkgLabel = 
        quoteTier === 'starter_presence' ? 'Starter Presence' :
        quoteTier === 'growth_engine' ? 'Growth Engine' :
        quoteTier === 'sales_system' ? 'Sales System' :
        quoteTier === 'business_os' ? 'Business OS' : 'Custom Service';
      
      setQuoteNotes(`Dear ${leadName},\n\nWe are pleased to share the proposal for our "${pkgLabel}" package. This solution is designed to optimize your operations and drive growth.\n\nKey Deliverables:\n- Next-gen CRM deployment\n- Smart AI lead-responder setup\n- WhatsApp Business API sync\n\nPlease review and let us know if we can proceed.\n\nWarm regards,\nSales Team`);
    }
  }, [showQuoteModal, quoteTier, leadDetail]);
  const [customItems, setCustomItems] = useState<{ description: string; price: number }[]>([
    { description: "Custom Service Setup", price: 0 },
    { description: "Custom Service Monthly", price: 0 }
  ]);

  // Appointment states
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentCallType, setAppointmentCallType] = useState<'call' | 'video' | 'in_person'>('call');
  const [appointmentNotes, setAppointmentNotes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [confirmingApptId, setConfirmingApptId] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completingApptId, setCompletingApptId] = useState("");
  const [apptDealValue, setApptDealValue] = useState(0);

  // Conversions Data fetcher
  useEffect(() => {
    if (!token) return;
    if (activeView === 'overview' || activeView === 'conversions' || showQuoteModal || showAppointmentModal || confirmingApptId || completingApptId) {
      const fetchConversionsData = async () => {
        try {
          const [quotesRes, statsRes, calRes, slotsRes] = await Promise.all([
            apiService.quotations.list(),
            apiService.quotations.getStats(),
            apiService.appointments.getCalendar(),
            apiService.appointments.getSlots(),
          ]);
          setQuotations(quotesRes);
          setConversionStats(statsRes);
          setCalendarData(calRes);
          setAvailableSlots(slotsRes);
        } catch (err) {
          console.warn('Failed to fetch conversions data:', err);
        }
      };
      fetchConversionsData();
      const interval = setInterval(fetchConversionsData, 10000);
      return () => clearInterval(interval);
    }
  }, [activeView, showQuoteModal, showAppointmentModal, token]);

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      alert("Please select a lead first.");
      return;
    }
    try {
      await apiService.quotations.create({
        lead_id: selectedLeadId,
        package_tier: quoteTier,
        custom_items: quoteTier === 'custom' ? customItems : undefined,
        discount_pct: quoteDiscount,
        notes: quoteNotes,
      });
      alert("Quotation generated successfully!");
      setShowQuoteModal(false);
      // Reset form
      setQuoteDiscount(0);
      setQuoteNotes("");
    } catch (err: any) {
      alert(`Error creating quotation: ${err.message}`);
    }
  };

  const handleSendQuotation = async (quoteId: string) => {
    try {
      await apiService.quotations.send(quoteId);
      alert("Quotation link sent to lead via WhatsApp!");
      const quotes = await apiService.quotations.list();
      setQuotations(quotes);
    } catch (err: any) {
      alert(`Error sending quotation: ${err.message}`);
    }
  };

  const handleAcceptQuotation = async (quoteId: string) => {
    if (window.confirm("Are you sure you want to mark this quotation as accepted? This will update the lead stage to WON.")) {
      try {
        await apiService.quotations.accept(quoteId);
        alert("Quotation accepted and lead stage set to WON!");
        const quotes = await apiService.quotations.list();
        setQuotations(quotes);
      } catch (err: any) {
        alert(`Error accepting quotation: ${err.message}`);
      }
    }
  };

  const handleRejectQuotation = async (quoteId: string) => {
    const reason = window.prompt("Enter rejection reason (optional):") || "";
    try {
      await apiService.quotations.reject(quoteId, reason);
      alert("Quotation marked as rejected.");
      const quotes = await apiService.quotations.list();
      setQuotations(quotes);
    } catch (err: any) {
      alert(`Error rejecting quotation: ${err.message}`);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlotDate || !newSlotTime) {
      alert("Date and time are required.");
      return;
    }
    try {
      await apiService.appointments.createSlot({
        slot_date: newSlotDate,
        slot_time: newSlotTime,
        duration_mins: 30
      });
      alert("Available appointment slot created!");
      setNewSlotDate("");
      setNewSlotTime("");
      const slots = await apiService.appointments.getSlots();
      setAvailableSlots(slots);
      const cal = await apiService.appointments.getCalendar();
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error creating slot: ${err.message}`);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    if (window.confirm("Delete this slot?")) {
      try {
        await apiService.appointments.deleteSlot(slotId);
        setAvailableSlots(prev => prev.filter(s => s.id !== slotId));
        const cal = await apiService.appointments.getCalendar();
        setCalendarData(cal);
      } catch (err: any) {
        alert(`Error deleting slot: ${err.message}`);
      }
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeadId) {
      alert("Please select a lead first.");
      return;
    }
    let dateToUse = appointmentDate;
    let timeToUse = appointmentTime;
    
    if (selectedSlotId) {
      const slot = availableSlots.find(s => s.id === selectedSlotId);
      if (slot) {
        dateToUse = slot.slot_date;
        timeToUse = slot.slot_time;
      }
    }

    if (!dateToUse || !timeToUse) {
      alert("Please select an available slot or enter date/time.");
      return;
    }

    try {
      await apiService.appointments.create({
        lead_id: selectedLeadId,
        preferred_date: dateToUse,
        preferred_time: timeToUse,
        call_type: appointmentCallType,
        notes: appointmentNotes,
      });
      alert("Appointment request created successfully!");
      setShowAppointmentModal(false);
      setAppointmentNotes("");
      setSelectedSlotId("");
    } catch (err: any) {
      alert(`Error booking appointment: ${err.message}`);
    }
  };

  const handleConfirmAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.appointments.confirm(confirmingApptId, {
        meeting_link: meetingLink,
        admin_notes: "Confirmed by admin"
      });
      alert("Appointment confirmed! Confirmation message sent to lead via WhatsApp.");
      setShowConfirmModal(false);
      setMeetingLink("");
      const cal = await apiService.appointments.getCalendar();
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error confirming appointment: ${err.message}`);
    }
  };

  const handleCompleteAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.appointments.complete(completingApptId, {
        deal_value: apptDealValue || undefined
      });
      alert("Appointment marked completed!");
      setShowCompleteModal(false);
      setApptDealValue(0);
      const cal = await apiService.appointments.getCalendar();
      setCalendarData(cal);
    } catch (err: any) {
      alert(`Error completing appointment: ${err.message}`);
    }
  };

  const handleSendQuickFollowUp = async (type: string) => {
    if (!selectedLeadId) return;
    const lead = leads.find(l => l.id === selectedLeadId);
    if (!lead) return;
    let message = "";
    if (type === 'quoting') {
      message = `Hi ${lead.name}! Hum aapse related quotation share karne ke liye reach out kar rahe hain. Standard package details download link ready hai. Kya aap custom scope check karna chahte hain?`;
    } else if (type === 'nurturing') {
      message = `Hello ${lead.name} ji! Hum aapse updates lene ke liye call kar rahe the. Kya aapne humare automation systems ke growth details check kiye?`;
    } else {
      message = `Hello ${lead.name}! Kaise hain aap? Agar aapko website, CRM ya digital marketing requirements ko discuss karna ho, toh please batayein. Hum free consultation call schedule kar sakte hain.`;
    }
    const responseText = window.prompt("Confirm or customize the WhatsApp message:", message);
    if (responseText) {
      try {
        setSendingMsg(true);
        await apiService.leads.sendMessage(lead.id, responseText);
        alert("WhatsApp message sent and timeline logged.");
      } catch (err: any) {
        alert(`Failed to send message: ${err.message}`);
      } finally {
        setSendingMsg(false);
      }
    }
  };

  const handleCustomItemChange = (index: number, field: 'description' | 'price', value: string) => {
    const items = [...customItems];
    if (field === 'price') {
      items[index].price = Number(value) || 0;
    } else {
      items[index].description = value;
    }
    setCustomItems(items);
  };

  const addCustomItem = () => {
    setCustomItems([...customItems, { description: "", price: 0 }]);
  };

  const removeCustomItem = (index: number) => {
    setCustomItems(customItems.filter((_, i) => i !== index));
  };

  // Reference hooks for UI components
  const activeChatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const commandPaletteRef = useRef<HTMLDivElement>(null);

  // Handle auto-scroll on conversation timeline updates
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: "smooth"
        });
      }, 50);
    }
  }, [leadDetail?.chats]);

  // Handle Command Palette (Ctrl + K) Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter leads based on global search in Command Palette
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(
      lead => 
        lead.name.toLowerCase().includes(query) || 
        (lead.company && lead.company.toLowerCase().includes(query)) ||
        lead.phone.includes(query)
    );
  }, [leads, searchQuery]);

  // Masking helpers for sensitive data (disabled for full phone visibility)
  const maskPhone = (phone: string) => {
    return formatPhoneForDisplay(phone);
  };


  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMsgText.trim() || !selectedLeadId) return;
    setSendingMsg(true);

    // Auto-pause AI on human reply takeover
    if (leadDetail && leadDetail.lead.ai_enabled === 1) {
      await toggleAI(selectedLeadId, false);
    }

    const sent = await sendManualMessage(selectedLeadId, manualMsgText.trim());
    if (sent) {
      setManualMsgText("");
    }
    setSendingMsg(false);
  };

  // Handle Floating AI Assistant query submit
  const submitAiAssistantQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMsgText.trim()) return;

    const userQuery = aiMsgText.trim();
    setAiMsgText("");
    setAiChatHistory(prev => [...prev, { role: 'user', text: userQuery }]);
    setAiLoading(true);

    // Simulate futuristic AI thinking time
    setTimeout(async () => {
      let aiResponse = "I've analyzed your system parameters. Please specify your request.";
      const queryLower = userQuery.toLowerCase();

      if (queryLower.includes("backup") || queryLower.includes("sqlite")) {
        aiResponse = "🔄 Initializing SQLite database backup sequence... Requesting authorization token...";
        setAiChatHistory(prev => [...prev, { role: 'assistant', text: aiResponse }]);
        const success = await triggerDatabaseBackup();
        if (success) {
          aiResponse = "✅ Database backup created successfully. Timestamp: " + new Date().toLocaleTimeString() + ". Rolling cleanup verified: keeping exactly the 7 latest files to preserve VPS disk space.";
        } else {
          aiResponse = "❌ Backup trigger failed. Server returned 500 error. Verify SQLite DB path configuration.";
        }
      } else if (queryLower.includes("lead") || queryLower.includes("latest")) {
        if (leads.length > 0) {
          const l = leads[0];
          aiResponse = `🤖 **Latest Lead Insights**:
          - **Name**: ${l.name}
          - **Company**: ${l.company || 'Not Specified'}
          - **Service**: ${l.service || 'Automation Solution'}
          - **AI Confidence Score**: ${l.ai_score}/100
          - **Gemini Summary**: "${l.ai_summary || 'Analysis pending in queue.'}"`;
        } else {
          aiResponse = "No leads found in database. Seeding seeder has not preloaded mock data.";
        }
      } else if (queryLower.includes("whatsapp") || queryLower.includes("connection")) {
        aiResponse = `📞 **WhatsApp Integration Telemetry**:
        - **Baileys Status**: ${waStatus?.status.toUpperCase() || 'OFFLINE'}
        - **Session Path**: /var/www/trinetra/server/data/wa-session
        - **Keystore State**: Cacheable signal key store bound and active.
        ${waStatus?.status === 'connected' ? '🟢 System is active. Automatic auto-replies are processing.' : '⚠️ QR Scan required. Open WhatsApp -> Linked Devices -> Scan QR.'}`;
      } else {
        // Standard conversational responses
        aiResponse = "I've registered your request: \"" + userQuery + "\". As your Trinetra operating copilot, I am scanning live Leads, campaigns, and WhatsApp Web socket events to keep your operations optimal.";
      }

      setAiChatHistory(prev => [...prev, { role: 'assistant', text: aiResponse }]);
      setAiLoading(false);
    }, 1200);
  };

  // Perform localized auth submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(username, password);
    if (success) {
      const fromPath = (location.state as any)?.from?.pathname || '/admin';
      navigate(fromPath, { replace: true });
    }
  };

  if (!token) {
    /* ── IMMERSIVE FUTURISTIC AUTHENTICATION INTERFACE ── */
    return (
      <div className="min-h-screen bg-[#F4F5F6] flex items-center justify-center py-20 px-6 relative overflow-hidden">
        {/* Glowing glassmorphic orbital backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-gradient-to-tr from-emerald-200/20 to-teal-300/30 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-to-br from-amber-200/20 to-orange-300/20 rounded-full blur-[90px] pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-white/70 backdrop-blur-2xl border border-white/50 rounded-3xl p-8 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.06)] relative z-10"
        >
          {/* Logo Brand Title */}
          <div className="text-center mb-8">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-100 to-teal-50 border border-emerald-200/30 text-emerald-600 mb-4 shadow-inner">
              <Sparkles size={24} className="animate-pulse" />
            </span>
            <h1 className="font-display text-4xl text-slate-900 tracking-tight font-extrabold bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-700 bg-clip-text text-transparent">Trinetra OS</h1>
            <p className="text-xs text-slate-500 mt-2 font-medium">Business AI Automation Command Center</p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="login-username" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Operational Username</label>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="h-11 rounded-xl border border-slate-200 bg-white/60 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="login-password" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Access Password</label>
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-11 rounded-xl border border-slate-200 bg-white/60 px-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
              />
            </div>

            {loginError && (
              <p className="text-xs text-rose-500 font-semibold text-center mt-2 flex items-center justify-center gap-1.5 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                <ShieldAlert size={14} /> {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold uppercase tracking-wider hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.3)] transition-all disabled:opacity-60 shadow-sm"
            >
              {loginLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>Establish Connection <ArrowRight size={14} /></>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  /* ── FULL MULTI-VIEW PREMIUM SaaS CRM INTERFACE ── */
  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-800 flex overflow-hidden font-sans pt-16">
      
      {/* 🔮 Background orbits */}
      <div className="absolute top-[-20%] left-[-20%] w-[600px] h-[600px] bg-gradient-to-tr from-emerald-100/10 to-teal-200/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-amber-100/10 to-orange-200/10 rounded-full blur-[130px] pointer-events-none" />

      {/* ── CENTRALIZED FLOATING HEADER BAR ── */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-slate-200/80 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(prev => !prev)}
            className="h-9 w-9 flex items-center justify-center border border-slate-200 bg-white/80 hover:bg-slate-50 rounded-xl text-slate-500 transition-all shadow-3xs mr-1"
            title="Toggle Sidebar"
          >
            <Menu size={14} />
          </button>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]">
            <Sparkles size={16} />
          </span>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-slate-800 tracking-tight font-display flex items-center gap-1.5">
              Trinetra Command
              <span className={`inline-block h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            </span>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">{workspace}</span>
          </div>
        </div>

        {/* Global Action items */}
        <div className="flex items-center gap-3">
          {/* Quick Command Search bar */}
          <button 
            onClick={() => setCommandPaletteOpen(true)}
            className="flex h-9 w-60 items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 px-3.5 text-xs text-slate-400 transition-all font-medium"
          >
            <span className="flex items-center gap-1.5"><Search size={14} /> Search everywhere...</span>
            <span className="font-mono text-[9px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-400 shadow-3xs">Ctrl+K</span>
          </button>

          <button
            onClick={triggerRefresh}
            className="h-9 w-9 flex items-center justify-center border border-slate-200 bg-white/80 hover:bg-slate-50 rounded-xl text-slate-500 transition-all shadow-3xs"
            title="Refresh Telemetry"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-emerald-500" : ""} />
          </button>

          <button
            onClick={() => setAiAssistantOpen(true)}
            className="flex h-9 items-center gap-1.5 px-3.5 border border-emerald-200/50 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold tracking-wide transition-all shadow-3xs animate-bounce-slow"
          >
            <Sparkles size={14} />
            Ask AI
          </button>

          <button
            onClick={logout}
            className="h-9 w-9 flex items-center justify-center border border-rose-100 bg-rose-50 hover:bg-rose-100 rounded-xl text-rose-600 transition-all shadow-3xs"
            title="Sign Out System"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* ── SIDEBAR NAVIGATION WORKSPACE ── */}
      <aside 
        className={`w-64 border-r border-slate-200/80 bg-white/60 backdrop-blur-xl shrink-0 flex flex-col pt-4 pb-6 transition-all duration-300 z-30 fixed left-0 top-16 bottom-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 mb-5 shrink-0">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shadow-3xs">T</span>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-bold text-slate-700 truncate">Trinetra Workspace</span>
              <span className="text-[8px] text-slate-400 font-mono">v1.2.0-SaaS</span>
            </div>
          </div>
        </div>

        {/* Dynamic Sidebar Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview Hub', icon: Compass },
            { id: 'conversations', label: 'Conversations', icon: MessageSquare, badge: leads.filter(l => l.status === 'new').length || undefined },
            { id: 'leads', label: 'Leads Command', icon: Users },
            { id: 'pipelines', label: 'CRM Pipelines', icon: TrendingUp },
            { id: 'conversions', label: 'Sales Conversions', icon: Award },
            { id: 'qr', label: 'WhatsApp QR', icon: QrCode, badge: waStatus?.status !== 'connected' ? 'QR' : undefined },
            { id: 'integrations', label: 'Integrations', icon: Activity },
            { id: 'settings', label: 'Settings Panel', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                const view = item.id as ViewSection;
                setActiveView(view);
                if (view === 'overview') {
                  navigate('/admin');
                } else if (view === 'leads' || view === 'conversions') {
                  navigate(`/admin/${view}`);
                } else if (view === 'pipelines') {
                  navigate('/admin/pipeline');
                }
              }}
              className={`flex w-full items-center justify-between h-10 px-3.5 rounded-xl text-xs font-semibold tracking-wide transition-all relative ${
                activeView === item.id 
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-[0_4px_12px_-2px_rgba(16,185,129,0.2)]'
                  : 'text-slate-500 hover:bg-slate-100/50 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <item.icon size={15} />
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className={`h-4 min-w-4 flex items-center justify-center rounded-full text-[8px] font-bold px-1.5 ${
                  activeView === item.id ? 'bg-white text-emerald-700' : 'bg-emerald-500 text-white'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}


        </nav>
      </aside>

      {/* ── MAIN CONTENT WORKSPACE ── */}
      <main className={`flex-1 transition-all duration-300 ${activeView === 'conversations' ? 'h-screen overflow-hidden p-4 md:p-6' : 'min-h-screen overflow-y-auto p-8'} ${sidebarOpen ? "md:pl-64 pl-0" : "pl-0"}`}>
        
        {/* Offline Alarm Alert Bar */}
        {!backendOnline && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-6 text-center text-xs font-semibold text-rose-700 flex items-center justify-center gap-2 animate-pulse shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
            </span>
            ⚠️ Backend connection severed. Reconnecting to {API_BASE_URL}... Verify proxy.
          </div>
        )}

        {/* WhatsApp Connection Warning Alert Bar */}
        {waStatus && waStatus.status !== 'connected' && (
          <div className={`border rounded-2xl p-4 mb-6 text-xs font-semibold flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm transition-all ${
            waStatus.status === 'connecting'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
          }`}>
            <div className="flex items-start gap-2.5">
              <ShieldAlert className={`shrink-0 mt-0.5 ${waStatus.status === 'connecting' ? 'text-amber-500 animate-pulse' : 'text-rose-500'}`} size={16} />
              <div>
                <span className="font-extrabold uppercase tracking-wide block">
                  {waStatus.status === 'connecting' && '🔄 WhatsApp Reconnecting'}
                  {waStatus.status === 'qr_required' && '📷 WhatsApp Pairing Required'}
                  {waStatus.status === 'logged_out' && '🚨 WhatsApp Logged Out'}
                  {waStatus.status === 'auth_failed' && '🚨 WhatsApp Authentication Failed'}
                  {waStatus.status === 'intervention_required' && '🚫 Reconnection Blocked — Intervention Required'}
                  {waStatus.status === 'disconnected' && '⚠️ WhatsApp Gateway Offline'}
                </span>
                <span className="text-[10px] opacity-80 block mt-0.5">
                  {waStatus.status === 'connecting' && 'Attempting automatic connection self-healing recovery...'}
                  {waStatus.status === 'qr_required' && 'Please scan the connection QR code in settings to pair your device.'}
                  {waStatus.status === 'logged_out' && 'The device was unlinked or session logged out. Re-pairing is required.'}
                  {waStatus.status === 'auth_failed' && 'Credentials invalidated or expired. Resetting session and generating fresh QR.'}
                  {waStatus.status === 'intervention_required' && 'Rate limit exceeded: More than 5 reconnect failures in 15 mins. Please check networks and click Restart Gateway below.'}
                  {waStatus.status === 'disconnected' && 'Connection to WhatsApp is completely offline. Verify VPS status.'}
                </span>
                {waStatus.disconnectReason && (
                  <span className="text-[9px] font-mono opacity-80 block mt-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 w-fit">
                    Reason: {waStatus.disconnectReason}
                  </span>
                )}
              </div>
            </div>
            {waStatus.status !== 'connecting' && (
              <button
                onClick={() => setActiveView('qr')}
                className="shrink-0 text-[10px] uppercase font-bold tracking-wider px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer text-slate-700"
              >
                Go to QR Settings
              </button>
            )}
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {activeView === 'overview' && (
                <div className="space-y-6">
                  {/* Title Welcome */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display bg-gradient-to-r from-slate-900 to-emerald-700 bg-clip-text text-transparent">Operations Dashboard</h2>
                      <p className="text-xs text-slate-400 mt-1">Real-time business performance, client appointments, and revenue pipelines.</p>
                    </div>
                    {lastSuccessTime && (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl">
                        Sync status: <b className="text-emerald-800 font-bold">ONLINE ({lastSuccessTime})</b>
                      </span>
                    )}
                  </div>

                  {/* 6 SaaS Sales Cards */}
                  <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
                    {/* Leads Today */}
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-3xs flex flex-col justify-between h-[105px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Leads Today</span>
                        <span className="p-1 rounded-lg bg-slate-50 text-slate-500"><Users size={13} /></span>
                      </div>
                      <div className="mt-1">
                        <p className="text-xl font-black text-slate-800 tracking-tight font-mono">{leadsTodayCount}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">Registered in last 24h</p>
                      </div>
                    </div>

                    {/* Active Conversations */}
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-3xs flex flex-col justify-between h-[105px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Active Conversations</span>
                        <span className="p-1 rounded-lg bg-blue-50 text-blue-500"><MessageSquare size={13} /></span>
                      </div>
                      <div className="mt-1">
                        <p className="text-xl font-black text-blue-600 tracking-tight font-mono">
                          {leads.filter(l => l.status !== 'won' && l.status !== 'lost').length}
                        </p>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">Ongoing nurture threads</p>
                      </div>
                    </div>

                    {/* Pending Followups */}
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-3xs flex flex-col justify-between h-[105px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Pending Followups</span>
                        <span className="p-1 rounded-lg bg-amber-50 text-amber-500"><Clock size={13} /></span>
                      </div>
                      <div className="mt-1">
                        <p className="text-xl font-black text-amber-600 tracking-tight font-mono">{pendingFollowupsCount}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">Active nurture stages</p>
                      </div>
                    </div>

                    {/* Appointments Today */}
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-3xs flex flex-col justify-between h-[105px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Appointments Today</span>
                        <span className="p-1 rounded-lg bg-indigo-50 text-indigo-500"><Calendar size={13} /></span>
                      </div>
                      <div className="mt-1">
                        <p className="text-xl font-black text-indigo-600 tracking-tight font-mono">{appointmentsTodayCount}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">Scheduled consultations</p>
                      </div>
                    </div>

                    {/* Revenue Pipeline */}
                    <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-3xs flex flex-col justify-between h-[105px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">Revenue Pipeline</span>
                        <span className="p-1 rounded-lg bg-emerald-50 text-emerald-500"><TrendingUp size={13} /></span>
                      </div>
                      <div className="mt-1">
                        <p className="text-base font-black text-emerald-600 tracking-tight font-mono">₹{revenuePipelineSum.toLocaleString('en-IN')}</p>
                        <p className="text-[8px] text-slate-400 mt-0.5 truncate">Annual projection</p>
                      </div>
                    </div>

                    {/* Won Deals */}
                    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl shadow-3xs flex flex-col justify-between h-[105px]">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider font-mono">Won Deals</span>
                        <span className="p-1 rounded-lg bg-emerald-100 text-emerald-700"><Award size={13} /></span>
                      </div>
                      <div className="mt-1">
                        <p className="text-base font-black text-emerald-700 tracking-tight font-mono">₹{wonDealsStats.revenue.toLocaleString('en-IN')}</p>
                        <p className="text-[8px] text-emerald-600 mt-0.5 truncate">Across {wonDealsStats.count} conversions</p>
                      </div>
                    </div>
                  </div>

                  {/* Funnel chart and recent activity grid */}
                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                    {/* Combined Live Activity Feed & Audit Timeline */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs flex flex-col h-[400px]">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                        <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity size={14} className="text-emerald-600" /> Live Operational Activity
                        </h3>
                        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                          <button
                            onClick={() => setActivityTab('chats')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-bold tracking-wide transition-all border-0 cursor-pointer ${
                              activityTab === 'chats' ? 'bg-slate-800 text-white shadow-3xs' : 'text-slate-400 hover:text-slate-600 bg-transparent'
                            }`}
                          >
                            Messaging stream
                          </button>
                          <button
                            onClick={() => setActivityTab('audit')}
                            className={`px-3 py-1 rounded-lg text-[9px] font-bold tracking-wide transition-all border-0 cursor-pointer ${
                              activityTab === 'audit' ? 'bg-slate-800 text-white shadow-3xs' : 'text-slate-400 hover:text-slate-600 bg-transparent'
                            }`}
                          >
                            System Audit Logs
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto pr-1">
                        {activityTab === 'chats' ? (
                          analytics?.recentActivity && analytics.recentActivity.length > 0 ? (
                            <div className="space-y-3.5">
                              {analytics.recentActivity.map((act: any, idx: number) => (
                                <div key={act.id || idx} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                  <span className={`h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                    act.direction === 'inbound' 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                      : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                                  }`}>
                                    {act.direction === 'inbound' ? 'IN' : 'AI'}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2">
                                      <p className="text-xs font-bold text-slate-800 truncate">{act.lead_name}</p>
                                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                        {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-1 truncate max-w-[420px] font-sans">
                                      {act.body}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                              <MessageSquare size={24} className="opacity-40" />
                              <p className="text-[11px] italic">No messages recorded in live database yet.</p>
                            </div>
                          )
                        ) : (
                          auditLogs && auditLogs.length > 0 ? (
                            <div className="space-y-3.5">
                              {auditLogs.slice(0, 8).map((log, idx) => (
                                <div key={log.id || idx} className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                                  <span className={`px-2 py-0.5 rounded-lg text-[8px] font-mono font-bold shrink-0 border ${
                                    log.action === 'HUMAN_TAKEOVER'
                                      ? 'bg-amber-50 text-amber-600 border-amber-100'
                                      : log.action === 'LEAD_CREATION'
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                      : log.action === 'WHATSAPP_SEND'
                                      ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                      : log.action === 'CRON_STEP_DISPATCH'
                                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {log.action.replace('WHATSAPP_', 'WA_')}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline gap-2">
                                      <p className="text-[11px] font-medium text-slate-600 leading-normal">
                                        {log.details}
                                      </p>
                                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                              <Activity size={24} className="opacity-40" />
                              <p className="text-[11px] italic">No system audit logs found in SQLite database.</p>
                            </div>
                          )
                        )}
                      </div>
                    </div>

                    {/* Pipeline Stage Distribution Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-3xs flex flex-col justify-between h-[400px]">
                      <div>
                        <h3 className="text-xs font-bold text-slate-700 mb-4 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-3.5">
                          <TrendingUp size={14} className="text-emerald-600" /> Pipeline Stage Breakdown
                        </h3>
                        
                        <div className="space-y-3">
                          {[
                            { stage: 'new', label: 'New Leads', color: 'bg-slate-400' },
                            { stage: 'ai_qualifying', label: 'AI Qualifying', color: 'bg-indigo-400' },
                            { stage: 'qualified', label: 'Qualified Opportunities', color: 'bg-blue-500' },
                            { stage: 'nurturing', label: 'Nurturing Follow-ups', color: 'bg-amber-500' },
                            { stage: 'won', label: 'Closed Won', color: 'bg-emerald-500' },
                            { stage: 'lost', label: 'Closed Lost', color: 'bg-rose-500' }
                          ].map(item => {
                            const count = leads.filter(l => l.status === item.stage).length;
                            const pct = leads.length > 0 ? Math.round((count / leads.length) * 100) : 0;
                            return (
                              <div key={item.stage} className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold text-slate-600">
                                  <span>{item.label}</span>
                                  <span>{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className={`${item.color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Summary Stats */}
                      <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 font-mono flex justify-between items-center">
                        <span>Active leads: {leads.filter(l => l.status !== 'lost' && l.status !== 'won').length}</span>
                        <span className="font-bold text-emerald-600">Win Rate: {leads.length > 0 ? Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) : 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 2: TEAM INBOX / CONVERSATIONS ── */}
              {activeView === 'conversations' && (
                <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-[250px_1fr] lg:grid-cols-[280px_1fr_300px] h-[calc(100vh-120px)]">
                  {/* Left Column: Thread List */}
                  <div className={`border-r border-slate-200 flex flex-col h-full bg-white/40 ${selectedLeadId ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-4 border-b border-slate-200 shrink-0 space-y-3">
                      <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        Live Threads
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-2 py-0.5 rounded-full">
                          {leads.length} LEADS
                        </span>
                      </h3>
                      {/* Search Bar Input */}
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search name or phone..."
                        className="w-full h-8 px-3 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1.5 p-2">
                      {filteredLeads.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-6">No threads matching query</p>
                      ) : (
                        filteredLeads.map((lead) => {
                          const isSelected = selectedLeadId === lead.id;
                          return (
                            <button
                              key={lead.id}
                              onClick={() => setSelectedLeadId(lead.id)}
                              className={`flex flex-col w-full text-left p-3 rounded-xl transition-all border border-l-4 ${
                                isSelected 
                                  ? 'bg-slate-50/90 border-slate-200 border-l-emerald-600 shadow-sm' 
                                  : 'border-transparent border-l-transparent hover:bg-slate-50/50 hover:border-slate-100'
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
                                  {getDisplayName(lead)}
                                </span>
                                {/* Score Badge */}
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                  lead.ai_score >= 80 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : lead.ai_score >= 50 
                                      ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                      : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {lead.ai_score || 50}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 font-mono">{formatPhoneForDisplay(lead.phone)}</span>
                              
                              {/* Pipeline Stage Badge */}
                              <div className="flex justify-between items-center w-full mt-2">
                                <div className="flex gap-1 items-center">
                                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider ${
                                    lead.status === 'won' 
                                      ? 'bg-emerald-500/10 text-emerald-700' 
                                      : lead.status === 'lost' 
                                        ? 'bg-rose-500/10 text-rose-700' 
                                        : lead.status === 'nurturing' 
                                          ? 'bg-blue-500/10 text-blue-700' 
                                          : lead.status === 'qualified' 
                                            ? 'bg-indigo-500/10 text-indigo-700' 
                                            : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {lead.status.replace('_', ' ')}
                                  </span>
                                  {lead.ai_enabled === 0 && (
                                    <span className="text-[8px] font-extrabold text-rose-600 bg-rose-50 border border-rose-100 px-1 py-0.5 rounded">
                                      PAUSED
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] font-bold text-emerald-600 font-mono">
                                  ₹{((lead.deal_setup_value || 0) + (lead.deal_mrr || 0) * 12).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Middle Column: Chat Timeline */}
                  <div className={`flex flex-col h-full border-r border-slate-200 bg-white/20 ${selectedLeadId ? 'flex' : 'hidden md:flex'}`}>
                    {leadDetail ? (
                      <>
                        <div className="p-4 border-b border-slate-200 bg-white shrink-0 space-y-3 shadow-3xs">
                          {/* Top Row: Mobile back button, Name, Company, and Phone with edit actions */}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Mobile Back Button */}
                              <button
                                type="button"
                                onClick={() => setSelectedLeadId(null)}
                                className="md:hidden p-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 mr-1 shrink-0"
                                title="Back to thread list"
                              >
                                <ChevronLeft size={16} />
                              </button>

                              {/* Inline Editable Fields */}
                              <div className="flex flex-col gap-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className="text-sm font-black text-slate-800 truncate select-all">{getDisplayName(leadDetail.lead)}</h4>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateName(leadDetail.lead.id, leadDetail.lead.name || '')}
                                    className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors bg-transparent border-0 cursor-pointer"
                                    title="Edit name"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                  <div className="flex items-center gap-1 truncate">
                                    <span className="font-semibold text-slate-400">Co:</span>
                                    <span className="font-bold text-slate-700 truncate">{leadDetail.lead.company || '—'}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateCompany(leadDetail.lead.id, leadDetail.lead.company || '')}
                                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors bg-transparent border-0 cursor-pointer"
                                      title="Edit company"
                                    >
                                      <Pencil size={9} />
                                    </button>
                                  </div>
                                  <span>·</span>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <span className="font-semibold text-slate-400 font-sans">Phone:</span>
                                    <span className="font-mono font-bold text-slate-700 select-all">{formatPhoneForDisplay(leadDetail.lead.phone)}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePhone(leadDetail.lead.id, leadDetail.lead.phone || '')}
                                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded transition-colors bg-transparent border-0 cursor-pointer"
                                      title="Edit phone number"
                                    >
                                      <Pencil size={9} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Stage & AI Status */}
                            <div className="flex items-center gap-2 shrink-0">
                              {/* Stage Selector */}
                              <select
                                value={leadDetail.lead.status}
                                onChange={(e) => updateLeadStatus(leadDetail.lead.id, e.target.value as Lead['status'])}
                                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 h-8 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                              >
                                <option value="new">New</option>
                                <option value="ai_qualifying">AI Qualifying</option>
                                <option value="qualified">Qualified</option>
                                <option value="nurturing">Nurturing</option>
                                <option value="won">Won</option>
                                <option value="lost">Lost</option>
                              </select>

                              {/* AI Status Indicator */}
                              <span className={`h-8 px-2.5 rounded-xl border text-[10px] font-bold flex items-center gap-1.5 ${
                                leadDetail.lead.ai_enabled === 0
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${leadDetail.lead.ai_enabled === 0 ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                                {leadDetail.lead.ai_enabled === 0 ? 'AI PAUSED' : 'AI ACTIVE'}
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Value, Score, Intent Badges */}
                          <div className="flex flex-wrap items-center justify-between border-t border-slate-100 pt-2.5 text-xs gap-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Intent Badge */}
                              {(() => {
                                const intent = leadDetail.lead.intent_level || 'COLD';
                                const style = intent === 'HOT' 
                                  ? 'bg-rose-50 border-rose-200 text-rose-700' 
                                  : intent === 'QUOTATION_REQUIRED' 
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                                  : intent === 'WARM' 
                                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                  : 'bg-blue-50 border-blue-200 text-blue-700';
                                return (
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border uppercase tracking-wider ${style}`}>
                                    {intent === 'HOT' ? '🔥' : intent === 'QUOTATION_REQUIRED' ? '📝' : intent === 'WARM' ? '⚡' : '❄️'} {intent.replace('_', ' ')}
                                  </span>
                                );
                              })()}

                              {/* Lead Score Badge */}
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-700">
                                ⭐ Score: {leadDetail.lead.ai_score || 50}/100
                              </span>

                              {/* Source Badge */}
                              <span className="px-2 py-0.5 text-[9px] font-bold rounded-lg border border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider">
                                {leadDetail.lead.source}
                              </span>
                            </div>

                            {/* Estimated Deal Value (Setup + MRR * 12) */}
                            <div className="flex items-baseline gap-1.5 text-xs">
                              <span className="text-slate-400 font-medium">Est. Value (An.):</span>
                              <strong className="text-emerald-700 text-sm font-mono">
                                ₹{((leadDetail.lead.deal_setup_value || 0) + (leadDetail.lead.deal_mrr || 0) * 12).toLocaleString('en-IN')}
                              </strong>
                              <span className="text-[9px] text-slate-400 font-medium">
                                (₹{leadDetail.lead.deal_setup_value || 0} setup + ₹{leadDetail.lead.deal_mrr || 0}/mo)
                              </span>
                            </div>
                          </div>

                          {/* Bottom Row: Unified Above-The-Fold Action Toolbar */}
                          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                            {/* Direct WhatsApp Web link */}
                            <a
                              href={`https://wa.me/${normalizeRawPhone(leadDetail.lead.phone).replace('+', '').trim()}`}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 px-3.5 bg-[#25D366] hover:bg-[#20ba56] text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-3xs transition-colors cursor-pointer border-0 decoration-none animate-none"
                            >
                              <MessageSquare size={12} /> WhatsApp Web
                            </a>

                            {/* Direct Call Link */}
                            <a
                              href={`tel:${normalizeRawPhone(leadDetail.lead.phone).trim()}`}
                              className="h-8 px-3.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-3xs transition-colors cursor-pointer border-0 decoration-none"
                            >
                              📞 Call Lead
                            </a>

                            {/* Copy Number */}
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(leadDetail.lead.phone)}
                              className="h-8 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-3xs transition-all cursor-pointer border border-slate-200"
                            >
                              <Copy size={11} />
                              {copiedPhone ? 'Copied!' : 'Copy Number'}
                            </button>

                            {/* Generate Quote */}
                            <button
                              type="button"
                              onClick={() => setShowQuoteModal(true)}
                              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-3xs transition-colors cursor-pointer border-0"
                            >
                              💰 Generate Quote
                            </button>

                            {/* Book Demo */}
                            <button
                              type="button"
                              onClick={() => setShowAppointmentModal(true)}
                              className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-3xs transition-colors cursor-pointer border-0"
                            >
                              📅 Book Demo
                            </button>

                            {/* Pause/Resume AI */}
                            <button
                              type="button"
                              onClick={() => toggleAI(leadDetail.lead.id, leadDetail.lead.ai_enabled === 0)}
                              className={`h-8 px-3.5 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border cursor-pointer ml-auto ${
                                leadDetail.lead.ai_enabled === 1
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              {leadDetail.lead.ai_enabled === 1 ? 'Pause AI' : 'Resume AI'}
                            </button>
                          </div>
                        </div>
                        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                          {leadDetail.chats.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                              <MessageSquare size={24} className="opacity-40" />
                              No conversation logs
                            </div>
                          ) : (
                            leadDetail.chats.map((chat) => (
                              <div
                                key={chat.id}
                                className={`flex ${chat.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                              >
                                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 leading-relaxed shadow-3xs ${
                                  chat.direction === 'outbound'
                                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-br-none'
                                    : 'bg-white text-slate-800 border border-slate-200/60 rounded-bl-none'
                                }`}>
                                  <p>{chat.body}</p>
                                  <span className="text-[8px] opacity-75 mt-1 block text-right">
                                    {new Date(chat.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                          <div ref={activeChatEndRef} />
                        </div>

                        {/* Send composer form */}
                        <form onSubmit={handleSendChat} className="p-4 border-t border-slate-200 bg-white/50 shrink-0 flex flex-col gap-3">
                          {/* AI Status Banners */}
                          <div className={`px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center justify-between ${
                            leadDetail.lead.ai_enabled === 1
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                              : 'bg-amber-50 text-amber-800 border border-amber-100'
                          }`}>
                            <span className="flex items-center gap-1.5">
                              {leadDetail.lead.ai_enabled === 1 
                                ? '🤖 AI auto-reply is Active. Sending a message will pause AI and enable manual takeover.' 
                                : '⏸ AI is paused. Manual takeover mode is active.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleAI(leadDetail.lead.id, leadDetail.lead.ai_enabled === 0)}
                              className="text-[9px] uppercase font-black tracking-wider underline hover:text-slate-900 bg-transparent border-0 cursor-pointer"
                            >
                              {leadDetail.lead.ai_enabled === 1 ? 'Pause AI' : 'Resume AI'}
                            </button>
                          </div>

                          {/* Quick replies */}
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: '👋 Greeting', text: `Hi ${leadDetail.lead.name || 'there'}! Hum Trinetra Automation Solutions se bol rahe hain. Hum aapse kaise help kar sakte hain?` },
                              { label: '💰 Share Pricing', text: `Aapke scope ke according standard packages detail shared link pe upload ho gayi hai. Generative AI support monthly ₹7,999 se start hai. Kya hum custom call book karein?` },
                              { label: '📅 Ask Demo Slot', text: `Kya aap website aur WhatsApp automation system ka live demo check karna chahte hain? Please choose your free timing slot.` },
                              { label: '🏢 Location Details', text: `Humara corporate office Gorakhpur, Uttar Pradesh me status active hai. Custom requirements support online complete process verify ho jayegi.` }
                            ].map((qr, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setManualMsgText(qr.text)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg text-[9px] font-bold border border-slate-200/60 transition-all cursor-pointer"
                              >
                                {qr.label}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              value={manualMsgText}
                              onChange={(e) => setManualMsgText(e.target.value)}
                              placeholder="Send WhatsApp directly..."
                              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                            />
                            <button
                              type="submit"
                              disabled={sendingMsg || !manualMsgText.trim()}
                              className="h-10 w-10 flex items-center justify-center bg-gradient-to-tr from-emerald-600 to-teal-600 text-white rounded-xl hover:shadow-[0_4px_10px_rgba(16,185,129,0.2)] transition-all shrink-0 disabled:opacity-50"
                            >
                              {sendingMsg ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            </button>
                          </div>
                        </form>
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                        <MessageSquare size={32} className="opacity-40" />
                        Select a lead thread to view active chats
                      </div>
                    )}
                  </div>

                  {/* Right Column: Lead context profile */}
                  <div className="h-full overflow-y-auto bg-slate-50/70 p-4 border-l border-slate-200 hidden lg:block w-[320px]">
                    {leadDetail ? (
                      <>
                        {/* Tabs Header */}
                        <div className="flex border-b border-slate-200 mb-4 bg-white rounded-xl shadow-3xs p-1">
                          {(['profile', 'intelligence', 'tasks'] as const).map(tab => (
                            <button
                              key={tab}
                              type="button"
                              onClick={() => setRightPanelTab(tab)}
                              className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                                rightPanelTab === tab 
                                  ? 'bg-slate-800 text-white shadow-3xs' 
                                  : 'text-slate-450 hover:text-slate-655 hover:bg-slate-50 bg-transparent'
                              }`}
                            >
                              {tab === 'profile' ? '👤 Profile' : tab === 'intelligence' ? '🤖 AI Insights' : '📋 Tasks'}
                            </button>
                          ))}
                        </div>

                        {rightPanelTab === 'profile' && (
                          <div className="space-y-4">
                            {/* Profile Info Card */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-3xs text-xs">
                              <div>
                                <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Client Name</p>
                                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{getDisplayName(leadDetail.lead)}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-2 text-[11px]">
                                <div>
                                  <p className="text-slate-400 font-medium">Lead Source</p>
                                  <p className="font-bold text-slate-700 mt-0.5 capitalize">{leadDetail.lead.source}</p>
                                </div>
                                <div>
                                  <p className="text-slate-400 font-medium">Company</p>
                                  <p className="font-bold text-slate-700 mt-0.5 truncate">{leadDetail.lead.company || '—'}</p>
                                </div>
                              </div>
                              <div className="border-t border-slate-100 pt-2 text-[11px]">
                                <p className="text-slate-400 font-medium">WhatsApp Phone</p>
                                <p className="font-mono font-bold text-slate-750 mt-0.5">{formatPhoneForDisplay(leadDetail.lead.phone)}</p>
                              </div>
                              {leadDetail.lead.email && (
                                <div className="border-t border-slate-100 pt-2 text-[11px]">
                                  <p className="text-slate-400 font-medium">Email Address</p>
                                  <p className="font-bold text-slate-750 mt-0.5 truncate">{leadDetail.lead.email}</p>
                                </div>
                              )}
                            </div>

                            {/* Internal Sales Notes Area */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5 shadow-3xs text-xs">
                              <div>
                                <p className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Internal Sales Notes</p>
                                <textarea
                                  value={leadDetail.lead.notes || ""}
                                  onChange={(e) => {
                                    const text = e.target.value;
                                    setLeadDetail(prev => prev ? { ...prev, lead: { ...prev.lead, notes: text } } : null);
                                  }}
                                  placeholder="Type custom follow-up details, client requirements, or context..."
                                  className="w-full h-20 border border-slate-200 bg-slate-50 rounded-xl p-2.5 mt-1.5 focus:outline-none font-sans text-[11px] leading-relaxed resize-none"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await apiService.leads.update(leadDetail.lead.id, { notes: leadDetail.lead.notes });
                                      alert("Notes saved successfully!");
                                    } catch (err) {
                                      alert("Failed to save notes.");
                                    }
                                  }}
                                  className="mt-2 w-full h-8 bg-slate-800 hover:bg-slate-750 text-white font-bold text-[10px] rounded-xl transition-colors cursor-pointer border-0"
                                >
                                  Save Notes
                                </button>
                              </div>
                            </div>

                            {/* Follow-up Drip Status */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-3xs text-xs">
                              <p className="font-extrabold text-slate-800 text-xs">Nurture Sequence Timeline</p>
                              
                              {leadDetail.followup ? (
                                <div className="space-y-2 text-[11px]">
                                  <div className="flex justify-between items-center text-slate-600">
                                    <span>Scheduler Mode:</span>
                                    <span className="font-bold text-slate-850 capitalize">{leadDetail.followup.sequence_name.replace('_', ' ')}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-600">
                                    <span>Current Step:</span>
                                    <span className="font-bold text-slate-850">Step {leadDetail.followup.current_step} of 3</span>
                                  </div>
                                  <div className="flex justify-between items-center text-slate-600">
                                    <span>Scheduler Status:</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                      leadDetail.followup.status === 'active' && leadDetail.lead.ai_enabled === 1
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}>
                                      {leadDetail.lead.ai_enabled === 0 ? 'PAUSED' : leadDetail.followup.status}
                                    </span>
                                  </div>
                                  {leadDetail.followup.status === 'active' && leadDetail.lead.ai_enabled === 1 && (
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-2 space-y-1 font-mono text-[9px]">
                                      <p className="text-slate-400 uppercase font-bold tracking-wider">Next Auto Message Date</p>
                                      <p className="font-bold text-slate-600 mt-0.5">
                                        {new Date(leadDetail.followup.next_run_at).toLocaleString()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-400 italic">No automated follow-up sequences scheduled.</p>
                              )}
                            </div>
                          </div>
                        )}

                        {rightPanelTab === 'intelligence' && (
                          <div className="space-y-4">
                            {/* AI Intent & Score Card */}
                            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-750/50 rounded-2xl p-4 space-y-3.5 shadow-sm text-slate-200 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles size={10} className="animate-pulse" /> AI Lead Intelligence
                                </span>
                                {leadDetail.lead.intent_level && (
                                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                    leadDetail.lead.intent_level === 'QUOTATION_REQUIRED' ? 'bg-amber-900/40 text-amber-300 border-amber-700/50' :
                                    leadDetail.lead.intent_level === 'HOT' ? 'bg-rose-900/40 text-rose-300 border-rose-700/50 animate-pulse' :
                                    leadDetail.lead.intent_level === 'WARM' ? 'bg-orange-900/40 text-orange-300 border-orange-700/50' :
                                    'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    {leadDetail.lead.intent_level === 'QUOTATION_REQUIRED' ? '💰 QUOTE REQ.' :
                                     leadDetail.lead.intent_level === 'HOT' ? '🔥 HOT' :
                                     leadDetail.lead.intent_level === 'WARM' ? '🌡 WARM' : '❄️ COLD'}
                                  </span>
                                )}
                              </div>

                              <div className="flex justify-between items-center border-t border-slate-750/45 pt-2.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AI Score</span>
                                <span className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-black border ${
                                  leadDetail.lead.ai_score >= 80 ? 'bg-emerald-950 text-emerald-400 border-emerald-800/40' :
                                  leadDetail.lead.ai_score >= 50 ? 'bg-amber-950 text-amber-400 border-amber-800/40' :
                                  'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {leadDetail.lead.ai_score || 50}
                                </span>
                              </div>

                              {/* Detailed AI Summary */}
                              <div className="bg-slate-950/40 rounded-xl p-3 text-[11px] text-slate-300 leading-relaxed italic border border-slate-750/30">
                                {leadDetail.lead.ai_summary_detailed
                                  ? leadDetail.lead.ai_summary_detailed
                                  : leadDetail.lead.ai_summary
                                  ? `"${leadDetail.lead.ai_summary}"`
                                  : 'AI is building a profile from this conversation...'}
                              </div>

                              {/* Recommended Action */}
                              {leadDetail.lead.recommended_action && (
                                <div className="flex items-center gap-2 bg-emerald-950/45 border border-emerald-900/30 rounded-xl px-3 py-2">
                                  <CheckSquare size={12} className="text-emerald-400 shrink-0" />
                                  <span className="text-[10px] text-emerald-350 font-semibold">{leadDetail.lead.recommended_action}</span>
                                </div>
                              )}

                              {/* Budget & Package Signals */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-slate-750/45 pt-2.5">
                                {leadDetail.lead.budget_range && (
                                  <div className="bg-slate-800/40 border border-slate-750/30 rounded-xl px-2.5 py-2">
                                    <p className="text-slate-500 text-[8px] uppercase font-bold mb-0.5">Budget Signal</p>
                                    <p className="text-slate-300 font-semibold truncate">{leadDetail.lead.budget_range}</p>
                                  </div>
                                )}
                                {leadDetail.lead.recommended_package && (
                                  <div className="bg-slate-800/40 border border-slate-750/30 rounded-xl px-2.5 py-2">
                                    <p className="text-slate-500 text-[8px] uppercase font-bold mb-0.5">Rec. Package</p>
                                    <p className="text-slate-300 font-semibold truncate">{leadDetail.lead.recommended_package}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {rightPanelTab === 'tasks' && (
                          <div className="space-y-4">
                            {/* Tasks checklist card */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-3xs text-xs">
                              <p className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                                <CheckSquare size={13} className="text-slate-550" /> Tasks Checklist
                              </p>
                              
                              {leadTasks.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic py-2">No active tasks scheduled.</p>
                              ) : (
                                <div className="divide-y divide-slate-100 max-h-[180px] overflow-y-auto pr-1">
                                  {leadTasks.map(task => (
                                    <div key={task.id} className="py-2.5 flex items-start gap-2 last:pb-0">
                                      <span className="mt-0.5 text-[9px]">{task.status === 'completed' ? '✅' : '📌'}</span>
                                      <div className="flex-1 min-w-0">
                                        <p className={`text-[11px] font-semibold leading-tight ${
                                          task.status === 'completed' || task.status === 'cancelled'
                                            ? 'text-slate-450 line-through font-normal'
                                            : 'text-slate-800'
                                        }`}>{task.title}</p>
                                        {task.due_at && (
                                          <p className="text-[9px] text-slate-400 mt-0.5">
                                            Due: {new Date(task.due_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                          </p>
                                        )}
                                      </div>
                                      {task.status !== 'completed' && task.status !== 'cancelled' && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTask(task.id, 'completed')}
                                          disabled={updatingTaskId === task.id}
                                          className="shrink-0 h-5 px-1.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all disabled:opacity-50 cursor-pointer"
                                        >
                                          {updatingTaskId === task.id ? '...' : '✓ Done'}
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Lead activity timeline card */}
                            <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-3xs text-xs">
                              <p className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                                <Activity size={13} className="text-slate-550" /> Lead Activity Timeline
                              </p>
                              
                              {leadTimeline.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic py-2">No timeline events logged.</p>
                              ) : (
                                <div className="divide-y divide-slate-50 max-h-[180px] overflow-y-auto pr-1">
                                  {leadTimeline.slice(0, 12).map(event => (
                                    <div key={event.id} className="py-2 flex items-start gap-2.5 last:pb-0">
                                      <span className={`mt-0.5 h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 text-[7px] font-bold ${
                                        event.event_type === 'inbound' ? 'bg-emerald-50 text-emerald-600' :
                                        event.event_type === 'outbound' ? 'bg-indigo-50 text-indigo-600' :
                                        'bg-slate-100 text-slate-600'
                                      }`}>
                                        {event.event_type === 'inbound' ? '↙' :
                                         event.event_type === 'outbound' ? '↗' : '•'}
                                      </span>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] text-slate-600 leading-snug truncate">{event.description}</p>
                                        <p className="text-[8px] text-slate-400 font-mono mt-0.5">{new Date(event.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-slate-400 italic text-center py-8">Select lead for BANT profile.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ── VIEW 3: LEADS LIST ── */}
              {activeView === 'leads' && (
                <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Leads Database</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Active leads recorded from website forms and WhatsApp sessions.</p>
                    </div>
                    <button 
                      onClick={triggerDatabaseBackup}
                      disabled={backupLoading}
                      className="h-9 px-4 flex items-center gap-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-all shadow-3xs"
                    >
                      {backupLoading ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                      Export SQLite Backup
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold">
                          <th className="pb-3.5 pl-3">LEAD NAME</th>
                          <th className="pb-3.5">COMPANY</th>
                          <th className="pb-3.5">CONTACT</th>
                          <th className="pb-3.5 text-center">AI SCORE</th>
                          <th className="pb-3.5 text-right">EST. VALUE (AN.)</th>
                          <th className="pb-3.5 pl-6">PIPELINE STAGE</th>
                          <th className="pb-3.5 text-right pr-3">REGISTERED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {leads.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-xs text-slate-400 italic font-mono bg-slate-50/50 rounded-xl">
                              No active operational records in the database. Listening for incoming webform submissions and WhatsApp message integrations...
                            </td>
                          </tr>
                        ) : (
                          leads.map((lead) => (
                            <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-3.5 pl-3 font-bold text-slate-800">{getDisplayName(lead)}</td>
                              <td className="py-3.5 text-slate-500">{lead.company || '—'}</td>
                              <td className="py-3.5 text-slate-400 font-mono">{formatPhoneForDisplay(lead.phone)}</td>
                              <td className="py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold ${
                                  lead.ai_score >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>{lead.ai_score || '—'}</span>
                              </td>
                              <td className="py-3.5 text-right font-mono font-bold text-emerald-600">
                                ₹{((lead.deal_setup_value || 0) + (lead.deal_mrr || 0) * 12).toLocaleString('en-IN')}
                              </td>
                              <td className="py-3.5 pl-6">
                                <select
                                  value={lead.status}
                                  onChange={(e) => updateLeadStatus(lead.id, e.target.value as Lead['status'])}
                                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700"
                                >
                                  <option value="new">New</option>
                                  <option value="ai_qualifying">AI Qualifying</option>
                                  <option value="qualified">Qualified</option>
                                  <option value="nurturing">Nurturing</option>
                                  <option value="won">Won</option>
                                  <option value="lost">Lost</option>
                                </select>
                              </td>
                              <td className="py-3.5 text-right pr-3 text-slate-400">
                                {new Date(lead.created_at).toLocaleDateString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── VIEW 4: CRM PIPELINES ── */}
              {activeView === 'pipelines' && (
                <AdminPipeline />
              )}

              {/* ── VIEW 5: CAMPAIGNS ── */}
              {activeView === 'campaigns' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">Broadcast Campaign Center</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Automated WhatsApp bulk messaging campaigns and schedulers.</p>
                    </div>
                    <button 
                      onClick={() => alert("Campaign composer module initialized. Broadcasting requires a synced WhatsApp business gateway session.")}
                      className="h-9 px-4 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-3xs"
                    >
                      <Plus size={14} /> Compose Broadcast
                    </button>
                  </div>

                  {/* Active Campaigns table */}
                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs">
                    <div className="space-y-4">
                      {campaigns.map((camp) => (
                        <div key={camp.id} className="border border-slate-200 rounded-2xl p-4 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-3xs transition-all">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                              <h4 className="text-xs font-extrabold text-slate-800">{camp.name}</h4>
                            </div>
                            <p className="text-[10px] text-slate-400">Target Group: <b className="text-slate-600 font-bold">{camp.targetGroup}</b></p>
                            <p className="text-[11px] text-slate-500 italic max-w-lg truncate">"{camp.body}"</p>
                          </div>

                          <div className="flex items-center gap-6 shrink-0 text-center font-mono text-[10px]">
                            <div>
                              <p className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[8px]">Sent</p>
                              <p className="text-xs font-extrabold text-slate-700 mt-0.5">{camp.sentCount}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[8px]">Delivered</p>
                              <p className="text-xs font-extrabold text-slate-700 mt-0.5">{camp.deliveredCount}</p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-sans font-bold uppercase tracking-wider text-[8px]">Read</p>
                              <p className="text-xs font-extrabold text-emerald-600 mt-0.5">
                                {camp.sentCount > 0 ? `${Math.floor((camp.readCount / camp.sentCount) * 100)}%` : '—'}
                              </p>
                            </div>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              camp.status === 'completed' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50 animate-pulse'
                            }`}>{camp.status.toUpperCase()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 6: AUTOMATIONS ── */}
              {activeView === 'automations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Visual Automation Workflows</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Automated workflow chains capturing leads and scheduling followups.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] items-start">
                    {/* Visual node flowchart mockup */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs min-h-[400px] flex flex-col justify-between relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{
                        backgroundImage: `radial-gradient(#10B981 1.5px, transparent 1.5px)`,
                        backgroundSize: "20px 20px"
                      }} />
                      
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5 z-10">
                        <Zap size={14} className="text-emerald-500 animate-pulse" /> Active Node Schema: Web Autopilot
                      </h4>

                      {/* Interactive Flow Nodes */}
                      <div className="space-y-8 flex-1 flex flex-col items-center justify-center z-10 py-10">
                        
                        {/* Node 1: Trigger */}
                        <div className="border border-emerald-200 bg-emerald-50/50 p-3 rounded-2xl w-60 shadow-3xs flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center"><Play size={12} /></span>
                          <div>
                            <p className="text-xs font-bold text-emerald-800">Trigger: Form Submit</p>
                            <p className="text-[8px] text-emerald-600 font-mono">Website Leads Capture</p>
                          </div>
                        </div>

                        {/* Connection arrow */}
                        <div className="h-6 w-0.5 bg-emerald-200 relative flex justify-center items-center">
                          <span className="absolute bottom-0 w-1 h-1 bg-emerald-500 rounded-full" />
                        </div>

                        {/* Node 2: Action */}
                        <div className="border border-slate-200 bg-white p-3 rounded-2xl w-60 shadow-3xs flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center"><Sparkles size={12} /></span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Action: Gemini Assessment</p>
                            <p className="text-[8px] text-slate-400 font-mono">Intent & BANT scoring</p>
                          </div>
                        </div>

                        {/* Connection arrow */}
                        <div className="h-6 w-0.5 bg-slate-200 relative flex justify-center items-center">
                          <span className="absolute bottom-0 w-1 h-1 bg-slate-400 rounded-full" />
                        </div>

                        {/* Node 3: Action */}
                        <div className="border border-slate-200 bg-white p-3 rounded-2xl w-60 shadow-3xs flex items-center gap-3">
                          <span className="h-7 w-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center"><MessageSquare size={12} /></span>
                          <div>
                            <p className="text-xs font-bold text-slate-700">Action: WhatsApp Notify</p>
                            <p className="text-[8px] text-slate-400 font-mono">Send suggested AI reply</p>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Right column: active workflows status */}
                    <div className="space-y-4">
                      {workflows.map((flow) => (
                        <div key={flow.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-3xs space-y-2 flex justify-between items-center">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">{flow.name}</h4>
                            <p className="text-[9px] text-slate-400 mt-1">Trigger: <b className="text-slate-600 font-bold">{flow.trigger}</b></p>
                            <p className="text-[8px] text-slate-400 font-mono mt-0.5">Last Triggered: {new Date(flow.lastTriggeredAt).toLocaleString()}</p>
                          </div>

                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              flow.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                            }`}>{flow.status.toUpperCase()}</span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">{flow.nodesCount} Nodes</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 7: AI AGENTS ── */}
              {activeView === 'agents' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">AI Agent Orchestration Core</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Tune underlying LLM prompts, roles, thresholds, and fallback actions.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {agents.map((agent) => (
                      <div key={agent.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3 items-center">
                              <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-50 to-teal-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-3xs"><Sparkles size={16} /></span>
                              <div>
                                <h4 className="text-xs font-extrabold text-slate-800">{agent.name}</h4>
                                <p className="text-[9px] text-slate-400 mt-0.5">{agent.role}</p>
                              </div>
                            </div>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              agent.status === 'active' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50 animate-pulse'
                            }`}>{agent.status.toUpperCase()}</span>
                          </div>

                          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-[10px] text-slate-500 font-mono leading-normal h-24 overflow-y-auto italic">
                            "{agent.prompt}"
                          </div>
                        </div>

                        <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono">
                          <span>Conversations: <b className="text-slate-700">{agent.totalConversations}</b></span>
                          <span>Accuracy Rate: <b className="text-emerald-600">{agent.accuracyRate}%</b></span>
                          <span>Confidence threshold: <b className="text-slate-700">{agent.confidenceThreshold}%</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── VIEW 8: REPORTS & CHARTS ── */}
              {activeView === 'reports' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Analytical Reports</h3>
                    <p className="text-xs text-slate-400 mt-0.5">High-resolution statistics tracking lead ingestion velocities.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {/* SVG Line Area Chart: 30d leads count */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Leads volume (30-day analytics)</h4>
                      
                      <div className="h-48 flex items-end">
                        <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="lines-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          <line x1="0" y1="50" x2="400" y2="50" stroke="#F1F5F9" />
                          <line x1="0" y1="100" x2="400" y2="100" stroke="#F1F5F9" />
                          
                          <path d="M 0 120 Q 80 130 160 80 T 320 60 T 400 30 L 400 150 L 0 150 Z" fill="url(#lines-grad)" />
                          <path d="M 0 120 Q 80 130 160 80 T 320 60 T 400 30" fill="none" stroke="#3B82F6" strokeWidth="2.5" />
                        </svg>
                      </div>
                      <div className="flex justify-between text-[8px] font-mono font-bold text-slate-400">
                        <span>MAY 01</span>
                        <span>MAY 15</span>
                        <span>MAY 28</span>
                      </div>
                    </div>

                    {/* SVG Bar Chart: conversion speed */}
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Lead Source Capture ratio</h4>
                      
                      <div className="space-y-4 py-2 text-xs">
                        {[
                          { source: 'Website Contact Forms', count: 124, pct: 65, color: 'bg-emerald-500' },
                          { source: 'WhatsApp Direct Incoming', count: 48, pct: 25, color: 'bg-teal-500' },
                          { source: 'Referral & Manual Seeds', count: 18, pct: 10, color: 'bg-slate-400' }
                        ].map((item, i) => (
                          <div key={i} className="space-y-1.5">
                            <div className="flex justify-between text-[11px] font-bold text-slate-700">
                              <span>{item.source}</span>
                              <span className="text-slate-400 font-mono">{item.count} leads ({item.pct}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 9: INTEGRATIONS ── */}
              {activeView === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Operational Integrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Establish third-party webhooks, security access API keys, or custom integrations.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-3xs"><Zap size={18} /></span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">Webhooks Capture Integration</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">API Path: <b className="text-slate-600 font-mono">POST {API_BASE_URL}/leads</b></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">OPERATIONAL</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-3xs"><Lock size={18} /></span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">JWT Security Token Access</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Authorization header: Bearer format</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ACTIVE</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 shadow-3xs"><Database size={18} /></span>
                        <div>
                          <p className="text-xs font-bold text-slate-700">SQLite Backups Storage Path</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Local backups saved under: <b className="text-slate-600 font-mono">./server/data/backups/</b></p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">ROLLING PRUNING ACTIVE</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 10: SETTINGS PANEL ── */}
              {activeView === 'settings' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-800">System Settings</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Configure operational thresholds, backup schedules, and workspace parameters.</p>
                    </div>

                    {/* Sub Tab Switcher */}
                    <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('general')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                          settingsSubTab === 'general'
                            ? 'bg-white text-slate-800 shadow-3xs'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        General Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettingsSubTab('developer')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                          settingsSubTab === 'developer'
                            ? 'bg-white text-rose-700 shadow-3xs'
                            : 'text-slate-500 hover:text-rose-600'
                        }`}
                      >
                        Developer Settings
                      </button>
                    </div>
                  </div>

                  {settingsSubTab === 'general' ? (
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-6">
                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace Brand Name</label>
                          <input
                            type="text"
                            value={workspace}
                            onChange={(e) => setWorkspace(e.target.value)}
                            className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Central API Router IP</label>
                          <input
                            type="text"
                            disabled
                            value={API_BASE_URL}
                            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs text-slate-400 font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Warning Banner */}
                      <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 flex gap-3 text-rose-800 shadow-3xs">
                        <ShieldAlert className="text-rose-600 shrink-0 mt-0.5" size={20} />
                        <div className="space-y-1">
                          <h4 className="text-xs font-black uppercase tracking-wide">Danger Zone: System Developer Controls</h4>
                          <p className="text-[10px] text-rose-700 font-medium leading-relaxed">
                            Restoring backups, forcing process restarts, or modifying Hostinger VPS configurations can interrupt active WhatsApp gateways or lead history tracking. Use only under sysadmin guidance.
                          </p>
                        </div>
                      </div>

                      <div className="grid gap-6 md:grid-cols-2 items-start">
                        {/* Safe Utilities & Backups */}
                        <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-6">
                          <div>
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">Database safe utilities</h4>
                            <p className="text-[9px] text-slate-400 mt-1">Rolling SQLite database backups. Pruned to 7 latest files automatically.</p>
                          </div>

                          <div className="flex flex-col gap-3">
                            <button
                              onClick={triggerDatabaseBackup}
                              disabled={backupLoading}
                              className="h-9 px-4 flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-3xs disabled:opacity-50 border-0 cursor-pointer self-start"
                            >
                              {backupLoading ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                              Manually trigger SQLite rolling backup
                            </button>
                            <p className="text-[9px] text-slate-400 italic">Backups are written to <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[8px] text-slate-600">./server/data/backups/</code> on the Hostinger VPS.</p>
                          </div>

                          {/* Credentials Session Backups (restoring unified here) */}
                          <div className="border-t border-slate-100 pt-5 space-y-3">
                            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                              <span>📦 Credentials Session Backups</span>
                              <button
                                onClick={() => {
                                  setLoadingBackups(true);
                                  fetchBackups().then(data => {
                                    setBackups(data);
                                    setLoadingBackups(false);
                                  }).catch(() => setLoadingBackups(false));
                                }}
                                className="text-[9px] lowercase font-mono text-emerald-600 hover:text-emerald-700 underline cursor-pointer border-0 bg-transparent"
                              >
                                refresh list
                              </button>
                            </h4>
                            {loadingBackups ? (
                              <div className="text-xs text-slate-400 flex items-center gap-1">
                                <Loader2 className="animate-spin" size={12} /> Loading backup list...
                              </div>
                            ) : backups.length === 0 ? (
                              <p className="text-[10px] text-slate-400 italic">No credentials session backups available yet.</p>
                            ) : (
                              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                                {backups.map((bak) => (
                                  <div key={bak.name} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-xs">
                                    <div className="min-w-0 flex-1 pr-3">
                                      <p className="font-bold text-slate-700 truncate">{bak.name}</p>
                                      <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                        {new Date(bak.timestamp).toLocaleString()}
                                      </p>
                                    </div>
                                    <button
                                      disabled={rollingBack !== null}
                                      onClick={async () => {
                                        if (window.confirm(`Are you sure you want to rollback to backup ${bak.name}? This will restart the gateway with those credentials.`)) {
                                          setRollingBack(bak.name);
                                          const success = await rollbackBackup(bak.name);
                                          setRollingBack(null);
                                          if (success) {
                                            alert('Successfully rolled back and restarted gateway!');
                                          } else {
                                            alert('Failed to rollback. See console logs.');
                                          }
                                        }
                                      }}
                                      className="shrink-0 text-[9px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-rose-600 shadow-3xs cursor-pointer disabled:opacity-50"
                                    >
                                      {rollingBack === bak.name ? 'Restoring...' : 'Rollback'}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* VPS & Nginx Telemetry Checker */}
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-3xs text-slate-300 space-y-5">
                          <div>
                            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center gap-1.5">
                              <Activity size={14} className="text-emerald-400" /> Hostinger VPS Environment Health
                            </h4>
                            <p className="text-[9px] text-slate-400 mt-1">Real-time status of service ports and processes.</p>
                          </div>

                          <div className="space-y-4 font-mono text-xs">
                            {/* Nginx Status */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <span className="text-slate-400">Nginx Web Server</span>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                                ACTIVE (Port 443 proxy)
                              </span>
                            </div>

                            {/* PM2 Status */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <span className="text-slate-400">PM2 Process Name</span>
                              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                                trinetra-vps (ONLINE)
                              </span>
                            </div>

                            {/* SQLite engine status */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <span className="text-slate-400">SQLite Engine</span>
                              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded-full">
                                SQLite WAL Mode
                              </span>
                            </div>

                            {/* RAM status */}
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                              <span className="text-slate-400">Process Memory</span>
                              <span className="text-[9px] font-bold text-slate-300">
                                {healthTelemetry?.system.ramUsed || '36.34 MiB'}
                              </span>
                            </div>

                            {/* VPS System Uptime */}
                            <div className="flex items-center justify-between pb-1">
                              <span className="text-slate-400">PM2 Process Uptime</span>
                              <span className="text-[9px] font-bold text-slate-300">
                                {healthTelemetry?.system.uptime || '2h 14m'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── VIEW 11: BILLING METERS ── */}
              {activeView === 'billing' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">SaaS Plan &amp; Billing meters</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Monitor operational credit balances, credit limits, and invoice histories.</p>
                  </div>

                  <div className="grid gap-6 md:grid-cols-[1fr_320px]">
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Subscription</p>
                          <h4 className="text-2xl font-black text-slate-800 tracking-tight font-display mt-1">{billing.planName}</h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-xl shadow-3xs">{billing.price} / month</span>
                      </div>

                      {/* Credit Progress Gauge */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>API Request Credits</span>
                          <span className="font-mono">{billing.creditsUsed} / {billing.creditsMax} queries used</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                            style={{ width: `${(billing.creditsUsed / billing.creditsMax) * 100}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400">Your operational plan cycles reset on: <b className="text-slate-600 font-bold">{new Date(billing.renewalDate).toLocaleDateString()}</b></p>
                      </div>
                    </div>

                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-5 shadow-3xs flex flex-col justify-between">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2 mb-3">Invoice Register</h4>
                      
                      <div className="space-y-3.5 flex-1 text-xs">
                        {billing.invoices.map((inv) => (
                          <div key={inv.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-700">{inv.id}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5">{inv.date}</p>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 rounded-full">{inv.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIEW 12: SALES CONVERSIONS HUB ── */}
              {activeView === 'conversions' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">Sales Conversion Engine</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-sans">Generate professional PDF proposals, automate WhatsApp quote delivery, manage appointment slots, and track conversion funnels.</p>
                  </div>

                  {/* 1. Stat Cards Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Quotes Sent</p>
                      <h4 className="text-xl font-black text-slate-700 font-mono mt-1">{conversionStats?.sent || 0}</h4>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Accepted</p>
                      <h4 className="text-xl font-black text-emerald-600 font-mono mt-1">{conversionStats?.accepted || 0}</h4>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Demos Booked</p>
                      <h4 className="text-xl font-black text-blue-600 font-mono mt-1">{calendarData?.appointments?.length || 0}</h4>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Completed</p>
                      <h4 className="text-xl font-black text-indigo-600 font-mono mt-1">
                        {calendarData?.appointments?.filter((a: any) => a.status === 'completed').length || 0}
                      </h4>
                    </div>
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-3xs">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Conv. Rate</p>
                      <h4 className="text-xl font-black text-slate-700 font-mono mt-1">
                        {conversionStats?.sent > 0 ? Math.round((conversionStats.accepted / (conversionStats.sent + conversionStats.draft)) * 100) : 0}%
                      </h4>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 shadow-3xs">
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Total Value</p>
                      <h4 className="text-lg font-black text-emerald-700 font-mono mt-0.5">₹{(conversionStats?.totalRevenue || 0).toLocaleString('en-IN')}</h4>
                    </div>
                  </div>

                  {/* 2. Main Tables & Slot Management */}
                  <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">
                    {/* Recent Quotations Table */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-3xs space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">Active Quotations Log</h4>
                        <button 
                          onClick={() => {
                            if (!selectedLeadId) {
                              alert("Please select a lead from the Leads Command view first to generate a quote.");
                            } else {
                              setShowQuoteModal(true);
                            }
                          }}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-3xs"
                        >
                          <Plus size={12} /> Generate New Quote
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase">
                              <th className="py-2.5">Quote ID</th>
                              <th>Package</th>
                              <th>Setup Fee</th>
                              <th>Monthly Fee</th>
                              <th>Status</th>
                              <th className="text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-600 font-medium">
                            {quotations.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="py-12 text-center">
                                  <div className="flex flex-col items-center justify-center max-w-md mx-auto p-8 rounded-3xl bg-slate-50/50 border border-dashed border-slate-200">
                                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl mb-3">
                                      <FileText size={32} />
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-1">No Proposals Created</h4>
                                    <p className="text-[11px] text-slate-500 leading-relaxed max-w-[280px] mx-auto mb-4">
                                      Prepare professional PDF pricing estimates and automate proposal delivery via WhatsApp.
                                    </p>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (selectedLeadId) {
                                          setShowQuoteModal(true);
                                        } else {
                                          alert("Please select a lead from the Leads Command view first to generate a quote.");
                                        }
                                      }}
                                      className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-all shadow-3xs cursor-pointer border-0"
                                    >
                                      <Plus size={12} /> Generate First Quote
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ) : (
                              quotations.map((q) => {
                                const lead = leads.find(l => l.id === q.lead_id);
                                return (
                                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 font-bold text-slate-800">
                                      {q.id}
                                      {lead && <p className="text-[9px] text-slate-400 font-medium">{getDisplayName(lead)}</p>}
                                    </td>
                                    <td>
                                      <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{q.package_name}</span>
                                    </td>
                                    <td>₹{q.total_setup.toLocaleString('en-IN')}</td>
                                    <td>₹{q.total_monthly.toLocaleString('en-IN')}/mo</td>
                                    <td>
                                      <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                                        q.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                        q.status === 'viewed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        q.status === 'sent' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                        q.status === 'rejected' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                        'bg-slate-100 text-slate-500 border-slate-200'
                                      }`}>
                                        {q.status}
                                      </span>
                                    </td>
                                    <td className="text-right py-3 space-x-1.5">
                                      {q.status === 'draft' && (
                                        <button 
                                          onClick={() => handleSendQuotation(q.id)} 
                                          className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold transition-colors"
                                        >
                                          Send
                                        </button>
                                      )}
                                      {q.pdf_path && (
                                        <a 
                                          href={`${API_BASE_URL}/quotations/${q.id}/pdf`}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9px] font-bold transition-colors inline-block"
                                        >
                                          PDF
                                        </a>
                                      )}
                                      {q.status !== 'accepted' && q.status !== 'rejected' && (
                                        <>
                                          <button 
                                            onClick={() => handleAcceptQuotation(q.id)} 
                                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold transition-colors"
                                          >
                                            Accept
                                          </button>
                                          <button 
                                            onClick={() => handleRejectQuotation(q.id)} 
                                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[9px] font-bold transition-colors"
                                          >
                                            Reject
                                          </button>
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Available Slots Manager */}
                    <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-3xs space-y-4">
                      <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider border-b border-slate-100 pb-3">Available Slots Manager</h4>
                      
                      {/* Slot Creator Form */}
                      <form onSubmit={handleCreateSlot} className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                        <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">Add Available Slot</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Date</label>
                            <input 
                              type="date" 
                              required 
                              value={newSlotDate}
                              onChange={(e) => setNewSlotDate(e.target.value)}
                              className="w-full h-8 px-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-bold text-slate-400 uppercase">Time</label>
                            <input 
                              type="time" 
                              required 
                              value={newSlotTime}
                              onChange={(e) => setNewSlotTime(e.target.value)}
                              className="w-full h-8 px-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                            />
                          </div>
                        </div>
                        <button 
                          type="submit"
                          className="w-full h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[9px] font-extrabold uppercase tracking-wide transition-colors"
                        >
                          Add Available Slot
                        </button>
                      </form>

                      {/* Slots scroll area */}
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">Active Slots list</p>
                        {availableSlots.length === 0 ? (
                          <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-50/50 border border-dashed border-slate-200 py-8 text-center">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mb-2.5">
                              <Calendar size={20} />
                            </div>
                            <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-1">No Time Slots Set</h5>
                            <p className="text-[9px] text-slate-500 max-w-[200px] leading-relaxed mx-auto">
                              Configure available demo timing slots so leads can book appointments.
                            </p>
                          </div>
                        ) : (
                          availableSlots.map((slot) => (
                            <div key={slot.id} className="flex justify-between items-center p-2.5 border border-slate-100 rounded-xl hover:bg-slate-50/50 text-xs">
                              <div>
                                <p className="font-bold text-slate-700">{new Date(slot.slot_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{slot.slot_time} ({slot.duration_mins} mins)</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                  slot.is_available === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                }`}>
                                  {slot.is_available === 1 ? 'Available' : 'Booked'}
                                </span>
                                <button 
                                  onClick={() => handleDeleteSlot(slot.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Week-View Calendar Scheduler */}
                  {(() => {
                    const formatDateStr = (date: Date): string => {
                      const yyyy = date.getFullYear();
                      const mm = String(date.getMonth() + 1).padStart(2, '0');
                      const dd = String(date.getDate()).padStart(2, '0');
                      return `${yyyy}-${mm}-${dd}`;
                    };

                    const getWeekDates = (offset: number) => {
                      const current = new Date();
                      const day = current.getDay();
                      const diff = current.getDate() - day + (day === 0 ? -6 : 1);
                      const monday = new Date(current.setDate(diff));
                      monday.setDate(monday.getDate() + (offset * 7));
                      
                      const week = [];
                      for (let i = 0; i < 7; i++) {
                        const d = new Date(monday);
                        d.setDate(monday.getDate() + i);
                        week.push(d);
                      }
                      return week;
                    };

                    const weekDates = getWeekDates(weekOffset);
                    const startOfWeekStr = weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    const endOfWeekStr = weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                    return (
                      <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-3xs space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div>
                            <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">Weekly Schedule &amp; Bookings</h4>
                            <p className="text-[9px] text-slate-400 mt-0.5">Track upcoming demo sessions and client consultation calls.</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setWeekOffset(prev => prev - 1)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl shadow-3xs cursor-pointer select-none transition-colors border-0"
                            >
                              ← Prev Week
                            </button>
                            <button
                              type="button"
                              onClick={() => setWeekOffset(0)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl shadow-3xs cursor-pointer select-none transition-colors border-0"
                            >
                              Current Week
                            </button>
                            <button
                              type="button"
                              onClick={() => setWeekOffset(prev => prev + 1)}
                              className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl shadow-3xs cursor-pointer select-none transition-colors border-0"
                            >
                              Next Week →
                            </button>
                            <span className="text-[10px] font-bold text-slate-500 font-mono pl-1">
                              {startOfWeekStr} - {endOfWeekStr}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                          {weekDates.map((dateObj) => {
                            const dateStr = formatDateStr(dateObj);
                            const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                            const isToday = formatDateStr(new Date()) === dateStr;

                            const apptsForDay = calendarData.appointments?.filter((a: any) => {
                              if (!a.preferred_date) return false;
                              const match = a.preferred_date.match(/^\d{4}-\d{2}-\d{2}/);
                              if (match) {
                                return match[0] === dateStr;
                              }
                              try {
                                const aDate = new Date(a.preferred_date);
                                return formatDateStr(aDate) === dateStr;
                              } catch (e) {
                                return false;
                              }
                            }) || [];

                            return (
                              <div 
                                key={dateStr} 
                                className={`border rounded-2xl p-2.5 space-y-2.5 min-h-[180px] transition-all ${
                                  isToday 
                                    ? 'bg-emerald-50/40 border-emerald-200/80 shadow-2xs ring-1 ring-emerald-500/10' 
                                    : 'bg-slate-50/50 border-slate-100'
                                }`}
                              >
                                <span className={`text-[9px] font-black uppercase tracking-wider border-b pb-1.5 block flex justify-between items-center ${
                                  isToday 
                                    ? 'text-emerald-700 border-emerald-100' 
                                    : 'text-slate-400 border-slate-200/60'
                                }`}>
                                  <span>{dayLabel}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                                    isToday 
                                      ? 'bg-emerald-100 text-emerald-800' 
                                      : 'bg-slate-200/60 text-slate-500'
                                  }`}>
                                    {apptsForDay.length}
                                  </span>
                                </span>

                                <div className="space-y-2">
                                  {apptsForDay.map((a: any) => (
                                    <div key={a.id} className="bg-white border border-slate-200/60 p-2 rounded-xl text-[10px] space-y-1.5 shadow-3xs">
                                      <div className="flex justify-between items-start">
                                        <p className="font-bold text-slate-700 truncate max-w-[80%]">{a.lead_name}</p>
                                        <span className={`text-[7px] font-extrabold px-1 rounded uppercase ${
                                          a.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                                          a.status === 'confirmed' ? 'bg-blue-50 text-blue-600' :
                                          a.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                                          'bg-amber-50 text-amber-600'
                                        }`}>
                                          {a.status}
                                        </span>
                                      </div>
                                      <p className="text-[8px] text-slate-400 font-mono">{a.preferred_time} | {a.call_type}</p>
                                      {a.meeting_link && (
                                        <a 
                                          href={a.meeting_link} 
                                          target="_blank" 
                                          rel="noreferrer"
                                          className="text-[8px] text-blue-500 font-medium block truncate hover:underline"
                                        >
                                          🔗 Join Meeting
                                        </a>
                                      )}
                                      <div className="flex gap-1.5 pt-1.5 border-t border-slate-100">
                                        {a.status === 'pending' && (
                                          <button 
                                            onClick={() => { setConfirmingApptId(a.id); setShowConfirmModal(true); }}
                                            className="w-full py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[8px] font-bold border-0 cursor-pointer"
                                          >
                                            Confirm
                                          </button>
                                        )}
                                        {a.status === 'confirmed' && (
                                          <button 
                                            onClick={() => { setCompletingApptId(a.id); setShowCompleteModal(true); }}
                                            className="w-full py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-[8px] font-bold border-0 cursor-pointer"
                                          >
                                            Complete
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                  {apptsForDay.length === 0 && (
                                    <p className="text-[8px] text-slate-400 italic text-center py-4">No bookings</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* ── VIEW 12: WHATSAPP QR ── */}
              {activeView === 'qr' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800">WhatsApp Gateway Integrations</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Link WhatsApp credentials to establish automated lead follow-up sessions.</p>
                  </div>

                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs max-w-xl mx-auto text-center space-y-6">
                    <div className="flex justify-center items-center gap-3">
                      <span className={`h-3 w-3 rounded-full ${
                        waStatus?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`} />
                      <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider font-mono">
                        Status: {waStatus?.status.toUpperCase() || 'OFFLINE'}
                      </h4>
                      <button
                        onClick={handleRestartGateway}
                        disabled={restartingGateway}
                        className="ml-4 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-600 rounded-lg transition-colors cursor-pointer border border-slate-200"
                      >
                        {restartingGateway ? 'Restarting...' : 'Restart Gateway'}
                      </button>
                    </div>

                    {waStatus?.status === 'connected' ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-xs text-emerald-700 max-w-md mx-auto flex flex-col items-center gap-2">
                        <CheckCircle size={32} className="text-emerald-600 animate-bounce-slow" />
                        <p className="font-extrabold">Active WhatsApp Connection Established!</p>
                        <p className="text-[10px] text-emerald-600 font-medium">The Baileys node processes socket handshakes with WhatsApp servers seamlessly.</p>
                      </div>
                    ) : waStatus?.qrImage ? (
                      <div className="space-y-4">
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 p-3 rounded-xl max-w-md mx-auto">
                          ⚠️ Open WhatsApp {"→"} Tap Linked Devices {"→"} Tap Link a Device {"→"} Scan the QR Code below:
                        </p>
                        <div className="bg-white border border-slate-200 rounded-2xl p-4 max-w-[220px] mx-auto shadow-sm">
                          <img src={waStatus.qrImage} alt="WhatsApp QR Code" className="w-full h-auto rounded-lg" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                        <Loader2 size={32} className="animate-spin text-emerald-500" />
                        <p className="text-xs font-semibold">Generating fresh Baileys credentials socket QR...</p>
                      </div>
                    )}
                  </div>

                  {/* Health Score Gauge */}
                  {waStatus && (
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs max-w-xl mx-auto flex items-center justify-between gap-6">
                      <div className="flex-1 text-left space-y-1">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Gateway Quality Score</h4>
                        <p className="text-[10px] text-slate-400">Based on connection state, reconnect rates, delivery tracking, and queue health.</p>
                      </div>
                      <div className="relative flex items-center justify-center h-16 w-16 shrink-0">
                        <svg className="w-16 h-16 transform -rotate-90">
                          <circle cx="32" cy="32" r="28" className="stroke-slate-100" strokeWidth="6" fill="transparent" />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            className={`transition-all duration-500 ${
                              (waStatus.healthScore ?? 0) >= 80 ? 'stroke-emerald-500' :
                              (waStatus.healthScore ?? 0) >= 50 ? 'stroke-amber-500' : 'stroke-rose-500'
                            }`}
                            strokeWidth="6"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 28}
                            strokeDashoffset={2 * Math.PI * 28 * (1 - (waStatus.healthScore ?? 0) / 100)}
                          />
                        </svg>
                        <span className="absolute text-xs font-black text-slate-800 font-mono">
                          {waStatus.healthScore ?? 0}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Live Diagnostics & Telemetry */}
                  {waStatus && (
                    <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs max-w-xl mx-auto space-y-4 text-left">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                        <Activity size={14} className="text-emerald-600 animate-pulse" />
                        Live Connection Diagnostics & Telemetry
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Last Inbound Message</span>
                          <span className="text-slate-700 font-bold">{waStatus.lastInboundMessageTimestamp ? new Date(waStatus.lastInboundMessageTimestamp).toLocaleString() : 'Never'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Last Outbound Message</span>
                          <span className="text-slate-700 font-bold">{waStatus.lastOutboundMessageTimestamp ? new Date(waStatus.lastOutboundMessageTimestamp).toLocaleString() : 'Never'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Last Delivery Success</span>
                          <span className="text-slate-700 font-bold">{waStatus.lastSuccessfulDeliveryTimestamp ? new Date(waStatus.lastSuccessfulDeliveryTimestamp).toLocaleString() : 'Never'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Active AI Provider</span>
                          <span className="text-indigo-600 font-bold uppercase">{waStatus.activeAiProvider || 'None'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reconnect Count</span>
                          <span className="text-slate-700 font-bold">{waStatus.reconnectCount || 0}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Queue Status (Pending/Failed)</span>
                          <span className="text-slate-700 font-bold">
                            <span className="text-amber-600 font-bold">{waStatus.pendingQueueCount || 0}</span>
                            {' / '}
                            <span className="text-rose-600 font-bold">{waStatus.failedQueueCount || 0}</span>
                          </span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Gateway Uptime</span>
                          <span className="text-slate-700 font-bold">
                            {waStatus.status === 'connected' && waStatus.uptime !== undefined && waStatus.uptime !== null ? (
                              `${Math.floor(waStatus.uptime / 3600)}h ${Math.floor((waStatus.uptime % 3600) / 60)}m ${waStatus.uptime % 60}s`
                            ) : (
                              'Offline'
                            )}
                          </span>
                        </div>
                        <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <span className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">Session Active Age</span>
                          <span className="text-slate-700 font-bold">
                            {waStatus.sessionAge ? new Date(waStatus.sessionAge).toLocaleDateString() : 'No Active Session'}
                          </span>
                        </div>
                      </div>
                      {waStatus.disconnectReason && (
                        <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                          🚨 <span className="font-bold">Last Disconnect Reason:</span> {waStatus.disconnectReason}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Session Backups Management */}
                  <div className="bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-3xl p-6 shadow-3xs max-w-xl mx-auto space-y-4 text-left">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center justify-between">
                      <span>📦 Credentials Session Backups</span>
                      <button
                        onClick={() => {
                          setLoadingBackups(true);
                          fetchBackups().then(data => {
                            setBackups(data);
                            setLoadingBackups(false);
                          }).catch(() => setLoadingBackups(false));
                        }}
                        className="text-[9px] lowercase font-mono text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                      >
                        refresh list
                      </button>
                    </h4>
                    {loadingBackups ? (
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Loader2 className="animate-spin" size={12} /> Loading backup list...
                      </div>
                    ) : backups.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">No credentials session backups available yet.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {backups.map((bak) => (
                          <div key={bak.name} className="flex items-center justify-between border border-slate-100 rounded-xl p-3 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-xs">
                            <div className="min-w-0 flex-1 pr-3">
                              <p className="font-bold text-slate-700 truncate">{bak.name}</p>
                              <p className="text-[9px] text-slate-400 mt-0.5 font-mono">
                                Created: {new Date(bak.timestamp).toLocaleString()} | Status: <span className="font-semibold text-slate-500">{bak.connectionStatus}</span>
                              </p>
                              <p className="text-[9px] text-slate-500 italic mt-0.5 truncate font-mono">Reason: {bak.reason}</p>
                            </div>
                            <button
                              disabled={rollingBack !== null}
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to rollback to backup ${bak.name}? This will restart the gateway with those credentials.`)) {
                                  setRollingBack(bak.name);
                                  const success = await rollbackBackup(bak.name);
                                  setRollingBack(null);
                                  if (success) {
                                    alert('Successfully rolled back and restarted gateway!');
                                  } else {
                                    alert('Failed to rollback. See console logs.');
                                  }
                                }
                              }}
                              className="shrink-0 text-[10px] font-bold px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-emerald-600 shadow-3xs hover:shadow-2xs cursor-pointer disabled:opacity-50"
                            >
                              {rollingBack === bak.name ? 'Restoring...' : 'Restore'}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── CENTRALIZED COMMAND PALETTE (CTRL + K) ── */}
      <AnimatePresence>
        {commandPaletteOpen && (
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              ref={commandPaletteRef}
              className="w-full max-w-lg bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="p-4 border-b border-slate-200 flex items-center gap-3">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search leads database, tools, backups..."
                  className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none"
                />
                <button onClick={() => setCommandPaletteOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              {/* Dynamic Search Results list */}
              <div className="p-2 max-h-80 overflow-y-auto space-y-1">
                {filteredLeads.length > 0 ? (
                  <>
                    <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1.5">Database Leads ({filteredLeads.length})</span>
                    {filteredLeads.map((lead) => (
                      <button
                        key={lead.id}
                        onClick={() => {
                          setSelectedLeadId(lead.id);
                          setActiveView('conversations');
                          setCommandPaletteOpen(false);
                        }}
                        className="flex w-full items-center justify-between h-9 px-3 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left transition-all"
                      >
                        <span>👤 {lead.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">{formatPhoneForDisplay(lead.phone)}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic text-center py-4">No matching database entities found.</p>
                )}

                {/* Navigation shortcuts */}
                <div className="border-t border-slate-100 mt-2 pt-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400 block px-3 py-1.5">Action Shortcuts</span>
                  {[
                    { label: "Switch to CRM Pipeline Dashboard", action: () => { setActiveView('pipelines'); setCommandPaletteOpen(false); } },
                    { label: "Check WhatsApp Session QR Pairing", action: () => { setActiveView('qr'); setCommandPaletteOpen(false); } },
                    { label: "Force SQLite Database Backup Sequence", action: () => { triggerDatabaseBackup(); setCommandPaletteOpen(false); } },
                    { label: "Open AI Assistant Prompt Config", action: () => { setActiveView('agents'); setCommandPaletteOpen(false); } }
                  ].map((item, i) => (
                    <button
                      key={i}
                      onClick={item.action}
                      className="flex w-full items-center h-8 px-3 rounded-lg text-xs font-bold text-emerald-700 hover:bg-emerald-50 text-left transition-all"
                    >
                      ⚡ {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── DYNAMIC FLOATING AI ASSISTANT (CO-PILOT) ── */}
      <AnimatePresence>
        {aiAssistantOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 bg-slate-900 text-white rounded-3xl shadow-2xl overflow-hidden z-50 border border-slate-800"
          >
            {/* Header */}
            <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-inner"><Sparkles size={14} className="animate-spin-slow" /></span>
                <div>
                  <p className="text-xs font-bold tracking-wide">Trinetra AI Copilot</p>
                  <p className="text-[8px] text-slate-500 font-mono">Gemini-Pro Engine v1.2</p>
                </div>
              </div>
              <button onClick={() => setAiAssistantOpen(false)} className="text-slate-500 hover:text-slate-300">
                <X size={16} />
              </button>
            </div>

            {/* Chat Timeline */}
            <div className="h-80 overflow-y-auto p-4 space-y-3.5 text-[11px] bg-slate-900/90 font-sans">
              {aiChatHistory.map((chat, i) => (
                <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed ${
                    chat.role === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700/60 rounded-bl-none'
                  }`}>
                    <p className="whitespace-pre-line">{chat.text}</p>
                  </div>
                </div>
              ))}
              {aiLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 text-slate-400 rounded-2xl px-3.5 py-2.5 rounded-bl-none flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin text-emerald-500" />
                    Thinking...
                  </div>
                </div>
              )}
            </div>

            {/* Prompt Composer input */}
            <form onSubmit={submitAiAssistantQuery} className="p-3 border-t border-slate-800 bg-slate-950/80 flex gap-2">
              <input
                type="text"
                required
                value={aiMsgText}
                onChange={(e) => setAiMsgText(e.target.value)}
                placeholder="Ask AI or say: 'Create database backup'..."
                className="flex-1 h-9 rounded-xl border border-slate-800 bg-slate-900 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={aiLoading || !aiMsgText.trim()}
                className="h-9 w-9 flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all shrink-0"
              >
                <Send size={12} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phase 4A Modals ── */}
      <AnimatePresence>
        {/* 1. QuoteModal */}
        {showQuoteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Generate PDF Proposal</h3>
                <button onClick={() => setShowQuoteModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
                {/* Lead Selector Dropdown */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Target Lead Client</label>
                  <select 
                    required
                    value={selectedLeadId || ""}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 bg-slate-50 font-bold focus:outline-none"
                  >
                    <option value="">Select target lead...</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {getDisplayName(lead)} ({formatPhoneForDisplay(lead.phone)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-500 uppercase text-[9px] tracking-wider">Select Package Tier</label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Starter */}
                    <button
                      type="button"
                      onClick={() => setQuoteTier('starter_presence')}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                        quoteTier === 'starter_presence'
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Starter</div>
                        <div className="text-[8px] text-slate-450 font-semibold mt-0.5">Essential Presence</div>
                      </div>
                      <div className="mt-2.5">
                        <div className="font-bold text-[11px] text-emerald-700">₹14,999 <span className="text-[8px] text-slate-450 font-normal font-sans">setup</span></div>
                        <div className="text-[9px] text-slate-500 font-bold mt-0.5">₹2,999/mo</div>
                      </div>
                    </button>

                    {/* Growth */}
                    <button
                      type="button"
                      onClick={() => setQuoteTier('growth_engine')}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                        quoteTier === 'growth_engine'
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Growth</div>
                        <div className="text-[8px] text-slate-450 font-semibold mt-0.5">Business Accelerator</div>
                      </div>
                      <div className="mt-2.5">
                        <div className="font-bold text-[11px] text-emerald-700">₹29,999 <span className="text-[8px] text-slate-450 font-normal font-sans">setup</span></div>
                        <div className="text-[9px] text-slate-500 font-bold mt-0.5">₹5,999/mo</div>
                      </div>
                    </button>

                    {/* Sales */}
                    <button
                      type="button"
                      onClick={() => setQuoteTier('sales_system')}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                        quoteTier === 'sales_system'
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Sales</div>
                        <div className="text-[8px] text-slate-450 font-semibold mt-0.5">CRM & Automation</div>
                      </div>
                      <div className="mt-2.5">
                        <div className="font-bold text-[11px] text-emerald-700">₹59,999 <span className="text-[8px] text-slate-450 font-normal font-sans">setup</span></div>
                        <div className="text-[9px] text-slate-500 font-bold mt-0.5">₹9,999/mo</div>
                      </div>
                    </button>

                    {/* Business OS */}
                    <button
                      type="button"
                      onClick={() => setQuoteTier('business_os')}
                      className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between cursor-pointer focus:outline-none ${
                        quoteTier === 'business_os'
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75'
                      }`}
                    >
                      <div>
                        <div className="font-extrabold text-[10px] text-slate-800 uppercase tracking-wider">Business OS</div>
                        <div className="text-[8px] text-slate-450 font-semibold mt-0.5">Enterprise Scale</div>
                      </div>
                      <div className="mt-2.5">
                        <div className="font-bold text-[11px] text-emerald-700">₹1,49,999 <span className="text-[8px] text-slate-450 font-normal font-sans">setup</span></div>
                        <div className="text-[9px] text-slate-500 font-bold mt-0.5">₹19,999/mo</div>
                      </div>
                    </button>
                  </div>

                  {/* Custom button */}
                  <button
                    type="button"
                    onClick={() => setQuoteTier('custom')}
                    className={`w-full p-2.5 rounded-2xl border text-center transition-all cursor-pointer font-bold text-[10px] focus:outline-none ${
                      quoteTier === 'custom'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/75 text-slate-600'
                    }`}
                  >
                    ⚙️ Build Custom Proposal (Manual Line Items)
                  </button>
                </div>

                {quoteTier === 'custom' && (
                  <div className="space-y-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-[9px] text-slate-500 uppercase">Custom Line Items</span>
                      <button 
                        type="button" 
                        onClick={addCustomItem}
                        className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 rounded font-bold text-[8px]"
                      >
                        + Add Row
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {customItems.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text" 
                            placeholder="Description (e.g. CRM Setup)"
                            required
                            value={item.description}
                            onChange={(e) => handleCustomItemChange(idx, 'description', e.target.value)}
                            className="flex-1 h-8 px-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                          />
                          <input 
                            type="number" 
                            placeholder="Price"
                            required
                            value={item.price}
                            onChange={(e) => handleCustomItemChange(idx, 'price', e.target.value)}
                            className="w-24 h-8 px-2 border border-slate-200 bg-white rounded-lg focus:outline-none font-mono text-right"
                          />
                          <button 
                            type="button" 
                            onClick={() => removeCustomItem(idx)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px]">Setup Discount %</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="100"
                      value={quoteDiscount}
                      onChange={(e) => setQuoteDiscount(Number(e.target.value) || 0)}
                      className="w-full h-9 border border-slate-200 rounded-xl px-2.5 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px]">Proposal Validity (Days)</label>
                    <input 
                      type="number" 
                      disabled
                      value={7}
                      className="w-full h-9 border border-slate-200 bg-slate-100 text-slate-400 rounded-xl px-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Additional Notes / Terms</label>
                  <textarea 
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="Enter customized notes or project timelines..."
                    className="w-full h-16 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowQuoteModal(false)}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-3xs"
                  >
                    Generate PDF
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 2. AppointmentModal */}
        {showAppointmentModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Book Demo Appointment</h3>
                <button onClick={() => setShowAppointmentModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs">
                {/* Lead Selector Dropdown */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Target Lead Client</label>
                  <select 
                    required
                    value={selectedLeadId || ""}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 bg-slate-50 font-bold focus:outline-none"
                  >
                    <option value="">Select target lead...</option>
                    {leads.map(lead => (
                      <option key={lead.id} value={lead.id}>
                        {getDisplayName(lead)} ({formatPhoneForDisplay(lead.phone)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Available slots picker */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Select Pre-configured Slot</label>
                  <select 
                    value={selectedSlotId}
                    onChange={(e) => setSelectedSlotId(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 bg-slate-50 font-bold focus:outline-none"
                  >
                    <option value="">-- Or enter custom date and time below --</option>
                    {availableSlots.filter(s => s.is_available === 1).map(slot => (
                      <option key={slot.id} value={slot.id}>
                        {new Date(slot.slot_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at {slot.slot_time}
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedSlotId && (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[8px]">Custom Date</label>
                      <input 
                        type="date"
                        value={appointmentDate}
                        onChange={(e) => setAppointmentDate(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[8px]">Custom Time</label>
                      <input 
                        type="time"
                        value={appointmentTime}
                        onChange={(e) => setAppointmentTime(e.target.value)}
                        className="w-full h-8 px-2 border border-slate-200 bg-white rounded-lg focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px]">Meeting Type</label>
                    <select 
                      value={appointmentCallType}
                      onChange={(e) => setAppointmentCallType(e.target.value as any)}
                      className="w-full h-9 border border-slate-200 rounded-xl px-2.5 bg-slate-50 focus:outline-none"
                    >
                      <option value="call">Phone Call</option>
                      <option value="video">Google Meet / Video</option>
                      <option value="in_person">In-Person Meeting</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 uppercase text-[9px]">Duration</label>
                    <input 
                      type="text" 
                      disabled
                      value="30 minutes"
                      className="w-full h-9 border border-slate-200 bg-slate-100 text-slate-400 rounded-xl px-2.5 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Notes / Requirements</label>
                  <textarea 
                    value={appointmentNotes}
                    onChange={(e) => setAppointmentNotes(e.target.value)}
                    placeholder="Enter additional call notes or topic focus..."
                    className="w-full h-16 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowAppointmentModal(false)}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-3xs"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 3. ConfirmModal */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Confirm Appointment</h3>
                <button onClick={() => setShowConfirmModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleConfirmAppointment} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Google Meet / Zoom URL</label>
                  <input 
                    type="url"
                    required
                    placeholder="https://meet.google.com/xyz-abc-123"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmModal(false)}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-3xs"
                  >
                    Confirm &amp; Alert Client
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* 4. CompleteModal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Complete Demo Session</h3>
                <button onClick={() => setShowCompleteModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCompleteAppointment} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase text-[9px]">Deal Value / Setup Revenue (INR)</label>
                  <input 
                    type="number"
                    value={apptDealValue}
                    onChange={(e) => setApptDealValue(Number(e.target.value) || 0)}
                    className="w-full h-9 border border-slate-200 rounded-xl px-2.5 focus:outline-none font-mono"
                  />
                  <p className="text-[8px] text-slate-400 mt-1">If the lead converts on this call, enter their contract deal value to track conversion analytics.</p>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <button 
                    type="button" 
                    onClick={() => setShowCompleteModal(false)}
                    className="h-9 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="h-9 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-3xs"
                  >
                    Mark Complete
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic launcher button */}
      {!aiAssistantOpen && (
        <button
          onClick={() => setAiAssistantOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xl hover:scale-105 hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] transition-all z-40 animate-pulse-slow border border-emerald-500/20"
        >
          <Sparkles size={22} />
        </button>
      )}

    </div>
  );
}
