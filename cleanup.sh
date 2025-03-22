#!/bin/bash
# Fireshare Production Preparation Script
# This script follows the guidelines in CLAUDE.md for safe cleanup

echo "=== Fireshare Production Preparation Script ==="
echo "This script safely cleans up the codebase for production deployment."

# Step 1: Remove development directories
echo "
Step 1/4: Removing development directories..."
echo "- Removing dev_scripts, dev_notes, dev_root (if they exist)"
rm -rf dev_scripts dev_notes dev_root test-processed test-videos 2>/dev/null || true

# Step 2: Clean up Python artifacts
echo "
Step 2/4: Cleaning up Python artifacts..."
echo "- Removing Python cache files"
find . -name "__pycache__" -type d -not -path "./venv/*" -not -path "./node_modules/*" | xargs rm -rf 2>/dev/null || true
find . -name "*.pyc" -type f -not -path "./venv/*" -not -path "./node_modules/*" | xargs rm -f 2>/dev/null || true

# Step 3: Remove temporary files
echo "
Step 3/4: Removing temporary files..."
echo "- Removing temporary files"
find . -name ".DS_Store" -type f | xargs rm -f 2>/dev/null || true
find . -name "*.log" -type f | xargs rm -f 2>/dev/null || true
find . -name ".eslintcache" -type f | xargs rm -f 2>/dev/null || true
find . -name "*.swp" -type f | xargs rm -f 2>/dev/null || true
find . -name "*.swo" -type f | xargs rm -f 2>/dev/null || true
find . -name "*.bak" -type f | xargs rm -f 2>/dev/null || true

# Step 4: Clean up documentation artifacts
echo "
Step 4/4: Handling documentation..."
echo "- Removing pre-upgrade requirements file"
rm -f requirements.pre_upgrade.txt 2>/dev/null || true

# Creating a .gitignore entry for CLAUDE.md
echo "
# If CLAUDE.md isn't already in .gitignore, add it"
if ! grep -q "CLAUDE.md" .gitignore; then
  echo "CLAUDE.md" >> .gitignore
  echo "- Added CLAUDE.md to .gitignore (should not be in version control)"
else
  echo "- CLAUDE.md already in .gitignore"
fi

# Remove empty directories (except node_modules and venv)
echo "- Removing empty directories"
find . -type d -empty -not -path "*/\.*" -not -path "*/node_modules/*" -not -path "*/venv/*" | xargs rm -rf 2>/dev/null || true

echo "
=== Safe Cleanup Complete! ==="
echo "The codebase has been safely prepared for production deployment."
echo "
Next steps:
1. Review the changes with 'git status'
2. Run 'final_cleanup.sh' to perform final preparation steps (builds React app)
3. Commit the cleaned codebase with: git add . && git commit -m \"Clean codebase for production\"
4. Deploy using Docker Compose

IMPORTANT: This script did NOT remove code comments as they are part of the intentional
design of the codebase according to CLAUDE.md guidelines."