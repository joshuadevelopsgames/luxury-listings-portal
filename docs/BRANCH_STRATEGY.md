# Branch Strategy

## Overview

This repository uses a two-branch strategy:

- **`main`** - Production branch (stable, deployed code)
- **`dev`** - Development branch (work in progress, testing)

---

## Branch Usage

### `main` Branch
- ✅ Production-ready code only
- ✅ All tests passing
- ✅ Deployed to production
- ✅ Protected (require PR reviews before merging)

### `dev` Branch
- 🔧 Development work in progress
- 🔧 Feature development
- 🔧 Testing and experimentation
- 🔧 Can be deployed to staging/dev environment

---

## Workflow

### For New Features/Bugs:

1. **Create feature branch from `dev`:**
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/your-feature-name
   ```

2. **Work on your feature:**
   ```bash
   # Make changes, commit frequently
   git add .
   git commit -m "Add feature X"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request:**
   - PR from `feature/your-feature-name` → `dev`
   - Get code review
   - Merge to `dev`

5. **When ready for production:**
   - PR from `dev` → `main`
   - Review and merge
   - Deploy to production

---

## Quick Commands

### Switch to dev branch:
```bash
git checkout dev
```

### Create new feature branch:
```bash
git checkout dev
git pull origin dev
git checkout -b feature/new-feature
```

### Update dev branch:
```bash
git checkout dev
git pull origin dev
```

### Merge dev into main (when ready):
```bash
git checkout main
git pull origin main
git merge dev
git push origin main
```

---

## Current Branches

- `main` - Production branch
- `dev` - Development branch (current active branch)

---

**Note:** Always work in feature branches, never directly on `main` or `dev` for new features.
