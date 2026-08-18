'use client';

import React, { useState } from 'react';
import { X, Plus, Loader2, LayoutGrid, AlertCircle, Layers } from 'lucide-react';

export interface FloorOption {
  id: string;
  name: string;
}

interface AddTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTable: (tableNumber: string, floorId: string | null) => Promise<boolean>;
  existingTableNumbers: string[];
  floors: FloorOption[];
  defaultFloorId?: string | null;
}

export const AddTableModal: React.FC<AddTableModalProps> = ({
  isOpen,
  onClose,
  onAddTable,
  existingTableNumbers,
  floors,
  defaultFloorId = null,
}) => {
  const [tableNumber, setTableNumber] = useState('');
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(defaultFloorId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = tableNumber.trim();
    if (!cleanNumber) {
      setError('Table number is required.');
      return;
    }

    if (existingTableNumbers.some((num) => num.toLowerCase() === cleanNumber.toLowerCase())) {
      setError(`Table "${cleanNumber}" already exists in this restaurant.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const success = await onAddTable(cleanNumber, selectedFloorId);
      if (success) {
        setTableNumber('');
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to add table. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80">
              <LayoutGrid className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Dining Table</h3>
              <p className="text-xs text-slate-500 font-medium">Configure a new dining station</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer border-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Table Identifier / Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => {
                setTableNumber(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. T-6, PD-3, TR-4, Bar-1"
              required
              autoFocus
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-xs"
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              A unique identifier for waitstaff and digital QR guest ordering.
            </p>
          </div>

          {/* Floor Assignment Dropdown */}
          {floors.length > 0 && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                Floor / Section
              </label>
              <select
                value={selectedFloorId || ''}
                onChange={(e) => setSelectedFloorId(e.target.value || null)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 shadow-xs cursor-pointer"
              >
                <option value="">— No Floor (Unassigned) —</option>
                {floors.map((floor) => (
                  <option key={floor.id} value={floor.id}>
                    {floor.name}
                  </option>
                ))}
              </select>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Assign this table to a dining floor or section.
              </p>
            </div>
          )}

          {/* Preset quick suggestions */}
          <div>
            <span className="block text-[11px] font-semibold text-slate-500 mb-1.5">Quick Suggestions:</span>
            <div className="flex flex-wrap gap-1.5">
              {['T-5', 'T-6', 'PD-3', 'TR-3', 'VIP-2', 'Bar-1']
                .filter((p) => !existingTableNumbers.includes(p))
                .slice(0, 4)
                .map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTableNumber(preset)}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono font-medium text-slate-700 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-900 transition cursor-pointer"
                  >
                    +{preset}
                  </button>
                ))}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !tableNumber.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Table</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
