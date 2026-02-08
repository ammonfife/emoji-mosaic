#!/usr/bin/env node
/**
 * Test that structural matching actually uses pattern, not just average color
 */
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/emoji-features.json'));

const gridSize = data.gridSize;
const cellCount = gridSize * gridSize;

// Pre-flatten grids
const grids = {};
for (const bg of data.backgrounds) {
  grids[bg] = data.emojis.map(e => {
    const grid = e.g[bg];
    const flat = new Float32Array(cellCount * 5);
    for (let i = 0; i < cellCount; i++) {
      flat[i * 5 + 0] = grid[i].r;
      flat[i * 5 + 1] = grid[i].g;
      flat[i * 5 + 2] = grid[i].b;
      flat[i * 5 + 3] = grid[i].l;
      flat[i * 5 + 4] = grid[i].a;
    }
    return flat;
  });
}

function findBestMatch(sourceGrid, background) {
  const emojiGrids = grids[background];
  let bestIdx = 0;
  let bestDist = Infinity;
  
  for (let i = 0; i < emojiGrids.length; i++) {
    const emojiGrid = emojiGrids[i];
    let dist = 0;
    
    for (let c = 0; c < cellCount; c++) {
      const si = c * 5;
      const sr = sourceGrid[si], sg = sourceGrid[si + 1], sb = sourceGrid[si + 2];
      const sa = sourceGrid[si + 4];
      const er = emojiGrid[si], eg = emojiGrid[si + 1], eb = emojiGrid[si + 2];
      const ea = emojiGrid[si + 4];
      
      const colorDist = (sr - er) ** 2 + (sg - eg) ** 2 + (sb - eb) ** 2;
      const alphaDist = (sa - ea) ** 2;
      dist += (colorDist + alphaDist * 0.3) * (0.5 + sa * 0.5);
    }
    
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  
  return { emoji: data.emojis[bestIdx].c, distance: bestDist, index: bestIdx };
}

// Create test patterns with SAME average color but DIFFERENT structure
function createUniformGray() {
  const grid = new Float32Array(cellCount * 5);
  for (let i = 0; i < cellCount; i++) {
    grid[i * 5 + 0] = 0.5; // r
    grid[i * 5 + 1] = 0.5; // g
    grid[i * 5 + 2] = 0.5; // b
    grid[i * 5 + 3] = 0.5; // l
    grid[i * 5 + 4] = 1.0; // a
  }
  return grid;
}

function createCheckerboard() {
  // Same average (0.5) but alternating black/white
  const grid = new Float32Array(cellCount * 5);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const i = y * gridSize + x;
      const isWhite = (x + y) % 2 === 0;
      const v = isWhite ? 1.0 : 0.0;
      grid[i * 5 + 0] = v;
      grid[i * 5 + 1] = v;
      grid[i * 5 + 2] = v;
      grid[i * 5 + 3] = v;
      grid[i * 5 + 4] = 1.0;
    }
  }
  return grid;
}

function createTopHeavy() {
  // Dark bottom, light top - same average
  const grid = new Float32Array(cellCount * 5);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const i = y * gridSize + x;
      const v = y < gridSize / 2 ? 1.0 : 0.0; // top white, bottom black
      grid[i * 5 + 0] = v;
      grid[i * 5 + 1] = v;
      grid[i * 5 + 2] = v;
      grid[i * 5 + 3] = v;
      grid[i * 5 + 4] = 1.0;
    }
  }
  return grid;
}

function createLeftHeavy() {
  // Light left, dark right - same average
  const grid = new Float32Array(cellCount * 5);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const i = y * gridSize + x;
      const v = x < gridSize / 2 ? 1.0 : 0.0;
      grid[i * 5 + 0] = v;
      grid[i * 5 + 1] = v;
      grid[i * 5 + 2] = v;
      grid[i * 5 + 3] = v;
      grid[i * 5 + 4] = 1.0;
    }
  }
  return grid;
}

console.log('Testing structural matching - all patterns have same average color (gray 0.5):\n');

const tests = [
  { name: 'Uniform gray', grid: createUniformGray() },
  { name: 'Checkerboard', grid: createCheckerboard() },
  { name: 'Top light/Bottom dark', grid: createTopHeavy() },
  { name: 'Left light/Right dark', grid: createLeftHeavy() },
];

for (const test of tests) {
  const match = findBestMatch(test.grid, 'white');
  console.log(`${test.name.padEnd(25)} → ${match.emoji} (dist: ${match.distance.toFixed(2)})`);
}

// If structural matching works, these should all return DIFFERENT emojis
// If it's just average color, they'd return the same emoji
console.log('\n✓ If all 4 patterns return DIFFERENT emojis, structural matching works');
console.log('✗ If all 4 return the SAME emoji, it\'s just average color matching');
