#!/usr/bin/env node
const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');

async function test() {
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
  
  function extractGrid(imageData, x, y, blockWidth, blockHeight, bgColor) {
    const { data, width } = imageData;
    const cellW = blockWidth / gridSize;
    const cellH = blockHeight / gridSize;
    
    const grid = new Float32Array(cellCount * 5);
    
    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const cellX = Math.floor(x + gx * cellW);
        const cellY = Math.floor(y + gy * cellH);
        const cw = Math.floor(cellW);
        const ch = Math.floor(cellH);
        
        let r = 0, g = 0, b = 0, a = 0;
        let count = 0;
        
        for (let py = 0; py < ch; py++) {
          for (let px = 0; px < cw; px++) {
            const idx = ((cellY + py) * width + (cellX + px)) * 4;
            const alpha = data[idx + 3] / 255;
            
            r += data[idx] / 255 * alpha + bgColor.r * (1 - alpha);
            g += data[idx + 1] / 255 * alpha + bgColor.g * (1 - alpha);
            b += data[idx + 2] / 255 * alpha + bgColor.b * (1 - alpha);
            a += alpha;
            count++;
          }
        }
        
        if (count > 0) { r /= count; g /= count; b /= count; a /= count; }
        
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        const idx = (gy * gridSize + gx) * 5;
        grid[idx + 0] = r;
        grid[idx + 1] = g;
        grid[idx + 2] = b;
        grid[idx + 3] = l;
        grid[idx + 4] = a;
      }
    }
    return grid;
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
  
  // Test with real images
  const testImages = [
    '/tmp/test-red.png',
    '/tmp/test-green.png',
    '/tmp/test-blue.png'
  ];
  
  const bgColor = { r: 1, g: 1, b: 1 }; // white
  
  for (const imgPath of testImages) {
    try {
      const img = await loadImage(imgPath);
      const canvas = createCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      // Extract a grid from the center
      const grid = extractGrid(imageData, 0, 0, img.width, img.height, bgColor);
      
      // Show extracted values
      console.log(`\n${imgPath}:`);
      console.log('  Extracted RGB:', grid[0].toFixed(3), grid[1].toFixed(3), grid[2].toFixed(3));
      
      const match = findBestMatch(grid, 'white');
      console.log('  Best match:', match.emoji, '(dist:', match.distance.toFixed(4) + ')');
    } catch (e) {
      console.log(`${imgPath}: Error - ${e.message}`);
    }
  }
}

test().catch(console.error);
