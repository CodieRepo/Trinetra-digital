'use client';

import React from 'react';

export function Toaster() {
  return (
    <div
      id="toast-container"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
    />
  );
}

export function toast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = `pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all transform translate-y-2 animate-in fade-in ${
    type === 'success'
      ? 'bg-emerald-600 text-white'
      : type === 'error'
        ? 'bg-rose-600 text-white'
        : 'bg-slate-800 text-white border border-slate-700'
  }`;
  el.innerText = message;

  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-4');
    setTimeout(() => el.remove(), 200);
  }, 3000);
}
