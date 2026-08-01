import React, { useState, useEffect } from "react";
import { Search, Loader2, User, Phone, Building2 } from "lucide-react";
import { Lead } from "../../types/crm";

interface GlobalSearchBarProps {
  onSelectLead: (lead: Lead) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({ onSelectLead }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/leads?search=${encodeURIComponent(query.trim())}&limit=8`);
        const data = await res.json();
        if (data.success) {
          setResults(data.leads || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Global search error:", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setIsOpen(true)}
          placeholder="Global Search (Name, Phone, Company, Notes, Tasks)..."
          className="w-full h-9 pl-9 pr-8 bg-slate-900/90 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 animate-spin" />
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-11 left-0 w-full bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-96">
          <div className="p-2 border-b border-slate-800 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
              Results ({results.length})
            </span>
            <span className="text-[10px] text-slate-500">Sub-50ms Search</span>
          </div>

          <div className="overflow-y-auto max-h-80 divide-y divide-slate-800/50">
            {results.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No matching leads found</div>
            ) : (
              results.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => {
                    onSelectLead(lead);
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-slate-800/60 transition-colors flex items-start gap-3 border-0 bg-transparent cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/40 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-bold text-slate-200 truncate">{lead.name}</p>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 uppercase">
                        {lead.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {lead.phone}
                      </span>
                      {lead.company && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="w-3 h-3 text-slate-500" />
                          {lead.company}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
