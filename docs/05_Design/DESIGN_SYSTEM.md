# Design System & UI/UX Guidelines — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Design Philosophy**: Stripe / Vercel / Linear / Notion / Apple / Raycast Minimalist SaaS  
> **Related Documents**: [COLOR_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/COLOR_SYSTEM.md), [TYPOGRAPHY.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/TYPOGRAPHY.md)

---

## 1. Purpose

This document codifies the design principles, color palettes, typographic scale, component architecture, layout grids, micro-interactions, and accessibility standards powering **Trinetra v2.0**. The design system guarantees a ultra-premium, dark-mode-first aesthetic inspired by world-class SaaS software.

---

## 2. Core Aesthetic Pillars

1. **Precision & Contrast**: Muted slate backgrounds (`hsl(222, 47%, 11%)`) contrasted with high-clarity text (`hsl(210, 40%, 98%)`) and subtle 1px border frames (`hsl(217, 33%, 17%)`).
2. **Keyboard-First Interactivity**: Visual focus rings (`ring-2 ring-primary`) and visible hotkey badges (e.g., `Cmd+K`, `F1`, `/`) integrated directly into UI components.
3. **Purposeful Micro-Animations**: Smooth Framer Motion spring physics (`stiffness: 400, damping: 30`) for state transitions, modal entrances, and KDS ticket bumps.
4. **No Clutter**: Dense operational data (POS items, kitchen tickets) is visually organized into clean cards, badge tags, and clear typography.

---

## 3. TailwindCSS CSS Variables & Design Tokens

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Light Theme Tokens */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    /* Premium Dark Theme Tokens (Default) */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;
  }
}
```

---

## 4. Typography Scale

- **Primary Font**: `Inter` or `Geist Sans` via `next/font/google`.
- **Monospace Font**: `JetBrains Mono` or `Geist Mono` for prices, bill totals, SKU numbers, and hotkey hints.

| Token | Utility Class | Font Size | Line Height | Usage |
| :--- | :--- | :--- | :--- | :--- |
| Title Display | `text-3xl font-bold` | 30px | 36px | Dashboard Headers |
| Heading 1 | `text-2xl font-semibold` | 24px | 32px | Section Headlines, Modals |
| Heading 2 | `text-lg font-medium` | 18px | 28px | Card Titles, POS Categories |
| Body Base | `text-sm font-normal` | 14px | 20px | Standard Text, Table Rows |
| Micro Caption| `text-xs font-mono` | 12px | 16px | Hotkeys, Timers, SKU Codes |

---

## 5. Reusable Component Specification Example

### 5.1 Hotkey Badge Component
```tsx
// src/modules/core/components/ui/hotkey-badge.tsx
import React from 'react';

interface HotkeyBadgeProps {
  shortcut: string;
}

export const HotkeyBadge: React.FC<HotkeyBadgeProps> = ({ shortcut }) => {
  return (
    <kbd className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
      {shortcut}
    </kbd>
  );
};
```

---

## 6. Accessibility & ARIA Guidelines

- All interactive elements must contain valid `aria-label` tags.
- Focus outlines must never be hidden (`outline-none` must always be paired with custom `focus-visible:ring-2`).
- Contrast ratio between text and background must exceed **4.5:1** (WCAG AA Standard).
