"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

interface RestroAiAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  accessToken: string | null;
  restaurantId?: string | null;
  tenantId?: string | null;
  restaurantName: string;
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const QUICK_PROMPTS = [
  "What is today's revenue and order count?",
  "Which inventory items are low in stock?",
  "How many tables are occupied right now?",
];

export function RestroAiAssistantDrawer({
  open,
  onClose,
  accessToken,
  restaurantId,
  tenantId,
  restaurantName,
}: RestroAiAssistantDrawerProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: `Hi! Ask me anything about ${restaurantName}'s live orders, revenue, tables, or low-stock inventory (read-only).`,
    },
  ]);

  if (!open) return null;

  const askQuestion = async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: trimmed }]);
    setQuestion("");
    setLoading(true);
    try {
      const res = await fetch("/api/client/restaurant/ai-assistant", {
        method: "POST",
        credentials: "include",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          question: trimmed,
          ...(restaurantId ? { restaurant_id: restaurantId } : {}),
          ...(tenantId ? { tenant_id: tenantId } : {}),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: data?.reply || data?.error || "Unable to fetch restaurant insights right now.",
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "assistant", text: "Network error reaching AI Ops Assistant." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-[#E8D8D2] shadow-2xl flex flex-col">
      <div className="px-4 py-3.5 border-b border-[#E8D8D2] bg-[#2A1622] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <div>
            <h3 className="text-sm font-bold leading-none">Restaurant AI Ops</h3>
            <p className="text-[11px] text-slate-300 mt-0.5">Read-only live insights • Cloudflare AI</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-[#3A1E2F] cursor-pointer"
          aria-label="Close AI assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAF2EE]">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
              m.role === "user"
                ? "ml-auto bg-[#2A1622] text-white"
                : "mr-auto bg-white text-[#2A1622] border border-[#E8D8D2] shadow-xs"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="mr-auto bg-white border border-[#E8D8D2] rounded-2xl px-3.5 py-2 text-xs text-[#7E5A68] flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Checking live restaurant snapshot...
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[#E8D8D2] bg-white space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => askQuestion(chip)}
              disabled={loading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 cursor-pointer transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            askQuestion(question);
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about sales, active orders, low stock..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-[#DFC9C1] focus:outline-none focus:border-slate-900"
          />
          <button
            type="submit"
            disabled={loading || !question.trim()}
            className="px-3.5 py-2 rounded-xl bg-[#2A1622] text-white text-xs font-semibold hover:bg-[#3A1E2F] disabled:opacity-50 flex items-center gap-1 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
