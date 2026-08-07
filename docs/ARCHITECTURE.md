# Trinetra Restaurant OS — Architecture Principles

## Current Architecture

Standalone Next.js SaaS application.

## Core Stack

- Next.js 15
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- Framer Motion
- Supabase
- PostgreSQL
- RLS
- Realtime

## Architecture Principles

- Build incrementally
- One milestone at a time
- No jumping ahead
- No refactor-first approach
- No hidden assumptions
- No hardcoded future onboarding
- No CRM dependency for operational screens

## Data Principles

- Use relational integrity
- Prefer transactions for financial and operational mutations
- Keep audit trails where needed
- Avoid unnecessary complexity
- Use immutable migrations

## Security Principles

- Enforce tenant isolation
- Respect RLS
- Never expose service keys
- Never trust client input
- Prevent cross-tenant data leakage

## Performance Principles

- Make POS feel instant
- Use realtime where it adds real value
- Avoid unnecessary requests
- Keep common workflows fast