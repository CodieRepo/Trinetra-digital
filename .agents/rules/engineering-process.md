# Trinetra Restaurant OS — Engineering Process Rules

## Sources of Truth (Priority Order)

1. **User instructions** — Always highest priority.
2. **AGENTS.md** — The engineering constitution. Read before every milestone.
3. **docs/DEVELOPMENT_BACKLOG.md** — The frozen implementation roadmap (v2, approved).
4. **Approved milestone design documents** — Implementation specifications per milestone.

If any document conflicts with AGENTS.md, stop and ask for clarification.

---

## Frozen Backlog Rules

- The Development Backlog (v2) is frozen. Do not expand it unless the user explicitly requests changes.
- Do not introduce feature creep.
- Do not redesign approved business workflows without discussion.
- Keep all implementation aligned with the approved roadmap.
- Never build future-scope features early just because they are technically easy.
- Never skip milestones. Complete, review, and get approval before moving to the next.

---

## Development Methodology

Every milestone follows this exact sequence:

```
Requirements Freeze
→ Architecture Design
→ Database Design
→ API Design
→ UI/UX Design
→ Implementation
→ Testing
→ Review
→ Approval
→ Next Milestone
```

Never jump directly into coding. Think first. Design second. Implement third.

---

## Before Starting Each Milestone

1. Read AGENTS.md
2. Read docs/DEVELOPMENT_BACKLOG.md (frozen backlog)
3. Understand the business workflow for that milestone
4. Explain the implementation plan
5. Wait for approval before writing any code

---

## Decision Priority

When making engineering decisions, always prioritize (in order):

1. Real restaurant workflows
2. Commercial usability
3. Simplicity
4. Maintainability
5. Performance
6. Long-term scalability

Never optimize for developer convenience over product quality.

---

## Ambiguity Protocol

Whenever a requirement is ambiguous:

1. Stop immediately
2. Explain the ambiguity clearly
3. Present available options with trade-offs
4. Wait for explicit approval

Never guess business rules.
Never silently change architecture.
Never silently change workflows.
Never silently implement assumptions.

---

## Locked Governing Decisions

These decisions are settled unless the user explicitly changes them:

| Decision | Resolution |
|----------|------------|
| Branch Model | DB supports multi-branch from Day 1. UI single-branch initially. |
| Geography | India first. INR, GST, CGST, SGST. Localization-ready but not built. |
| Order Types (MVP) | Dine-in + Takeaway. No Delivery. Extensible architecture. |
| Printing | Receipt + Kitchen ticket printing required for MVP. |
| Authentication | PIN-based quick login + normal login. Shared terminals expected. |
| Offline | Not Day 1. Architecture must not prevent adding later. |
| AI | Future milestone only. Do not introduce into earlier milestones. |
| CRM | Provisions restaurants only. Restaurant OS is operationally independent. |
| Inventory (MVP) | Basic: Recipes, BOM, Stock In, Stock Out, Waste, Low Stock. |

---

## Quality Standards

A feature is complete only when:

- Business workflow is correct
- UI is polished and commercial quality
- Types are complete (strict TypeScript)
- Validation exists for all inputs
- Edge cases are handled
- Loading, empty, and error states are implemented
- Responsive (mobile, tablet, desktop)
- Dark mode compatible
- No placeholder logic remains
- Audit trails exist for financial operations
- Ready for production use by real restaurant staff
