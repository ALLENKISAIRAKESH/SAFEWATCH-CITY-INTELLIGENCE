# 🤝 Contributing to SafeWatch

Thank you for your interest in contributing to **SafeWatch**! This document outlines our development workflow, standards, and expectations.

---

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Commit Convention](#commit-convention)
- [Code Standards](#code-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/HackITxMRDU.git
   cd HackITxMRDU
   ```
3. **Add upstream remote:**
   ```bash
   git remote add upstream https://github.com/ALLENKISAIRAKESH/HackITxMRDU.git
   ```
4. **Set up your local environment** following the [README](README.md) setup guide.

---

## Development Workflow

```bash
# Keep your fork in sync
git fetch upstream
git checkout main
git merge upstream/main

# Create a feature branch
git checkout -b feature/your-feature-name

# Make your changes, then stage and commit
git add .
git commit -m "feat: your descriptive commit message"

# Push to your fork
git push origin feature/your-feature-name
```

---

## Commit Convention

We follow **Conventional Commits** for a clean, readable git history:

| Prefix | When to Use |
|---|---|
| `feat:` | A new feature |
| `fix:` | A bug fix |
| `docs:` | Documentation changes only |
| `style:` | Formatting, missing semicolons (no logic change) |
| `refactor:` | Code restructuring without feature/fix change |
| `perf:` | Performance improvements |
| `test:` | Adding or updating tests |
| `chore:` | Build process, tooling, dependency updates |

**Example commits:**
```
feat: add polygon zone drawing with ray-casting intrusion detection
fix: resolve WebSocket reconnection on network drop
docs: update API reference with WebSocket event table
refactor: extract detection logic into custom useDetection hook
```

---

## Code Standards

### TypeScript / React
- Use **functional components** with hooks — no class components
- Prefer **TypeScript strict mode** — avoid `any` types
- Component files: **PascalCase** (`CameraFeed.tsx`)
- Hooks: **camelCase** with `use` prefix (`useDetection.ts`)
- Keep components **focused and single-responsibility**

### Python
- Follow **PEP 8** style guidelines
- Use **type hints** where practical
- Document public functions with docstrings

### CSS / Tailwind
- Use Tailwind utility classes from the design system
- Avoid inline styles
- Respect the dark color scheme tokens

---

## Pull Request Process

1. Ensure your branch is **up to date** with `main`
2. Make sure the **frontend builds** successfully: `npm run build`
3. Verify **no TypeScript errors**: `npx tsc --noEmit`
4. Write a **clear PR description** explaining what changed and why
5. Link any related **issues** using `Closes #issue-number`
6. Request a review from a maintainer

---

## Reporting Issues

When filing a bug report, please include:

- **Platform / OS** you're running on
- **Browser and version** (for UI bugs)
- **Steps to reproduce** the issue
- **Expected vs actual** behavior
- **Screenshots or screen recordings** if relevant
- **Console errors** (browser DevTools or terminal output)

---

## Questions?

Open a [GitHub Discussion](https://github.com/ALLENKISAIRAKESH/HackITxMRDU/discussions) or file an [Issue](https://github.com/ALLENKISAIRAKESH/HackITxMRDU/issues).
