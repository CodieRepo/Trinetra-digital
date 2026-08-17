'use client';

import React, { useState } from 'react';
import { X, QrCode, Copy, Check, ExternalLink, Printer } from 'lucide-react';

interface TableQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  table: {
    id: string;
    table_number: string;
    table_token: string;
  } | null;
  restaurantName: string;
}

export const TableQrModal: React.FC<TableQrModalProps> = ({
  isOpen,
  onClose,
  table,
  restaurantName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !table) return null;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://trinetra-digital.vercel.app';
  const qrUrl = `${origin}/api/r/${table.table_token}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}&margin=10`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - Table ${table.table_number}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: #fff;
              color: #0f172a;
            }
            .card {
              border: 2px solid #e2e8f0;
              border-radius: 16px;
              padding: 24px;
              text-align: center;
              max-width: 280px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.05);
            }
            .rest-name {
              font-size: 14px;
              font-weight: 700;
              color: #b45309;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .table-no {
              font-size: 24px;
              font-weight: 900;
              margin: 0 0 16px 0;
              color: #0f172a;
            }
            .qr-img {
              width: 200px;
              height: 200px;
              margin-bottom: 12px;
            }
            .instruction {
              font-size: 12px;
              color: #64748b;
              font-weight: 600;
              margin: 0;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="rest-name">${restaurantName || 'Restaurant OS'}</div>
            <h1 class="table-no">Table ${table.table_number}</h1>
            <img src="${qrImageUrl}" class="qr-img" alt="QR Code" />
            <p class="instruction">Scan to browse menu & order</p>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xl text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200/80">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Table {table.table_number} QR Code
              </h3>
              <p className="text-xs text-slate-500 font-medium">{restaurantName || 'Dining Station'}</p>
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

        {/* QR Display Card */}
        <div className="my-6 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#FFFDF9] to-white rounded-xl border border-amber-100 shadow-xs">
          <div className="rounded-xl bg-white p-3 shadow-xs border border-slate-200/80 mb-3">
            <img
              src={qrImageUrl}
              alt={`QR code for Table ${table.table_number}`}
              className="h-44 w-44 object-contain rounded-lg"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono">
            Table {table.table_number}
          </span>
          <p className="mt-2 text-xs text-slate-500 text-center max-w-xs">
            Guests scan this QR code with their mobile phone camera to browse the live menu and place orders.
          </p>
        </div>

        {/* URL Link Box */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 mb-5">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-xs font-mono text-slate-600 select-all">
              {qrUrl}
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <a
            href={qrUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open Menu
          </a>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            Print Sticker
          </button>
        </div>
      </div>
    </div>
  );
};
