#!/bin/bash
# Fireshare Comment Cleanup Script
# Removes comments from JavaScript and Python files

echo "=== Fireshare Comment Cleanup ==="
echo "This script will remove comments from JavaScript and Python source files while preserving functionality."

# Get absolute path to the scripts
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

# Run JavaScript comment removal
echo "
Step 1/2: Cleaning JavaScript comments..."
$SCRIPT_DIR/clean_js_comments.sh

# Run Python comment removal
echo "
Step 2/2: Cleaning Python comments..."
$SCRIPT_DIR/clean_py_comments.sh

echo "
=== Comment Cleanup Complete! ==="
echo "The codebase has been cleaned of excessive comments while preserving functionality."
echo "
Next steps:
1. Test the application to verify it still works correctly
2. If needed, run 'git diff' to review the changes
3. Run cleanup.sh and final_cleanup.sh to prepare for production
4. Commit the cleaned codebase with: git add . && git commit -m \"Clean codebase for production\"
5. Deploy using Docker Compose
"