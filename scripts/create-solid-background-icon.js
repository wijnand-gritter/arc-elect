#!/usr/bin/env node

/**
 * Create Solid Background Icon Script for ARC ELECT
 *
 * This script creates a new icon with a solid white background
 * instead of the current transparent background.
 *
 * @author Wijnand Gritter
 * @version 1.0.0
 */

const fs = require('fs');
const { execSync } = require('child_process');

// Create icon with solid white background
function createSolidBackgroundIcon() {
  console.log('🔄 Creating icon with solid white background...\n');

  const sourceIcon = 'src/assets/arc-elect-icon.png';
  const outputIcon = 'src/assets/arc-elect-icon-solid.png';

  try {
    // Create a white background and composite the icon on top
    const command = `magick convert -size 150x150 xc:white "${sourceIcon}" -composite "${outputIcon}"`;
    execSync(command, { stdio: 'ignore' });

    console.log('✅ Created icon with solid background: src/assets/arc-elect-icon-solid.png');

    // Also create a version with a light gray background for better contrast
    const outputIconGray = 'src/assets/arc-elect-icon-gray.png';
    const commandGray = `magick convert -size 150x150 xc:#f5f5f5 "${sourceIcon}" -composite "${outputIconGray}"`;
    execSync(commandGray, { stdio: 'ignore' });

    console.log('✅ Created icon with light gray background: src/assets/arc-elect-icon-gray.png');

    console.log('\n📁 Generated files:');
    console.log('   src/assets/arc-elect-icon-solid.png - White background');
    console.log('   src/assets/arc-elect-icon-gray.png - Light gray background');

    console.log('\n💡 You can now use either:');
    console.log('   - arc-elect-icon-solid.png for a clean white background');
    console.log('   - arc-elect-icon-gray.png for a subtle gray background');
  } catch (error) {
    console.error('❌ Error creating solid background icon:', error.message);
    process.exit(1);
  }
}

// Main function
function main() {
  console.log('🚀 Creating ARC ELECT icon with solid background...\n');

  if (!fs.existsSync('src/assets/arc-elect-icon.png')) {
    console.error('❌ Source icon not found: src/assets/arc-elect-icon.png');
    process.exit(1);
  }

  createSolidBackgroundIcon();
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
