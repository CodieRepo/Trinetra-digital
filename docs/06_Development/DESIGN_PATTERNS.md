# Software Design Patterns & Architecture Blueprint — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Module Priority**: Platform Engineering  
> **Related Documents**: [ARCHITECTURE_CONSTITUTION.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/01_Architecture/ARCHITECTURE_CONSTITUTION.md)

---

## 1. Purpose

This document details the core software design patterns implemented across **Trinetra v2.0**, including Command Query Responsibility Segregation (CQRS), Repository Pattern, Factory Pattern, and Optimistic UI updates.

---

## 2. Core Design Patterns

1. **Repository Pattern**: Decouples domain logic from Prisma database client code (`src/modules/[domain]/repositories`).
2. **Factory Pattern**: Encapsulates complex order payload creation and payment tender object construction (`OrderFactory.createDineIn()`).
3. **State Pattern**: Implements explicit state transitions for `OrderStatus` and `TableStatus` state machines.
4. **Observer Pattern**: Supabase WebSockets broadcast realtime events to reactive Zustand stores.
