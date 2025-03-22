#!/bin/bash
# JavaScript Comment Removal Script for Fireshare
# This script uses terser to remove comments from JavaScript files

echo "=== JavaScript Comment Removal Script ==="
echo "This script will remove comments from JavaScript files while preserving functionality."

# Create a temporary directory for npm packages
TEMP_DIR=$(mktemp -d)
echo "Created temporary directory: $TEMP_DIR"

# Get absolute path of project directory
PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
echo "Project directory: $PROJECT_DIR"

# Install required packages
cd "$TEMP_DIR"
echo "Installing required npm packages..."
npm init -y > /dev/null
npm install terser strip-comments glob --quiet

# Create a temporary script
cat > clean.js <<'EOF'
const fs = require('fs');
const path = require('path');
const glob = require('glob');
const terser = require('terser');
const stripComments = require('strip-comments');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');
const PROJECT_DIR = process.argv[2];
const SOURCE_DIR = path.join(PROJECT_DIR, 'app/client/src');

// Skip directories
const EXCLUDE_DIRS = ['node_modules', 'build', 'dist'];

// Stats
let processed = 0;
let skipped = 0;
let errors = 0;
let totalCommentLines = 0;

// Function to count comments in a JavaScript file
function countComments(content) {
  const lines = content.split('\n');
  let commentLines = 0;
  let inMultilineComment = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (inMultilineComment) {
      commentLines++;
      if (trimmed.includes('*/')) {
        inMultilineComment = false;
      }
    } else if (trimmed.startsWith('//')) {
      commentLines++;
    } else if (trimmed.startsWith('/*')) {
      commentLines++;
      if (!trimmed.includes('*/')) {
        inMultilineComment = true;
      }
    }
  }
  
  return commentLines;
}

// Process a single file
async function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const commentLines = countComments(content);
    totalCommentLines += commentLines;
    
    if (commentLines === 0) {
      if (VERBOSE) console.log(`Skipping (no comments): ${filePath}`);
      skipped++;
      return;
    }
    
    if (VERBOSE) {
      console.log(`Processing: ${filePath}`);
      console.log(`  Comment lines found: ${commentLines}`);
    }
    
    // Try terser first (better at preserving functionality)
    try {
      const result = await terser.minify(content, {
        compress: false,
        mangle: false,
        format: {
          comments: false,
          beautify: true,
          indent_level: 2
        }
      });
      
      if (result.code) {
        if (!DRY_RUN) {
          fs.writeFileSync(filePath, result.code, 'utf8');
        }
        processed++;
        return;
      }
    } catch (terserError) {
      if (VERBOSE) {
        console.log(`  Terser failed, falling back to strip-comments: ${terserError.message}`);
      }
    }
    
    // Fallback to strip-comments
    const stripped = stripComments(content);
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, stripped, 'utf8');
    }
    processed++;
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    errors++;
  }
}

// Find and process all JavaScript files
async function main() {
  console.log(`Starting comment removal in ${SOURCE_DIR}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE RUN (will modify files)'}`);
  
  // Find all JavaScript files
  const jsFiles = glob.sync(`${SOURCE_DIR}/**/*.js`, {
    ignore: EXCLUDE_DIRS.map(dir => `${SOURCE_DIR}/**/${dir}/**`)
  });
  
  console.log(`Found ${jsFiles.length} JavaScript files to process`);
  
  // Process files
  for (const file of jsFiles) {
    await processFile(file);
  }
  
  // Report results
  console.log('\nComment removal complete:');
  console.log(`Processed: ${processed} files`);
  console.log(`Skipped: ${skipped} files`);
  console.log(`Errors: ${errors} files`);
  console.log(`Total comment lines removed: ${totalCommentLines}`);
  
  if (DRY_RUN) {
    console.log('\nThis was a dry run - no files were modified.');
  } else {
    console.log('\nFiles were modified to remove comments.');
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
EOF

# Run dry run to show stats
echo "Performing dry run to count comments (no changes will be made)..."
node clean.js "$PROJECT_DIR" --dry-run --verbose

# Ask for confirmation
echo ""
read -p "Do you want to proceed with removing comments? (y/n): " confirm
if [[ $confirm == [yY] || $confirm == [yY][eE][sS] ]]; then
  echo "Removing comments from JavaScript files..."
  node clean.js "$PROJECT_DIR"
  echo "JavaScript comment removal complete!"
else
  echo "Operation cancelled. No files were modified."
fi

# Clean up
cd "$PROJECT_DIR"
echo "Cleaning up temporary directory..."
rm -rf "$TEMP_DIR"
echo "Done."