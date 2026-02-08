/**
 * Compare 3×3 vs 4×4 grid texture capture
 * 
 * Measures:
 * 1. Internal variance per emoji (how much texture is captured)
 * 2. Inter-emoji discrimination (how different emojis look from each other)
 * 3. Storage cost
 */

import { createCanvas, loadImage } from 'canvas';
import { parse as parseEmoji } from 'twemoji-parser';
import os from 'os';

const CONFIG = {
  emojiSize: 64,
  sampleSize: 200,  // Sample emojis for quick comparison
  concurrency: os.cpus().length * 2,
};

// Sample emojis across categories
const SAMPLE_EMOJIS = [
  '😀', '😂', '🥰', '😎', '🤔', '😴', '🤮', '👻',  // Faces
  '❤️', '💙', '💚', '🖤', '💔', '💕',              // Hearts
  '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⬛', '⬜',  // Shapes
  '🐶', '🐱', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵',  // Animals
  '🍎', '🍊', '🍋', '🍇', '🍉', '🍕', '🍔', '🍟',  // Food
  '⚽', '🏀', '🎾', '🎱', '🎯', '🎮', '🎸', '🎺',  // Activities
  '🚗', '✈️', '🚀', '🏠', '🏰', '⛰️', '🌈', '☀️',  // Travel/Places
  '💡', '🔧', '💎', '🔔', '📱', '💻', '⌚', '📷',  // Objects
  '✅', '❌', '⚠️', '🚫', '♻️', '⭐', '🔥', '💯',  // Symbols
  '🏳️‍🌈', '🇺🇸', '🇬🇧', '🇯🇵',                    // Flags
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 1, g: 1, b: 1 };
}

function extractGrid(ctx, size, gridSize, bgColor) {
  const cellSize = size / gridSize;
  const grid = [];
  const bg = hexToRgb(bgColor);
  
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const x = Math.floor(gx * cellSize);
      const y = Math.floor(gy * cellSize);
      const w = Math.ceil(cellSize);
      const h = Math.ceil(cellSize);
      
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
      
      grid.push({
        r: r / pixelCount,
        g: g / pixelCount,
        b: b / pixelCount,
        a: a / pixelCount
      });
    }
  }
  
  return grid;
}

async function loadEmoji(char) {
  const parsed = parseEmoji(char);
  if (!parsed.length) return null;
  
  const url = parsed[0].url.replace('/svg/', '/72x72/').replace('.svg', '.png');
  try {
    return await loadImage(url);
  } catch {
    return null;
  }
}

function computeInternalVariance(grid) {
  // How much color varies within the emoji (texture richness)
  const n = grid.length;
  
  // Compute mean
  let mr = 0, mg = 0, mb = 0;
  for (const c of grid) {
    mr += c.r; mg += c.g; mb += c.b;
  }
  mr /= n; mg /= n; mb /= n;
  
  // Compute variance
  let variance = 0;
  for (const c of grid) {
    variance += (c.r - mr) ** 2 + (c.g - mg) ** 2 + (c.b - mb) ** 2;
  }
  
  return variance / n;
}

function computeGridDistance(g1, g2) {
  let dist = 0;
  for (let i = 0; i < g1.length; i++) {
    dist += (g1[i].r - g2[i].r) ** 2;
    dist += (g1[i].g - g2[i].g) ** 2;
    dist += (g1[i].b - g2[i].b) ** 2;
  }
  return Math.sqrt(dist);
}

