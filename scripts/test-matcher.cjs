#!/usr/bin/env node
const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/emoji-features.json'));

const gridSize = data.gridSize;
const cellCount = gridSize * gridSize;

// Pre-flatten grids (same as matcher.js)
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

function findBestMatch(sourceGrid, background, mode = 'color') {
  const emojiGrids = grids[background];
  
  let bestIdx = 0;
  let bestDist = Infinity;
  
  for (let i = 0; i < emojiGrids.length; i++) {
    const emojiGrid = emojiGrids[i];
    let dist = 0;
    
    if (mode === 'color') {
      for (let c = 0; c < cellCount; c++) {
        const si = c * 5;
        const sr = sourceGrid[si], sg = sourceGrid[si + 1], sb = sourceGrid[si + 2];
        const sa = sourceGrid[si + 4];
        const er = emojiGrid[si], eg = emojiGrid[si + 1], eb = emojiGrid[si + 2];
        const ea = emojiGrid[si + 4];
        
        const colorDist = (sr - er) ** 2 + (sg - eg) ** 2 + (sb - sb) ** 2;
        const alphaDist = (sa - ea) ** 2;
        
        dist += (colorDist + alphaDist * 0.3) * (0.5 + sa * 0.5);
      }
    }
    
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = i;
    }
  }
  
  return {
    emoji: data.emojis[bestIdx].c,
    distance: bestDist,
    index: bestIdx
  };
}

// Test with various uniform colors
const testCases = [
  { name: 'white', r: 1, g: 1, b: 1, a: 1 },
  { name: 'black', r: 0, g: 0, b: 0, a: 1 },
  { name: 'red', r: 1, g: 0, b: 0, a: 1 },
  { name: 'green', r: 0, g: 1, b: 0, a: 1 },
  { name: 'blue', r: 0, g: 0, b: 1, a: 1 },
  { name: 'yellow', r: 1, g: 1, b: 0, a: 1 },
  { name: 'gray', r: 0.5, g: 0.5, b: 0.5, a: 1 },
];

console.log('Testing matcher with uniform color grids:\n');

for (const tc of testCases) {
  // Create uniform grid
  const grid = new Float32Array(cellCount * 5);
  const l = 0.299 * tc.r + 0.587 * tc.g + 0.114 * tc.b;
  for (let i = 0; i < cellCount; i++) {
    grid[i * 5 + 0] = tc.r;
    grid[i * 5 + 1] = tc.g;
    grid[i * 5 + 2] = tc.b;
    grid[i * 5 + 3] = l;
    grid[i * 5 + 4] = tc.a;
  }
  
  const match = findBestMatch(grid, 'white', 'color');
  console.log(`${tc.name.padEnd(10)} → ${match.emoji} (dist: ${match.distance.toFixed(4)})`);
}

// Also check what wavy dash would match on white bg
console.log('\n--- Checking wavy dash distance ---');
const wavyIdx = data.emojis.findIndex(e => e.c === '〰');
if (wavyIdx >= 0) {
  console.log('Wavy dash is at index:', wavyIdx);
  const wavyGrid = grids.white[wavyIdx];
  console.log('Wavy grid first 20 values:', Array.from(wavyGrid.slice(0, 20)).map(v => v.toFixed(2)));
}
