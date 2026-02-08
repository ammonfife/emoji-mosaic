#!/usr/bin/env node
/**
 * Sample blocks using the NEW direct downsampling method
 */
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function main() {
  const imagePath = process.argv[2] || '/tmp/test-baby.jpg';
  const numSamples = parseInt(process.argv[3]) || 8;
  
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
  
  // NEW: Extract grid via direct downsampling
  function extractGridDirect(sourceCanvas, x, y, blockW, blockH, bgColor) {
    // Create small canvas at grid size
    const smallCanvas = createCanvas(gridSize, gridSize);
    const smallCtx = smallCanvas.getContext('2d');
    
    // Fill with background
    smallCtx.fillStyle = `rgb(${bgColor.r * 255}, ${bgColor.g * 255}, ${bgColor.b * 255})`;
    smallCtx.fillRect(0, 0, gridSize, gridSize);
    
    // Enable smooth downsampling
    smallCtx.imageSmoothingEnabled = true;
    smallCtx.imageSmoothingQuality = 'high';
    
    // Draw source block directly onto small canvas
    smallCtx.drawImage(sourceCanvas, x, y, blockW, blockH, 0, 0, gridSize, gridSize);
    
    // Read NxN pixels directly
    const smallData = smallCtx.getImageData(0, 0, gridSize, gridSize).data;
    const grid = new Float32Array(cellCount * 5);
    
    for (let i = 0; i < cellCount; i++) {
      const idx = i * 4;
      const r = smallData[idx] / 255;
      const g = smallData[idx + 1] / 255;
      const b = smallData[idx + 2] / 255;
      const a = smallData[idx + 3] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      
      grid[i * 5 + 0] = r;
      grid[i * 5 + 1] = g;
      grid[i * 5 + 2] = b;
      grid[i * 5 + 3] = l;
      grid[i * 5 + 4] = a;
    }
    
    return grid;
  }
  
  // Load image
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  console.log(`Image: ${imagePath} (${img.width}x${img.height})`);
  console.log(`Sampling ${numSamples} blocks with DIRECT 8x8 downsampling:\n`);
  
  const bgColor = { r: 1, g: 1, b: 1 };
  const blockSize = 64;
  
  for (let s = 0; s < numSamples; s++) {
    const x = Math.floor(Math.random() * (img.width - blockSize));
    const y = Math.floor(Math.random() * (img.height - blockSize));
    
    const grid = extractGridDirect(canvas, x, y, blockSize, blockSize, bgColor);
    const match = findBestMatch(grid, 'white');
    
    // Visualize as ASCII
    let viz = '';
    for (let gy = 0; gy < gridSize; gy++) {
      let row = '  ';
      for (let gx = 0; gx < gridSize; gx++) {
        const i = (gy * gridSize + gx) * 5;
        const l = grid[i + 3];
        const chars = ' ░▒▓█';
        const ci = Math.min(4, Math.floor((1 - l) * 5));
        row += chars[ci];
      }
      viz += row + '\n';
    }
    
    // Average color
    let avgR = 0, avgG = 0, avgB = 0;
    for (let i = 0; i < cellCount; i++) {
      avgR += grid[i * 5 + 0];
      avgG += grid[i * 5 + 1];
      avgB += grid[i * 5 + 2];
    }
    avgR /= cellCount; avgG /= cellCount; avgB /= cellCount;
    
    console.log(`Block ${s + 1} @ (${x}, ${y}):`);
    console.log(viz);
    console.log(`  Avg RGB: (${(avgR*255).toFixed(0)}, ${(avgG*255).toFixed(0)}, ${(avgB*255).toFixed(0)})`);
    console.log(`  Match: ${match.emoji} (dist: ${match.distance.toFixed(2)})\n`);
  }
}

main().catch(console.error);
