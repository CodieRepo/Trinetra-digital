import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Volume2, VolumeX, Settings2, RotateCcw, X, Mic, Send } from 'lucide-react';
import { useTrinetraBot } from '../../hooks/useTrinetraBot';
import { LeadCaptureCard } from './LeadCaptureCard';
import { AppointmentBookingCard } from './AppointmentBookingCard';
import { AdminPanelModal } from '../admin/AdminPanelModal';

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
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
    startListening,
    sendMessage,
    handleLeadSubmit,
    handleAppointmentSubmit,
    resetChat
  } = useTrinetraBot();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen, activeFormCard]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage(input.trim());
      setInput('');
    }
  };

  const handleChipClick = (question: string) => {
    sendMessage(question);
  };

  return (
    <>
      {/* Floating Trigger Button — positioned cleanly below WhatsAppFloat with zero overlap */}
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[9975]">
        {!isOpen && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            aria-label="Open Trinetra AI Advisor"
            className="group relative flex items-center gap-3 px-4 py-3 rounded-full bg-[#0F0F12]/95 border border-[#C87A5B]/45 text-stone-100 shadow-[0_12px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl hover:border-[#C87A5B] hover:scale-[1.03] transition-all duration-300 cursor-pointer"
          >
            <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#C87A5B] to-[#9E5338] flex items-center justify-center text-white shadow-inner">
              <Sparkles className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0F0F12] rounded-full" />
            </div>
            <div className="text-left pr-1">
              <p className="font-semibold text-xs leading-none text-stone-100 tracking-tight">Trinetra AI Advisor</p>
              <p className="text-[10px] text-[#E09B7E] leading-tight mt-1 font-medium">Instant Growth & POS Guide</p>
            </div>
          </button>
        )}
      </div>

      {/* Main Obsidian + Terracotta Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[9995] w-[92vw] sm:w-[410px] h-[580px] max-h-[82vh] bg-[#0B0B0D]/95 border border-white/10 rounded-3xl shadow-[0_24px_60px_rgba(0,0,0,0.65)] flex flex-col backdrop-blur-2xl text-stone-100 overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="px-5 py-3.5 bg-[#121216] border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-[#C87A5B] to-[#8C462D] flex items-center justify-center font-bold text-sm text-white shadow-md">
                T
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#121216] rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold text-xs text-stone-100 flex items-center gap-1.5">
                  <span>Trinetra AI Advisor</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[#C87A5B]/20 text-[#E6A387] font-semibold border border-[#C87A5B]/30">
                    Edge AI
                  </span>
                </h3>
                <p className="text-[10px] text-stone-400 mt-0.5">Restaurant OS • CRM • Web & SEO</p>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                title={ttsEnabled ? 'Mute Speech Output' : 'Enable Voice Readout'}
                className={`p-1.5 rounded-lg border transition cursor-pointer ${
                  ttsEnabled
                    ? 'bg-[#C87A5B]/20 border-[#C87A5B]/50 text-[#E6A387]'
                    : 'bg-white/5 border-white/10 text-stone-400 hover:text-stone-200'
                }`}
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsAdminOpen(true)}
                title="Open Advisor Settings"
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/25 text-stone-400 hover:text-stone-200 transition cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={resetChat}
                title="Reset Chat History"
                className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/25 text-stone-400 hover:text-stone-200 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close Trinetra AI Advisor"
                className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-stone-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-[#C87A5B] text-white rounded-br-none font-medium'
                      : 'bg-[#151519] border border-white/10 text-stone-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {msg.highlights && msg.highlights.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                      {msg.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-[#C87A5B]/15 text-[#E6A387] border border-[#C87A5B]/25 text-[10px]"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {msg.sender === 'bot' && (
                    <div className="mt-2 flex items-center justify-end text-[9px] text-stone-500">
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {msg.actionType === 'lead_capture' && !activeFormCard && (
                  <button
                    type="button"
                    onClick={() => setActiveFormCard('lead_capture')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 text-xs font-semibold hover:bg-emerald-500/25 transition cursor-pointer"
                  >
                    Fill Quick Quote Form
                  </button>
                )}

                {msg.actionType === 'appointment_form' && !activeFormCard && (
                  <button
                    type="button"
                    onClick={() => setActiveFormCard('appointment_form')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-[#C87A5B]/20 text-[#E6A387] border border-[#C87A5B]/40 text-xs font-semibold hover:bg-[#C87A5B]/30 transition cursor-pointer"
                  >
                    Schedule 1-on-1 Consultation
                  </button>
                )}

                {msg.sender === 'bot' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                    {msg.suggestedQuestions.map((sq, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleChipClick(sq)}
                        className="px-2.5 py-1 rounded-full bg-[#151519] hover:bg-[#C87A5B]/20 border border-white/10 hover:border-[#C87A5B]/45 text-stone-300 hover:text-stone-100 text-[11px] transition duration-200 cursor-pointer"
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {activeFormCard === 'lead_capture' && (
              <LeadCaptureCard
                initialMemory={userMemory}
                onSubmit={handleLeadSubmit}
                onCancel={() => setActiveFormCard(null)}
              />
            )}

            {activeFormCard === 'appointment_form' && (
              <AppointmentBookingCard
                initialMemory={userMemory}
                onSubmit={handleAppointmentSubmit}
                onCancel={() => setActiveFormCard(null)}
              />
            )}

            {isTyping && (
              <div className="flex items-center space-x-2 text-stone-400 p-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-[#C87A5B] animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-[#C87A5B] animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-[#C87A5B] animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] text-stone-500 ml-1">Thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Bar */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-[#121216] border-t border-white/10 flex items-center gap-2">
            {isVoiceSupported && (
              <button
                type="button"
                onClick={startListening}
                className={`p-2.5 rounded-xl border transition cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                    : 'bg-white/5 border-white/10 text-stone-400 hover:text-stone-100'
                }`}
                title="Voice Input"
              >
                <Mic className="w-3.5 h-3.5" />
              </button>
            )}

            <input
              type="text"
              placeholder="Ask about Restaurant OS, CRM, pricing..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-[#09090B] border border-white/10 rounded-xl text-xs text-stone-100 focus:outline-none focus:border-[#C87A5B] transition placeholder:text-stone-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-3.5 py-2.5 rounded-xl bg-[#C87A5B] hover:bg-[#D48768] disabled:opacity-40 text-white font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      <AdminPanelModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </>
  );
};
