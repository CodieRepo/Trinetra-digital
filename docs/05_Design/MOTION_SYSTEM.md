# Motion System & Animation Physics Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Design System & Micro-Interactions  
> **Related Documents**: [DESIGN_SYSTEM.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/05_Design/DESIGN_SYSTEM.md)

---

## 1. Purpose

This document specifies the Framer Motion spring physics presets, transition durations, easing curves, modal entrance animations, and KDS ticket bump motions for **Trinetra v2.0**.

---

## 2. Motion Presets Specifications

```typescript
// src/modules/core/styles/motion-presets.ts

export const MOTION_PRESETS = {
  // Ultra-responsive spring physics for hotkey buttons & active card focus
  microSpring: {
    type: 'spring',
    stiffness: 500,
    damping: 35,
    mass: 0.5
  },
  
  // Smooth modal and dialog entrance
  modalFadeIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.96 },
    transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] }
  },
  
  // KDS Ticket Bump Slide-Out Motion
  kdsTicketBump: {
    initial: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20, scale: 0.95 },
    transition: { duration: 0.2 }
  }
};
```
