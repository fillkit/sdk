# Contributing to FillKit SDK

This guide covers everything you need to install, develop, and publish the FillKit SDK.

## Installation

### Prerequisites

- Node.js >= 18.0.0
- npm package manager

### Setup

```bash
# Clone the repository
git clone https://github.com/fillkit/sdk.git
cd sdk

# Install dependencies
npm install
```

## Development

### Available Commands

```bash
# Testing
npm test                 # Run unit tests
npm run test:ui          # Run tests with UI
npm run test:e2e         # Run E2E tests

# Code Quality
npm run typecheck        # TypeScript type checking
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run format           # Format code with Prettier

# Building
npm run build            # Full build (types + lib + browser)
npm run clean            # Clean build artifacts
```

### Development Workflow

1. **Make your changes** in the `src/` directory
2. **Run tests** to ensure everything works: `npm test`
3. **Check types and linting**: `npm run typecheck && npm run lint`
4. **Build** to verify: `npm run build`

### Code Style

- Use **TypeScript strict mode** - all types must be explicit
- Use `.js` extensions in imports (required for `verbatimModuleSyntax`)
- All public APIs must have JSDoc/TSDoc comments
- Code is auto-formatted with Prettier

```typescript
// ✅ Correct
import { FillKit } from '@/core/FillKit.js';

// ❌ Wrong
import { FillKit } from '@/core/FillKit';
```

## Publishing

### Automated Publishing (Recommended)

FillKit uses **GitHub Actions + semantic-release** to automatically publish both `@fillkit/core` and `@fillkit/browser` packages.

#### How It Works

**For main/master branches:**

1. Push with conventional commit messages
2. GitHub Actions runs quality checks and builds
3. semantic-release determines version bump
4. Publishes both packages to npm
5. Creates GitHub release with changelogs

**For dev branch:**

1. Push with conventional commit messages
2. GitHub Actions runs quality checks and builds
3. Creates GitHub pre-release (no npm publishing)

#### Setup Requirements

1. **Add NPM_TOKEN to GitHub Secrets:**
   - Go to repository Settings → Secrets and variables → Actions
   - Add secret: `NPM_TOKEN` with your npm access token

2. **Use conventional commit messages:**

   ```bash
   feat: add new feature         # → minor version bump
   fix: fix bug                  # → patch version bump
   feat!: breaking change        # → major version bump
   ```

3. **Push to main:**
   ```bash
   git add .
   git commit -m "feat: add new autofill strategy"
   git push origin main
   ```

That's it! Both packages will be automatically published. 🎉

#### Branch Publishing Behavior

| Branch          | Version                         | npm Publishing | GitHub Release       |
| --------------- | ------------------------------- | -------------- | -------------------- |
| **main/master** | Production (e.g., 1.0.0)        | ✅ Yes         | ✅ Yes               |
| **dev**         | Pre-release (e.g., 1.0.0-dev.1) | ❌ No          | ✅ Yes (Pre-release) |

### Manual Publishing (Alternative)

If you need to publish manually:

```bash
# Ensure you're logged into npm
npm whoami

# Build everything
npm run build

# Publish both packages
npm run publish:all

# Or publish separately
npm run publish:core      # Publish @fillkit/core
npm run publish:browser   # Publish @fillkit/browser
```

### Pre-publish Checklist

- [ ] All tests pass (`npm test`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] Linting passes (`npm run lint:check`)
- [ ] Build succeeds (`npm run build`)
- [ ] Version bumped in both `package.json` files (if manual)

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>
```

### Types

- **feat:** New feature
- **fix:** Bug fix
- **docs:** Documentation changes
- **refactor:** Code refactoring
- **test:** Adding or updating tests
- **chore:** Maintenance tasks

### Examples

```bash
feat(core): add watch mode for dynamic forms
fix(strategies): correct email validation pattern
docs(readme): update installation instructions
```

### Using Commitizen

```bash
# Stage your changes
git add .

# Use commitizen for interactive commit
npm run cm
```

## Package Architecture

FillKit uses a **dual-package architecture**:

### @fillkit/core (~230 KB)

- **Target:** Developers using bundlers (Vite, webpack, etc.)
- **Contains:** ESM, CJS, and TypeScript declarations
- **Installation:** `npm install @fillkit/core`

### @fillkit/browser (~1.9 MB)

- **Target:** CDN users and direct browser usage
- **Contains:** IIFE and UMD bundles
- **Usage:** Via CDN (unpkg, jsdelivr)

Both packages are built from the same source and maintain synchronized versions.

## Getting Help

- **Issues:** [GitHub Issues](https://github.com/fillkit/sdk/issues)
- **Discussions:** [GitHub Discussions](https://github.com/fillkit/sdk/discussions)
- **Website:** [fillkit.dev](https://fillkit.dev)

---

Thank you for contributing to FillKit! 🎉
