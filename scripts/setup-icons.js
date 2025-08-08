#!/usr/bin/env node

/**
 * Icon Setup Script for ARC ELECT
 *
 * This script copies the generated icons to the correct locations
 * for Electron Forge to use them properly.
 *
 * @author Wijnand Gritter
 * @version 1.0.0
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Copy icons to the correct locations for Electron Forge
function setupIcons() {
  console.log('🔄 Setting up icons for Electron Forge...\n');

  // Ensure the main icons directory exists
  if (!fs.existsSync('build/icons')) {
    fs.mkdirSync('build/icons', { recursive: true });
  }

  try {
    // Copy macOS icon
    if (fs.existsSync('build/icons/mac/icon.icns')) {
      fs.copyFileSync('build/icons/mac/icon.icns', 'build/icons/icon.icns');
      console.log('✅ Copied macOS icon: build/icons/icon.icns');
    } else {
      console.log('⚠️  macOS icon not found, generating...');
      execSync('node scripts/generate-mac-icon.js', { stdio: 'inherit' });
      if (fs.existsSync('build/icons/mac/icon.icns')) {
        fs.copyFileSync('build/icons/mac/icon.icns', 'build/icons/icon.icns');
        console.log('✅ Copied macOS icon: build/icons/icon.icns');
      }
    }

    // Copy Windows icon
    if (fs.existsSync('build/icons/win/icon.ico')) {
      fs.copyFileSync('build/icons/win/icon.ico', 'build/icons/icon.ico');
      console.log('✅ Copied Windows icon: build/icons/icon.ico');
    } else {
      console.log('⚠️  Windows icon not found, generating...');
      execSync('node scripts/generate-icons.js', { stdio: 'inherit' });
      if (fs.existsSync('build/icons/win/icon.ico')) {
        fs.copyFileSync('build/icons/win/icon.ico', 'build/icons/icon.ico');
        console.log('✅ Copied Windows icon: build/icons/icon.ico');
      }
    }

    // Copy Linux icon (use 256x256 as the main icon)
    if (fs.existsSync('build/icons/linux/256x256.png')) {
      fs.copyFileSync('build/icons/linux/256x256.png', 'build/icons/icon.png');
      console.log('✅ Copied Linux icon: build/icons/icon.png');
    } else {
      console.log('⚠️  Linux icon not found, generating...');
      execSync('node scripts/generate-icons.js', { stdio: 'inherit' });
      if (fs.existsSync('build/icons/linux/256x256.png')) {
        fs.copyFileSync(
          'build/icons/linux/256x256.png',
          'build/icons/icon.png',
        );
        console.log('✅ Copied Linux icon: build/icons/icon.png');
      }
    }

    console.log('\n✅ Icon setup completed!');
    console.log('\n📁 Icons are now in the correct locations:');
    console.log('   build/icons/icon.icns - macOS');
    console.log('   build/icons/icon.ico  - Windows');
    console.log('   build/icons/icon.png  - Linux');
  } catch (error) {
    console.error('❌ Error setting up icons:', error.message);
    process.exit(1);
  }
}

// Main function
function main() {
  console.log('🚀 Setting up ARC ELECT icons for Electron Forge...\n');
  setupIcons();
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
