#!/usr/bin/env node
/**
 * Randomly sample 8x8 blocks from an image and show matching emoji
 */
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function main() {
  const imagePath = process.argv[2] || '/tmp/test-red.png';
  const numSamples = parseInt(process.argv[3]) || 10;
  
  // Load emoji features
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
  
  // Load image
  const img = await loadImage(imagePath);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const { data: pixels, width, height } = imageData;
  
  console.log(`Image: ${imagePath} (${width}x${height})`);
  console.log(`Sampling ${numSamples} random ${gridSize}x${gridSize} blocks:\n`);
  
  const bgColor = { r: 1, g: 1, b: 1 }; // white
  
  for (let s = 0; s < numSamples; s++) {
    // Random position (ensure block fits)
    const blockSize = 64; // pixels per block to sample
    const x = Math.floor(Math.random() * (width - blockSize));
    const y = Math.floor(Math.random() * (height - blockSize));
    
    // Extract grid
    const cellW = blockSize / gridSize;
    const cellH = blockSize / gridSize;
    const grid = new Float32Array(cellCount * 5);
    
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const cellX = Math.floor(x + gx * cellW);
        const cellY = Math.floor(y + gy * cellH);
        const cw = Math.floor(cellW);
        const ch = Math.floor(cellH);
        
        let r = 0, g = 0, b = 0, a = 0, count = 0;
        
        for (let py = 0; py < ch; py++) {
          for (let px = 0; px < cw; px++) {
            const idx = ((cellY + py) * width + (cellX + px)) * 4;
            const alpha = pixels[idx + 3] / 255;
            r += pixels[idx] / 255 * alpha + bgColor.r * (1 - alpha);
            g += pixels[idx + 1] / 255 * alpha + bgColor.g * (1 - alpha);
            b += pixels[idx + 2] / 255 * alpha + bgColor.b * (1 - alpha);
            a += alpha;
            count++;
          }
        }
        
        if (count > 0) { r /= count; g /= count; b /= count; a /= count; }
        
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const i = (gy * gridSize + gx) * 5;
        grid[i + 0] = r;
        grid[i + 1] = g;
        grid[i + 2] = b;
        grid[i + 3] = l;
        grid[i + 4] = a;
      }
    }
    
    // Get match
    const match = findBestMatch(grid, 'white');
    
    // Show grid visualization (8x8 luminance as ASCII)
    let viz = '';
    for (let gy = 0; gy < gridSize; gy++) {
      let row = '  ';
      for (let gx = 0; gx < gridSize; gx++) {
        const i = (gy * gridSize + gx) * 5;
        const l = grid[i + 3];
        // Map luminance to character
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
