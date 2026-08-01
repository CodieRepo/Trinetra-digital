# Performance Budgets & Optimization Targets — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Engineering Core  
> **Related Documents**: [SUCCESS_CRITERIA.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/00_Project/SUCCESS_CRITERIA.md)

---

## 1. Purpose

This document specifies the strict performance budgets, frame-rate constraints, API latency targets, bundle size limits, and memory optimization guidelines for **Trinetra v2.0**.

---

## 2. Quantitative Performance Budgets

| Metric Category | Target SLA Budget | Measurement Methodology |
| :--- | :--- | :--- |
| **Catalog Filter Keystroke Latency** | `< 16ms` (1 Frame @ 60 FPS) | Chrome DevTools FPS Counter |
| **POS Transaction Memory Mutation** | `< 50ms` | Performance.now() Mark/Measure |
| **Realtime WebSocket Ticket Sync** | `< 100ms` | Supabase Inspector Timeline |
| **Client API Latency (p95)** | `< 150ms` | Datadog / OpenTelemetry APM |
| **Initial JS Bundle Size (POS PWA)** | `< 250KB` gzipped | Next.js Bundle Analyzer |
| **Initial JS Bundle Size (QR Guest)** | `< 120KB` gzipped | Next.js Bundle Analyzer |

---

## 3. Optimization Techniques

1. **Virtualization**: POS catalog grids and transaction lists with 500+ items use `react-window` or `@tanstack/react-virtual` to render only visible DOM nodes.
2. **Memoization & Immutable State**: React component sub-trees rely on `React.memo`, `useMemo`, and Zustand selectors to eliminate unnecessary re-renders during keystrokes.
3. **Database View Prefetching**: Frequently queried aggregated stats (daily gross revenue, top 10 items) stream from indexed Materialized Views refreshed asynchronously.
