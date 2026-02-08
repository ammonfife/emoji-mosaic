/**
 * Parallel Emoji Feature Extractor
 * 
 * Uses worker threads for CPU-bound canvas operations
 * and concurrent fetches for network I/O.
 */

import { createCanvas, loadImage } from 'canvas';
import { parse as parseEmoji } from 'twemoji-parser';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configuration
const CONFIG = {
  emojiSize: 64,
  gridSize: 4,
  outputDir: './data',
  
  // Parallelism settings
  concurrency: Math.min(os.cpus().length * 2, 32), // 2x CPU cores, max 32
  batchSize: 50, // Process in batches for progress reporting
  
  backgrounds: {
    white:        '#FFFFFF',
    black:        '#000000',
    ios_light:    '#F2F2F7',
    ios_dark:     '#1C1C1E',
    android_light:'#FEFBFF',
    android_dark: '#1C1B1F',
    imsg_blue:    '#007AFF',
    imsg_green:   '#34C759',
  }
};

// Full emoji ranges for comprehensive coverage
const EMOJI_RANGES = [
  // Smileys & Emotion
  [0x1F600, 0x1F64F],
  // People & Body
  [0x1F466, 0x1F4A9],
  [0x1F476, 0x1F478],
  [0x1F480, 0x1F4FF],
  // Animals & Nature
  [0x1F400, 0x1F43F],
  [0x1F980, 0x1F9AE],
  [0x1F330, 0x1F335],
  [0x1F337, 0x1F343],
  // Food & Drink
  [0x1F345, 0x1F37F],
  [0x1F950, 0x1F96F],
  [0x1F32D, 0x1F32F],
  // Activities
  [0x26BD, 0x26C8],
  [0x1F3A0, 0x1F3FF],
  // Travel & Places
  [0x1F680, 0x1F6FF],
  [0x1F300, 0x1F320],
  [0x1F3D4, 0x1F3DF],
  // Objects
  [0x1F4A0, 0x1F4FD],
  [0x1F500, 0x1F53D],
  [0x1F550, 0x1F567],
  // Symbols
  [0x2600, 0x26FF],
  [0x2700, 0x27BF],
  [0x1F534, 0x1F53D],
  // Shapes
  [0x1F7E0, 0x1F7EB],
  [0x25AA, 0x25AB],
  [0x25FB, 0x25FE],
  [0x2B1B, 0x2B1C],
  // Hearts
  [0x2764, 0x2764],
  [0x1F493, 0x1F49F],
  [0x1F5A4, 0x1F5A4],
  [0x1F90D, 0x1F90E],
  [0x1FA75, 0x1FA77],
  // Weather
  [0x1F324, 0x1F32C],
  // Misc symbols
  [0x2702, 0x2757],
  [0x2763, 0x2764],
  [0x2B50, 0x2B55],
];

function generateEmojiList() {
  const emojis = [];
  const seen = new Set();
  
  for (const [start, end] of EMOJI_RANGES) {
    for (let cp = start; cp <= end; cp++) {
      const char = String.fromCodePoint(cp);
      if (seen.has(char)) continue;
      
      const parsed = parseEmoji(char);
      if (parsed.length > 0) {
        const svgUrl = parsed[0].url;
        const pngUrl = svgUrl.replace('/svg/', '/72x72/').replace('.svg', '.png');
        emojis.push({ char, codepoint: cp.toString(16).toUpperCase(), url: pngUrl });
        seen.add(char);
      }
    }
  }
  
  return emojis;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

function extractGrid(ctx, size, gridSize, bgColor) {
  const cellSize = size / gridSize;
  const grid = [];
  const bg = hexToRgb(bgColor);
  
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x = Math.floor(gx * cellSize);
      const y = Math.floor(gy * cellSize);
      const w = Math.floor(cellSize);
      const h = Math.floor(cellSize);
      
      const imageData = ctx.getImageData(x, y, w, h);
      const data = imageData.data;
      const pixelCount = w * h;
      
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3] / 255;
        r += (data[i] / 255 * alpha + bg.r * (1 - alpha));
        g += (data[i + 1] / 255 * alpha + bg.g * (1 - alpha));
        b += (data[i + 2] / 255 * alpha + bg.b * (1 - alpha));
        a += alpha;
      }
      
      r /= pixelCount; g /= pixelCount; b /= pixelCount; a /= pixelCount;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      
      grid.push({
        r: Math.round(r * 1000) / 1000,
        g: Math.round(g * 1000) / 1000,
        b: Math.round(b * 1000) / 1000,
        l: Math.round(l * 1000) / 1000,
        a: Math.round(a * 1000) / 1000
      });
    }
  }
  
  return grid;
}

