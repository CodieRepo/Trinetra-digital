# Repository Layout & Directory Structure Specification — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Related Documents**: [CODING_STANDARDS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/06_Development/CODING_STANDARDS.md)

---

## 1. Complete Directory Tree

```
trinetra-digital/
├── .github/                          <-- CI/CD GitHub Actions workflows
│   └── workflows/
│       └── ci.yml
├── docs/                             <-- 100% Locked Documentation System
│   ├── 00_Project/
│   ├── 01_Architecture/
│   ├── 02_Restaurant/
│   ├── 03_Database/
│   ├── 04_API/
│   ├── 05_Design/
│   ├── 06_Development/
│   ├── 07_Security/
│   ├── 08_Testing/
│   ├── 09_Deployment/
│   ├── 10_AI/
│   ├── 11_CRM/
│   └── 15_Blueprints/
├── prisma/                           <-- Database migrations & schema blueprint
│   └── schema.prisma
├── src/                              <-- Source Code Root
│   ├── app/                          <-- Next.js 14 App Router
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── (pos)/
│   │   ├── (kds)/
│   │   ├── (guest)/
│   │   └── api/
│   ├── lib/                          <-- Infrastructure utilities
│   │   ├── env.ts                    <-- Zod environment variable parser
│   │   └── supabase/                 <-- Supabase SSR client factories
│   ├── modules/                      <-- Modular Monolith Feature Cores
│   │   ├── core/                     <-- Shared platform core
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── middleware/
│   │   │   ├── types/
│   │   │   └── utils/
│   │   ├── restaurant/               <-- Priority 1 Restaurant OS Domain
│   │   ├── inventory/
│   │   └── ai/
│   └── styles/                       <-- Global CSS & Tailwind tokens
├── .env.example                      <-- Environment variable template
├── package.json                      <-- Dependencies & script runners
├── tsconfig.json                     <-- TypeScript compiler config & aliases
└── vitest.config.ts                  <-- Unit test runner configuration
```
