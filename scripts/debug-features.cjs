#!/usr/bin/env node
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/emoji-features.json'));
console.log('Grid size:', data.gridSize);
console.log('Emojis:', data.emojis.length);
console.log('Backgrounds:', data.backgrounds.length);
console.log();

// Check first few emojis
const first5 = data.emojis.slice(0, 5);
console.log('First 5 emojis on white bg:');
for (const e of first5) {
  const grid = e.g.white;
  const avgR = grid.reduce((s, c) => s + c.r, 0) / grid.length;
  const avgG = grid.reduce((s, c) => s + c.g, 0) / grid.length;
  const avgB = grid.reduce((s, c) => s + c.b, 0) / grid.length;
  console.log(`  ${e.c}: avgRGB=(${avgR.toFixed(3)}, ${avgG.toFixed(3)}, ${avgB.toFixed(3)}), cells=${grid.length}`);
}

// Find wavy dash
const wavy = data.emojis.find(e => e.c === '〰' || e.c === '〰️');
if (wavy) {
  const grid = wavy.g.white;
  console.log();
  console.log('Wavy dash 〰:');
  console.log('  Grid cells:', grid.length);
  console.log('  First 4 cells:', JSON.stringify(grid.slice(0, 4)));
}

// Check variance across all emojis
const allAvgL = data.emojis.map(e => {
  const grid = e.g.white;
  return grid.reduce((s, c) => s + c.l, 0) / grid.length;
});
const minL = Math.min(...allAvgL);
const maxL = Math.max(...allAvgL);
console.log();
console.log('Luminance range across emojis:', minL.toFixed(3), '-', maxL.toFixed(3));

// Group by luminance to see distribution
const bins = {};
for (const l of allAvgL) {
  const bin = Math.floor(l * 10) / 10;
  bins[bin] = (bins[bin] || 0) + 1;
}
console.log('Luminance distribution:');
for (const b of Object.keys(bins).sort((a, b) => a - b)) {
  console.log(`  ${b}: ${'█'.repeat(Math.ceil(bins[b] / 20))} (${bins[b]})`);
}
