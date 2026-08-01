# Git Workflow & Conventional Commits Standard — Trinetra v2.0

> **Document Status**: Production Specification  
> **Target Version**: v2.0.0  
> **Related Documents**: [CODING_STANDARDS.md](file:///c:/Users/ASUS/OneDrive/Desktop/Trinetra%20digital/docs/06_Development/CODING_STANDARDS.md)

---

## 1. Branching Strategy

- `main`: Production-ready code. Protected branch. Direct pushes forbidden.
- `develop`: Integration branch for release candidates.
- `feat/feature-name`: Feature development branches created off `develop`.
- `fix/bug-description`: Hotfix branches created off `main` or `develop`.

---

## 2. Conventional Commit Format

Commit messages must follow the Conventional Commits specification:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Examples
- `feat(pos): implement split payment cash/card UI [FR-02.4]`
- `fix(kds): resolve WebSocket ticket reconnection race condition`
- `docs(api): add Zod validation schema specification for menu API`
