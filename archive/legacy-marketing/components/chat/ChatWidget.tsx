import React, { useState, useRef, useEffect } from 'react';
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
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center space-x-3 px-5 py-3.5 rounded-full bg-slate-900/90 border border-indigo-500/40 text-slate-100 shadow-2xl backdrop-blur-xl hover:scale-105 hover:border-indigo-400 transition-all duration-300"
          >
            {/* Pulsing ring aura */}
            <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-30 blur-md group-hover:opacity-60 transition duration-500" />

            <div className="relative flex items-center space-x-3">
              <div className="relative w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-black text-xs text-slate-950 shadow-md">
                ⚡
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div className="text-left">
                <p className="font-bold text-xs leading-none text-slate-100">Trinetra AI Advisor</p>
                <p className="text-[10px] text-emerald-400 leading-tight mt-0.5">● 100% Offline AI Ready</p>
              </div>
            </div>
          </button>
        )}
      </div>

      {/* Main Glassmorphism Chat Drawer */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] sm:w-[420px] h-[600px] max-h-[85vh] bg-slate-950/90 border border-slate-800 rounded-3xl shadow-2xl flex flex-col backdrop-blur-2xl text-slate-100 overflow-hidden animate-slideUp">
          {/* Header */}
          <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-black text-sm text-white shadow-md">
                T
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-slate-100 flex items-center space-x-1.5">
                  <span>Trinetra AI Growth Assistant</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Offline Engine
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Classical NLP • Local KB Search</p>
              </div>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center space-x-1.5">
              {/* Voice TTS Toggle */}
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                title={ttsEnabled ? 'Mute Speech Output' : 'Enable Voice Readout'}
                className={`p-1.5 rounded-lg border text-xs transition ${
                  ttsEnabled
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {ttsEnabled ? '🔊' : '🔇'}
              </button>

              {/* Admin Portal Launcher */}
              <button
                onClick={() => setIsAdminOpen(true)}
                title="Open Admin & Local CRM Portal"
                className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-slate-500 text-slate-300 text-xs transition"
              >
                ⚙️
              </button>

              {/* Clear Memory */}
              <button
                onClick={resetChat}
                title="Reset Chat History"
                className="p-1.5 rounded-lg bg-slate-800/60 border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200 text-xs transition"
              >
                🔄
              </button>

              {/* Close Drawer */}
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center text-xs transition"
              >
                ✕
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
                      ? 'bg-indigo-600 text-white rounded-br-none font-medium'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>

                  {/* Highlights Callout if available */}
                  {msg.highlights && msg.highlights.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex flex-wrap gap-1.5">
                      {msg.highlights.map((h, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px]"
                        >
                          ✦ {h}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Confidence Badge for bot answers */}
                  {msg.sender === 'bot' && msg.confidence !== undefined && (
                    <div className="mt-2 flex items-center justify-between text-[9px] text-slate-500">
                      <span>Search Confidence: {msg.confidence}%</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>

                {/* Inline Action Card Triggers */}
                {msg.actionType === 'lead_capture' && !activeFormCard && (
                  <button
                    onClick={() => setActiveFormCard('lead_capture')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-semibold hover:bg-emerald-500/30 transition shadow-lg"
                  >
                    📋 Fill Quick Quote Form
                  </button>
                )}

                {msg.actionType === 'appointment_form' && !activeFormCard && (
                  <button
                    onClick={() => setActiveFormCard('appointment_form')}
                    className="mt-2 px-3 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-semibold hover:bg-indigo-500/30 transition shadow-lg"
                  >
                    📅 Schedule 1-on-1 Strategy Call
                  </button>
                )}

                {/* Suggested Questions Chips attached to bot responses */}
                {msg.sender === 'bot' && msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.suggestedQuestions.map((sq, i) => (
                      <button
                        key={i}
                        onClick={() => handleChipClick(sq)}
                        className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-indigo-600/30 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-indigo-200 text-[11px] transition duration-200"
                      >
                        💡 {sq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Active Form Cards Embedded */}
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

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex items-center space-x-2 text-slate-400 p-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[10px] text-slate-500 ml-1">Analyzing knowledge base...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Bar */}
          <form onSubmit={handleFormSubmit} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center space-x-2">
            {isVoiceSupported && (
              <button
                type="button"
                onClick={startListening}
                className={`p-2 rounded-xl border text-xs transition ${
                  isListening
                    ? 'bg-rose-500 border-rose-400 text-white animate-pulse'
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100'
                }`}
                title="Voice Input (Speech to Text)"
              >
                🎙️
              </button>
            )}

            <input
              type="text"
              placeholder="Ask about websites, SEO, pricing, CRM..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition placeholder:text-slate-500"
            />

            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-slate-950 font-bold text-xs transition shadow-lg shadow-indigo-500/20"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Admin & Local CRM Modal */}
      <AdminPanelModal isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </>
  );
};
