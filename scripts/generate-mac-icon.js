#!/usr/bin/env node

/**
 * macOS Icon Generator Script for ARC ELECT
 *
 * This script generates macOS app icons using ImageMagick directly
 * instead of relying on iconutil.
 *
 * @author Wijnand Gritter
 * @version 1.0.0
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Generate ICNS file for macOS using ImageMagick
function generateMacIcon() {
  console.log('🖼️  Generating macOS icon...');

  const sourceIcon = 'src/assets/arc-elect-icon.png';
  const outputPath = 'build/icons/mac/icon.icns';

  try {
    // Create ICNS directly using ImageMagick
    // This creates an ICNS file with all required sizes
    const command = `magick convert "${sourceIcon}" -define icon:auto-resize=16,32,64,128,256,512,1024 "${outputPath}"`;
    execSync(command, { stdio: 'ignore' });

    console.log('   ✅ Generated icon.icns');
  } catch (error) {
    console.error('   ❌ Failed to generate macOS icon');
    console.error(error.message);
  }
}

// Main function
function main() {
  console.log('🚀 Starting macOS icon generation for ARC ELECT...\n');

  if (!fs.existsSync('src/assets/arc-elect-icon.png')) {
    console.error('❌ Source icon not found: src/assets/arc-elect-icon.png');
    process.exit(1);
  }

  // Ensure directory exists
  if (!fs.existsSync('build/icons/mac')) {
    fs.mkdirSync('build/icons/mac', { recursive: true });
  }

  generateMacIcon();

  console.log('\n✅ macOS icon generation completed!');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
