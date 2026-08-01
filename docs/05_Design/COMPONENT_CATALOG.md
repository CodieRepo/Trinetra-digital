# Reusable UI Component Library Catalog — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Design System Core  
> **Related Documents**: [DESIGN_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/DESIGN_SYSTEM.md), [MOTION_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/MOTION_SYSTEM.md)

---

## 1. Purpose

This document catalogues the reusable UI components powering **Trinetra v2.0**. Built with shadcn/ui primitives, TailwindCSS, and Framer Motion, these components enforce visual consistency across POS, KDS, and Dashboard interfaces.

---

## 2. Component Taxonomy & Props Specifications

### 2.1 Component: `HotkeyBadge`
- **Purpose**: Displays visual keyboard shortcut cues inside buttons and menus.
- **Props**:
  - `shortcut: string` (e.g. `"F1"`, `"Cmd+K"`, `"/"`)
  - `variant?: 'default' | 'outline' | 'ghost'`

### 2.2 Component: `KdsTicketCard`
- **Purpose**: Displays active kitchen order ticket with prep timers and bump bar controls.
- **Props**:
  - `ticket: KdsTicket`
  - `onBump: (ticketId: string) => void`
  - `onItemStatusChange: (itemId: string, status: string) => void`

### 2.3 Component: `TableCanvasNode`
- **Purpose**: Interactive 2D node representing a table on the floorplan.
- **Props**:
  - `table: TableNode`
  - `onClick: (tableId: string) => void`
  - `isDraggable?: boolean`

---

## 3. Code Implementation Example (`HotkeyBadge`)

```tsx
// src/modules/core/components/ui/hotkey-badge.tsx
import React from 'react';

export const HotkeyBadge: React.FC<{ shortcut: string }> = ({ shortcut }) => (
  <kbd className="ml-auto inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
    {shortcut}
  </kbd>
);
```
