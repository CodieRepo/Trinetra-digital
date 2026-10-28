'use client';

import React, { useState } from 'react';
import { X, ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react';
import { TableItem, SessionData } from './FloorTablesWorkspace';

interface TransferTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionData | null;
  availableTables: TableItem[];
  onTransferSession?: (sessionId: string, targetTableId: string) => Promise<boolean>;
}

export const TransferTableModal: React.FC<TransferTableModalProps> = ({
  isOpen,
  onClose,
  session,
  availableTables,
  onTransferSession,
}) => {
  const [selectedTargetTableId, setSelectedTargetTableId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const currentTableNumber = session.table?.table_number || 'Current Table';

  const handleTransfer = async () => {
    if (!selectedTargetTableId || !onTransferSession) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const success = await onTransferSession(session.id, selectedTargetTableId);
      if (success) {
        setSelectedTargetTableId('');
        onClose();
      } else {
        setError('Failed to transfer table. Please check if the target table is available.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to transfer table');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Transfer Table</h3>
              <p className="text-xs text-slate-500">
                Move active party from Table <span className="font-mono font-bold text-slate-800">{currentTableNumber}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
              {error}
            </div>
          )}

          {/* Current Session Info */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3.5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Guest:</span>
              <span className="font-semibold text-slate-800">{session.customer_name || 'Walk-in Guest'}</span>
            </div>
            {session.customer_phone && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Phone:</span>
                <span className="font-mono text-slate-700">{session.customer_phone}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Active Orders:</span>
              <span className="font-mono font-bold text-slate-900">{session.order_count} orders</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Destination Table <span className="text-rose-500">*</span>
            </label>
            {availableTables.length > 0 ? (
              <select
                value={selectedTargetTableId}
                onChange={(e) => setSelectedTargetTableId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Choose an available table --</option>
                {availableTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    Table {t.table_number} {t.floor_name ? `(${t.floor_name})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>No other tables are currently available. All tables are occupied or inactive.</span>
              </div>
            )}
            <p className="mt-1.5 text-[11px] text-slate-400">
              All active kitchen tickets, items, and running tab will be moved to the new table.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedTargetTableId || isSubmitting}
            onClick={handleTransfer}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Transferring...</span>
              </>
            ) : (
              <span>Confirm Move</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
