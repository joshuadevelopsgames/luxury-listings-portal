# Luxury Listings Portal

## Setup

### Install Git Hooks

After cloning the repository, run:

```bash
./scripts/setup-git-hooks.sh
```

This will install pre-push hooks that check for syntax errors before allowing pushes.

### Manual Hook Installation

If you prefer to install hooks manually:

```bash
cp scripts/git-hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
```

## Git Hooks

### Pre-Push Hook

The pre-push hook automatically:
- Checks for syntax errors by running `npm run build`
- Prevents pushing code that won't compile
- Can be bypassed with `git push --no-verify` (not recommended)

## Development

```bash
npm install
npm start
```

## Building

```bash
npm run build
```
