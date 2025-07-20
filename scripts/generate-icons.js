#!/usr/bin/env node

/**
 * Icon Generator Script for ARC ELECT
 *
 * This script generates app icons for all platforms (macOS, Windows, Linux)
 * from the existing arc-elect-icon.png file.
 *
 * @author Wijnand Gritter
 * @version 1.0.0
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Check if ImageMagick is installed
function checkImageMagick() {
  try {
    execSync('convert --version', { stdio: 'ignore' });
    return true;
  } catch {
    console.error('❌ ImageMagick is not installed. Please install it first:');
    console.error('   macOS: brew install imagemagick');
    console.error('   Ubuntu: sudo apt-get install imagemagick');
    console.error('   Windows: Download from https://imagemagick.org/');
    return false;
  }
}

// Create directories if they don't exist
function ensureDirectories() {
  const dirs = ['build/icons', 'build/icons/mac', 'build/icons/win', 'build/icons/linux'];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
}

// Generate PNG icons for Linux
function generateLinuxIcons() {
  console.log('🖼️  Generating Linux icons...');

  const sizes = [16, 32, 48, 64, 128, 256, 512];
  const sourceIcon = 'src/assets/arc-elect-icon.png';

  sizes.forEach((size) => {
    const outputPath = `build/icons/linux/${size}x${size}.png`;
    const command = `convert "${sourceIcon}" -resize ${size}x${size} "${outputPath}"`;

    try {
      execSync(command, { stdio: 'ignore' });
      console.log(`   ✅ Generated ${size}x${size}.png`);
    } catch {
      console.error(`   ❌ Failed to generate ${size}x${size}.png`);
    }
  });
}

// Generate ICO file for Windows
function generateWindowsIcon() {
  console.log('🖼️  Generating Windows icon...');

  const sourceIcon = 'src/assets/arc-elect-icon-white-bg.png';
  const outputPath = 'build/icons/win/icon.ico';

  // Create ICO with multiple sizes
  const sizes = [16, 32, 48, 64, 128, 256];
  const tempFiles = sizes.map((size) => `build/icons/win/temp_${size}.png`);

  try {
    // Generate individual PNG files
    sizes.forEach((size, index) => {
      const command = `convert "${sourceIcon}" -resize ${size}x${size} "${tempFiles[index]}"`;
      execSync(command, { stdio: 'ignore' });
    });

    // Combine into ICO file
    const combineCommand = `convert ${tempFiles.join(' ')} "${outputPath}"`;
    execSync(combineCommand, { stdio: 'ignore' });

    // Clean up temp files
    tempFiles.forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    console.log('   ✅ Generated icon.ico');
  } catch (error) {
    console.error('   ❌ Failed to generate Windows icon');
    console.error(error.message);
  }
}

// Generate ICNS file for macOS
function generateMacIcon() {
  console.log('🖼️  Generating macOS icon...');

  const sourceIcon = 'src/assets/arc-elect-icon-white-bg.png';
  const outputPath = 'build/icons/mac/icon.icns';

  // Create ICNS with multiple sizes
  const sizes = [16, 32, 64, 128, 256, 512, 1024];
  const tempDir = 'build/icons/mac/temp_iconset';

  try {
    // Create iconset directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate individual PNG files
    sizes.forEach((size) => {
      const outputFile = `${tempDir}/icon_${size}x${size}.png`;
      const command = `convert "${sourceIcon}" -resize ${size}x${size} "${outputFile}"`;
      execSync(command, { stdio: 'ignore' });
    });

    // Generate 2x versions for retina displays
    sizes.forEach((size) => {
      if (size <= 512) {
        // Only up to 512 for 2x versions
        const outputFile = `${tempDir}/icon_${size}x${size}@2x.png`;
        const command = `convert "${sourceIcon}" -resize ${size * 2}x${size * 2} "${outputFile}"`;
        execSync(command, { stdio: 'ignore' });
      }
    });

    // Convert to ICNS
    const icnsCommand = `iconutil -c icns "${tempDir}" -o "${outputPath}"`;
    execSync(icnsCommand, { stdio: 'ignore' });

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log('   ✅ Generated icon.icns');
  } catch (error) {
    console.error('   ❌ Failed to generate macOS icon');
    console.error(error.message);
  }
}

// Main function
function main() {
  console.log('🚀 Starting icon generation for ARC ELECT...\n');

  if (!checkImageMagick()) {
    process.exit(1);
  }

  if (!fs.existsSync('src/assets/arc-elect-icon-white-bg.png')) {
    console.error('❌ Source icon not found: src/assets/arc-elect-icon-white-bg.png');
    process.exit(1);
  }

  ensureDirectories();
  generateLinuxIcons();
  generateWindowsIcon();
  generateMacIcon();

  console.log('\n✅ Icon generation completed!');
  console.log('\n📁 Generated files:');
  console.log('   build/icons/linux/ - PNG files for Linux');
  console.log('   build/icons/win/icon.ico - Windows icon');
  console.log('   build/icons/mac/icon.icns - macOS icon');
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