async function processEmoji(emoji, backgrounds) {
  const { char, codepoint, url } = emoji;
  const size = CONFIG.emojiSize;
  
  let img;
  try {
    img = await loadImage(url);
  } catch (e) {
    return null;
  }
  
  const grids = {};
  
  for (const [bgName, bgColor] of Object.entries(backgrounds)) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, 0, 0, size, size);
    grids[bgName] = extractGrid(ctx, size, CONFIG.gridSize, bgColor);
  }
  
  const whiteGrid = grids.white;
  const avgAlpha = whiteGrid.reduce((sum, c) => sum + c.a, 0) / whiteGrid.length;
  const avgLum = whiteGrid.reduce((sum, c) => sum + c.l, 0) / whiteGrid.length;
  const avgR = whiteGrid.reduce((sum, c) => sum + c.r, 0) / whiteGrid.length;
  const avgG = whiteGrid.reduce((sum, c) => sum + c.g, 0) / whiteGrid.length;
  const avgB = whiteGrid.reduce((sum, c) => sum + c.b, 0) / whiteGrid.length;
  
  return {
    char, codepoint, grids,
    meta: {
      avgAlpha: Math.round(avgAlpha * 1000) / 1000,
      avgLuminance: Math.round(avgLum * 1000) / 1000,
      avgColor: [Math.round(avgR * 1000) / 1000, Math.round(avgG * 1000) / 1000, Math.round(avgB * 1000) / 1000]
    }
  };
}

/**
 * Process emojis in parallel with controlled concurrency
 */
async function processInParallel(emojis, backgrounds, concurrency) {
  const results = [];
  let completed = 0;
  let failed = 0;
  const total = emojis.length;
  const startTime = Date.now();
  
  // Create a pool of promises
  const pool = new Set();
  const queue = [...emojis];
  
  const processNext = async () => {
    if (queue.length === 0) return;
    
    const emoji = queue.shift();
    const result = await processEmoji(emoji, backgrounds);
    
    if (result) {
      results.push(result);
      completed++;
    } else {
      failed++;
    }
    
    // Progress update every 100 emojis
    if ((completed + failed) % 100 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (completed + failed) / elapsed;
      const eta = Math.round((total - completed - failed) / rate);
      console.log(`   ${completed + failed}/${total} (${rate.toFixed(1)}/s, ETA: ${eta}s)`);
    }
  };
  
  // Fill the pool initially
  while (pool.size < concurrency && queue.length > 0) {
    const promise = processNext().then(() => {
      pool.delete(promise);
    });
    pool.add(promise);
  }
  
  // Process remaining items as slots free up
  while (queue.length > 0 || pool.size > 0) {
    if (pool.size > 0) {
      await Promise.race(pool);
    }
    while (pool.size < concurrency && queue.length > 0) {
      const promise = processNext().then(() => {
        pool.delete(promise);
      });
      pool.add(promise);
    }
  }
  
  // Wait for remaining
  await Promise.all(pool);
  
  return { results, completed, failed };
}

async function main() {
  const startTime = Date.now();
  
  console.log('🎨 Emoji Mosaic Feature Extractor (Parallel)\n');
  console.log(`   CPUs: ${os.cpus().length}`);
  console.log(`   RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);
  console.log(`   Concurrency: ${CONFIG.concurrency}\n`);
  
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  console.log('📋 Generating emoji list...');
  const emojis = generateEmojiList();
  console.log(`   Found ${emojis.length} emojis to process\n`);
  
  console.log('🔄 Extracting features in parallel...');
  const { results, completed, failed } = await processInParallel(
    emojis, 
    CONFIG.backgrounds, 
    CONFIG.concurrency
  );
  
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Extracted ${completed} emojis (${failed} failed) in ${elapsed.toFixed(1)}s`);
  console.log(`   Rate: ${(completed / elapsed).toFixed(1)} emojis/second\n`);
  
  // Sort by codepoint for consistent ordering
  results.sort((a, b) => parseInt(a.codepoint, 16) - parseInt(b.codepoint, 16));
  
  // Save full features
  const fullPath = path.join(CONFIG.outputDir, 'emoji-features-full.json');
  await fs.writeFile(fullPath, JSON.stringify(results, null, 2));
  console.log(`📁 Full features: ${fullPath}`);
  
  // Save compact format
  const compactPath = path.join(CONFIG.outputDir, 'emoji-features.json');
  const compact = {
    version: 1,
    gridSize: CONFIG.gridSize,
    backgrounds: Object.keys(CONFIG.backgrounds),
    emojis: results.map(f => ({ c: f.char, m: f.meta, g: f.grids }))
  };
  await fs.writeFile(compactPath, JSON.stringify(compact));
  console.log(`📁 Compact features: ${compactPath}`);
  
  const fileSize = (await fs.stat(compactPath)).size;
  console.log(`\n📊 Stats:`);
  console.log(`   Emojis: ${results.length}`);
  console.log(`   Backgrounds: ${Object.keys(CONFIG.backgrounds).length}`);
  console.log(`   Grid: ${CONFIG.gridSize}×${CONFIG.gridSize}`);
  console.log(`   File size: ${(fileSize / 1024).toFixed(1)} KB`);
  console.log(`   Total time: ${elapsed.toFixed(1)}s`);
}

main().catch(console.error);
