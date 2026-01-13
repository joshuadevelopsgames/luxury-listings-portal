#!/bin/bash
#
# Setup script to install git hooks
# Run this after cloning the repository

echo "🔧 Setting up git hooks..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
HOOKS_DIR="$SCRIPT_DIR/git-hooks"
GIT_HOOKS_DIR=".git/hooks"

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Create .git/hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

# Copy all hooks from scripts/git-hooks to .git/hooks
for hook in "$HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        echo "📝 Installing $hook_name..."
        cp "$hook" "$GIT_HOOKS_DIR/$hook_name"
        chmod +x "$GIT_HOOKS_DIR/$hook_name"
    fi
done

echo "✅ Git hooks installed successfully!"
echo ""
echo "The following hooks are now active:"
ls -1 "$GIT_HOOKS_DIR"/* 2>/dev/null | xargs -n1 basename | grep -v sample
