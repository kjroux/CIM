// Node.js script to create PNG icons
// Run with: node create-icons-node.js

const fs = require('fs');
const { createCanvas } = require('canvas');

function createIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#4A90E2';
  ctx.fillRect(0, 0, size, size);

  // CIM text
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${size * 0.375}px Arial`;
  ctx.fillText('CIM', size / 2, size * 0.45);

  // Training text
  ctx.font = `${size * 0.125}px Arial`;
  ctx.fillText('Training', size / 2, size * 0.7);

  // Save to file
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filename, buffer);
  console.log(`✓ Created ${filename}`);
}

try {
  createIcon(192, 'icons/icon-192.png');
  createIcon(512, 'icons/icon-512.png');
  console.log('\nIcons created successfully!');
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nTo use this script:');
  console.log('1. Install canvas: npm install canvas');
  console.log('2. Run: node create-icons-node.js');
  console.log('\nOr use the generate-icons.html file in a browser instead.');
}
