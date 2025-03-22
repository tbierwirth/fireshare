#!/bin/bash
# Python Comment Removal Script for Fireshare
# Uses a custom Python script for comment removal while preserving functionality

echo "=== Python Comment Removal Script ==="
echo "This script will remove comments from Python files while preserving functionality."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Get absolute path of project directory
PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "Project directory: $PROJECT_DIR"

# Create Python script for comment removal
cat > "$TEMP_DIR/clean_py.py" <<'EOF'
import os
import sys
import re
import tokenize
from io import StringIO

# Configuration
DRY_RUN = '--dry-run' in sys.argv
VERBOSE = '--verbose' in sys.argv
PROJECT_DIR = sys.argv[1]
SERVER_DIR = os.path.join(PROJECT_DIR, 'app', 'server')

# Skip directories
EXCLUDE_DIRS = ['__pycache__', 'venv', 'node_modules', 'migrations']

# Stats
processed = 0
skipped = 0
errors = 0
total_comment_lines = 0

def count_comment_lines(content):
    """Count the number of lines with comments in a Python file"""
    lines = content.split('\n')
    comment_count = 0
    in_multiline = False
    
    for line in lines:
        stripped = line.strip()
        
        # Skip empty lines
        if not stripped:
            continue
            
        # Handle multiline strings/comments
        if in_multiline:
            comment_count += 1
            if '"""' in stripped or "'''" in stripped:
                in_multiline = False
        # Single line comment
        elif stripped.startswith('#'):
            comment_count += 1
        # Start of multiline comment/docstring
        elif stripped.startswith('"""') or stripped.startswith("'''"):
            comment_count += 1
            # Check if it's a single line docstring
            if not (stripped.endswith('"""') and len(stripped) > 3) and not (stripped.endswith("'''") and len(stripped) > 3):
                in_multiline = True
    
    return comment_count

def remove_comments(source):
    """Remove comments from Python source code while preserving functionality"""
    result = []
    tokens = tokenize.generate_tokens(StringIO(source).readline)
    prev_toktype = tokenize.INDENT
    last_lineno = -1
    last_col = 0
    
    for tok in tokens:
        token_type = tok[0]
        token_string = tok[1]
        start_line, start_col = tok[2]
        end_line, end_col = tok[3]
        
        # Preserve empty lines
        if start_line > last_lineno:
            last_col = 0
        if start_col > last_col:
            result.append(" " * (start_col - last_col))
        
        # Skip comments
        if token_type == tokenize.COMMENT:
            pass
        # Remove docstrings (only standalone ones, not ones used for runtime)
        elif token_type == tokenize.STRING:
            if prev_toktype != tokenize.INDENT:
                # This is not a docstring, it's a regular string
                result.append(token_string)
            elif token_string.startswith('"""') or token_string.startswith("'''"):
                # This looks like a docstring
                if VERBOSE:
                    print(f"  Removing docstring at line {start_line}")
            else:
                # Regular string
                result.append(token_string)
        else:
            result.append(token_string)
        
        prev_toktype = token_type
        last_col = end_col
        last_lineno = end_line
    
    return ''.join(result)

def process_file(file_path):
    """Process a single Python file to remove comments"""
    global processed, skipped, errors, total_comment_lines
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Count comment lines
        comment_count = count_comment_lines(content)
        total_comment_lines += comment_count
        
        if comment_count == 0:
            if VERBOSE:
                print(f"Skipping (no comments): {file_path}")
            skipped += 1
            return
        
        if VERBOSE:
            print(f"Processing: {file_path}")
            print(f"  Comment lines found: {comment_count}")
        
        # Remove comments
        cleaned = remove_comments(content)
        
        # Write back if not in dry run mode
        if not DRY_RUN:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(cleaned)
        
        processed += 1
    
    except Exception as e:
        print(f"Error processing {file_path}: {str(e)}")
        errors += 1

def find_python_files(directory):
    """Find all Python files in the specified directory"""
    python_files = []
    
    for root, dirs, files in os.walk(directory):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for file in files:
            if file.endswith('.py'):
                python_files.append(os.path.join(root, file))
    
    return python_files

def main():
    """Main entry point"""
    print(f"Starting Python comment removal in {SERVER_DIR}")
    print(f"Mode: {'DRY RUN (no changes)' if DRY_RUN else 'LIVE RUN (will modify files)'}")
    
    # Find all Python files
    python_files = find_python_files(SERVER_DIR)
    print(f"Found {len(python_files)} Python files to process")
    
    # Process each file
    for file_path in python_files:
        process_file(file_path)
    
    # Show summary
    print("\nComment removal complete:")
    print(f"Processed: {processed} files")
    print(f"Skipped: {skipped} files")
    print(f"Errors: {errors} files")
    print(f"Total comment lines removed: {total_comment_lines}")
    
    if DRY_RUN:
        print("\nThis was a dry run - no files were modified.")
    else:
        print("\nFiles were modified to remove comments.")

if __name__ == "__main__":
    main()
EOF

# Run dry run to show stats
echo "Performing dry run to count comments (no changes will be made)..."
python3 "$TEMP_DIR/clean_py.py" "$PROJECT_DIR" --dry-run --verbose

# Ask for confirmation
echo ""
read -p "Do you want to proceed with removing comments? (y/n): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
  echo "Removing comments from Python files..."
  python3 "$TEMP_DIR/clean_py.py" "$PROJECT_DIR"
  echo "Python comment removal complete!"
else
  echo "Operation cancelled. No files were modified."
fi

# Clean up
echo "Cleaning up temporary directory..."
rm -rf "$TEMP_DIR"
echo "Done."