async function main() {
  console.log('📊 Grid Size Comparison: 5×5 vs 8×8 vs 16×16\n');
  
  const grids = { 5: [], 8: [], 16: [] };
  const emojisLoaded = [];
  
  console.log('Loading sample emojis...');
  
  for (const char of SAMPLE_EMOJIS) {
    const img = await loadEmoji(char);
    if (!img) continue;
    
    const canvas = createCanvas(CONFIG.emojiSize, CONFIG.emojiSize);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, CONFIG.emojiSize, CONFIG.emojiSize);
    ctx.drawImage(img, 0, 0, CONFIG.emojiSize, CONFIG.emojiSize);
    
    for (const size of [5, 8, 16]) {
      grids[size].push(extractGrid(ctx, CONFIG.emojiSize, size, '#FFFFFF'));
    }
    emojisLoaded.push(char);
  }
  
  console.log(`Loaded ${emojisLoaded.length} emojis\n`);
  
  // Analyze each grid size
  for (const size of [5, 8, 16]) {
    console.log(`\n═══ ${size}×${size} Grid (${size * size} cells) ═══`);
    
    const gridData = grids[size];
    
    // 1. Internal variance (texture capture)
    const variances = gridData.map(computeInternalVariance);
    const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
    const maxVariance = Math.max(...variances);
    
    console.log(`\n📐 Internal Variance (texture richness):`);
    console.log(`   Average: ${avgVariance.toFixed(4)}`);
    console.log(`   Maximum: ${maxVariance.toFixed(4)}`);
    
    // 2. Inter-emoji discrimination
    let totalDist = 0;
    let minDist = Infinity;
    let pairs = 0;
    
    for (let i = 0; i < gridData.length; i++) {
      for (let j = i + 1; j < gridData.length; j++) {
        const dist = computeGridDistance(gridData[i], gridData[j]);
        totalDist += dist;
        minDist = Math.min(minDist, dist);
        pairs++;
      }
    }
    
    const avgDist = totalDist / pairs;
    
    console.log(`\n🎯 Inter-emoji Discrimination:`);
    console.log(`   Avg distance: ${avgDist.toFixed(4)}`);
    console.log(`   Min distance: ${minDist.toFixed(4)} (collision risk)`);
    console.log(`   Discrimination ratio: ${(avgDist / minDist).toFixed(2)}x`);
    
    // 3. Storage cost
    const floatsPerEmoji = size * size * 5;  // RGBLA
    const bytesPerEmoji = floatsPerEmoji * 4;
    const totalFor1274 = bytesPerEmoji * 1274 * 23 / 1024 / 1024;
    
    console.log(`\n💾 Storage (1274 emojis × 23 backgrounds):`);
    console.log(`   Floats/emoji: ${floatsPerEmoji}`);
    console.log(`   Estimated: ${totalFor1274.toFixed(1)} MB raw`);
  }
  
  // Summary recommendation
  console.log(`\n\n════════════════════════════════════════`);
  console.log(`📋 RECOMMENDATION`);
  console.log(`════════════════════════════════════════\n`);
  
  const v5 = grids[5].map(computeInternalVariance).reduce((a,b) => a+b, 0) / grids[5].length;
  const v8 = grids[8].map(computeInternalVariance).reduce((a,b) => a+b, 0) / grids[8].length;
  const v16 = grids[16].map(computeInternalVariance).reduce((a,b) => a+b, 0) / grids[16].length;
  
  console.log(`Texture capture gain:`);
  console.log(`   5×5 → 8×8:   +${((v8/v5 - 1) * 100).toFixed(0)}% variance`);
  console.log(`   8×8 → 16×16: +${((v16/v8 - 1) * 100).toFixed(0)}% variance`);
  
  console.log(`\nStorage cost (1274 emojis × 23 bg):`);
  console.log(`   5×5:  ${5*5*5} floats → ~${(5*5*5*4*1274*23/1024/1024).toFixed(0)} MB`);
  console.log(`   8×8:  ${8*8*5} floats → ~${(8*8*5*4*1274*23/1024/1024).toFixed(0)} MB`);
  console.log(`   16×16: ${16*16*5} floats → ~${(16*16*5*4*1274*23/1024/1024).toFixed(0)} MB`);
  
  console.log(`\n💡 Effective resolution at 30 emoji width:`);
  console.log(`   5×5:  30×5  = 150 pseudo-pixels`);
  console.log(`   8×8:  30×8  = 240 pseudo-pixels`);
  console.log(`   16×16: 30×16 = 480 pseudo-pixels`);
}

main().catch(console.error);
