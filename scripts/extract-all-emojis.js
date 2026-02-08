/**
 * Extract ALL Emojis (~3,900) with Extended Backgrounds
 * 
 * Parallel processing with full Unicode emoji coverage.
 */

import { createCanvas, loadImage } from 'canvas';
import { parse as parseEmoji } from 'twemoji-parser';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG = {
  emojiSize: 64,
  gridSize: 8,  // 8×8 for better texture capture
  outputDir: './data',
  concurrency: Math.min(os.cpus().length * 4, 48), // More aggressive parallelism
  
  // Extended backgrounds
  backgrounds: {
    // Basics
    white:          '#FFFFFF',
    black:          '#000000',
    
    // iOS
    ios_light:      '#F2F2F7',
    ios_dark:       '#1C1C1E',
    
    // Android
    android_light:  '#FEFBFF',
    android_dark:   '#1C1B1F',
    
    // iMessage bubbles
    imsg_blue:      '#007AFF',
    imsg_green:     '#34C759',
    
    // Discord
    discord_dark:   '#313338',
    discord_light:  '#FFFFFF',
    discord_blurple:'#5865F2',
    
    // WhatsApp
    whatsapp_light: '#DCF8C6',
    whatsapp_dark:  '#005C4B',
    whatsapp_bg:    '#0B141A',
    
    // Slack
    slack_light:    '#FFFFFF',
    slack_dark:     '#1A1D21',
    slack_purple:   '#4A154B',
    
    // Telegram
    telegram_light: '#FFFFFF',
    telegram_dark:  '#212121',
    telegram_blue:  '#2AABEE',
    
    // Twitter/X
    twitter_light:  '#FFFFFF',
    twitter_dark:   '#15202B',
    twitter_blue:   '#1DA1F2',
  }
};

// FULL Unicode emoji ranges
const EMOJI_RANGES = [
  // Emoticons & Smileys
  [0x1F600, 0x1F64F],
  [0x1F910, 0x1F9FF],
  
  // People & Body
  [0x1F466, 0x1F4FF],
  [0x1F90C, 0x1F93A],
  [0x1F93C, 0x1F945],
  [0x1F947, 0x1F9FF],
  
  // Animals & Nature
  [0x1F400, 0x1F43F],
  [0x1F980, 0x1F9AE],
  [0x1F330, 0x1F343],
  [0x1FAB0, 0x1FAB6],
  
  // Food & Drink
  [0x1F345, 0x1F37F],
  [0x1F950, 0x1F96F],
  [0x1F32D, 0x1F32F],
  [0x1FAD0, 0x1FAD9],
  
  // Travel & Places
  [0x1F680, 0x1F6FF],
  [0x1F300, 0x1F321],
  [0x1F324, 0x1F32C],
  [0x1F3D4, 0x1F3DF],
  [0x1F3E0, 0x1F3F0],
  
  // Activities
  [0x1F3A0, 0x1F3CA],
  [0x1F3CB, 0x1F3CE],
  [0x1F3CF, 0x1F3D3],
  
  // Objects
  [0x1F4A0, 0x1F4FD],
  [0x1F500, 0x1F53D],
  [0x1F550, 0x1F567],
  [0x1F5A4, 0x1F5A8],
  [0x1F5B1, 0x1F5B2],
  [0x1F5BC, 0x1F5BC],
  [0x1F5C2, 0x1F5C4],
  [0x1F5D1, 0x1F5D3],
  [0x1F5DC, 0x1F5DE],
  [0x1F5E1, 0x1F5E3],
  [0x1F5EF, 0x1F5F3],
  [0x1F5FA, 0x1F5FF],
  
  // Symbols
  [0x2600, 0x26FF],
  [0x2700, 0x27BF],
  [0x1F534, 0x1F53D],
  
  // Shapes
  [0x1F7E0, 0x1F7EB],
  [0x25AA, 0x25AB],
  [0x25B6, 0x25B6],
  [0x25C0, 0x25C0],
  [0x25FB, 0x25FE],
  [0x2B1B, 0x2B1C],
  [0x2B50, 0x2B55],
  
  // Hearts & Love
  [0x2764, 0x2764],
  [0x1F493, 0x1F49F],
  [0x1F5A4, 0x1F5A4],
  [0x1F90D, 0x1F90E],
  [0x1FA75, 0x1FA77],
  [0x2763, 0x2764],
  
  // Hands & Gestures
  [0x1F44A, 0x1F44F],
  [0x1F450, 0x1F465],
  [0x1F91A, 0x1F91F],
  [0x1F932, 0x1F932],
  
  // Flags (regional indicators make flags)
  [0x1F1E0, 0x1F1FF],
  [0x1F3C1, 0x1F3C1],
  [0x1F3F3, 0x1F3F4],
  [0x1F38C, 0x1F38C],
  
  // Zodiac
  [0x2648, 0x2653],
  
  // Arrows
  [0x2194, 0x21AA],
  [0x27A1, 0x27A1],
  [0x2934, 0x2935],
  
  // Music & Media
  [0x1F3B5, 0x1F3B6],
  [0x1F3BC, 0x1F3BC],
  [0x1F4FB, 0x1F4FD],
  
  // Office & Stationery
  [0x1F4C0, 0x1F4D9],
  [0x1F4DA, 0x1F4F2],
  
  // Clock faces
  [0x1F550, 0x1F567],
  
  // Transport
  [0x1F680, 0x1F6C5],
  [0x1F6D0, 0x1F6D2],
  [0x1F6D5, 0x1F6D7],
  [0x1F6E0, 0x1F6EC],
  [0x1F6F0, 0x1F6FC],
  
  // Warning signs
  [0x26A0, 0x26A1],
  [0x26D4, 0x26D4],
  [0x2622, 0x2623],
  
  // Misc symbols
  [0x2702, 0x2757],
  [0x2795, 0x2797],
  [0x27B0, 0x27B0],
  [0x27BF, 0x27BF],
  [0x2B05, 0x2B07],
  [0x3030, 0x3030],
  [0x303D, 0x303D],
  [0x3297, 0x3299],
  
  // New emojis (Unicode 13+)
  [0x1FA70, 0x1FA74],
  [0x1FA78, 0x1FA7C],
  [0x1FA80, 0x1FA88],
  [0x1FA90, 0x1FAC5],
  [0x1FAD0, 0x1FADB],
  [0x1FAE0, 0x1FAE8],
  [0x1FAF0, 0x1FAF8],
];

function generateEmojiList() {
  const emojis = [];
  const seen = new Set();
  
  console.log('   Scanning Unicode ranges...');
  
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
  
  // Also try ZWJ sequences and common combos
  const zwjSequences = [
    '👨‍👩‍👧', '👨‍👩‍👦', '👨‍👩‍👧‍👦', '👨‍👨‍👦', '👩‍👩‍👦',
    '👁️‍🗨️', '🏳️‍🌈', '🏳️‍⚧️', '🏴‍☠️',
    '❤️‍🔥', '❤️‍🩹', '😮‍💨', '😶‍🌫️',
  ];
  
  for (const char of zwjSequences) {
    if (seen.has(char)) continue;
    const parsed = parseEmoji(char);
    if (parsed.length > 0) {
      const svgUrl = parsed[0].url;
      const pngUrl = svgUrl.replace('/svg/', '/72x72/').replace('.svg', '.png');
      emojis.push({ char, codepoint: 'ZWJ', url: pngUrl });
      seen.add(char);
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
  } : { r: 1, g: 1, b: 1 };
}

function extractGrid(sourceCanvas, sourceCtx, size, gridSize, bgColor) {
  const bg = hexToRgb(bgColor);
  
  // Create small canvas at exact grid size
  const smallCanvas = createCanvas(gridSize, gridSize);
  const smallCtx = smallCanvas.getContext('2d');
  
  // Fill with background color first
  smallCtx.fillStyle = bgColor;
  smallCtx.fillRect(0, 0, gridSize, gridSize);
  
  // Enable smooth downsampling
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.imageSmoothingQuality = 'high';
  
  // Draw source onto small canvas - canvas does proper interpolation
  smallCtx.drawImage(sourceCanvas, 0, 0, gridSize, gridSize);
  
  // Read the 8x8 pixels directly
  const imageData = smallCtx.getImageData(0, 0, gridSize, gridSize);
  const data = imageData.data;
  const grid = [];
  
  for (let i = 0; i < gridSize * gridSize; i++) {
    const idx = i * 4;
    const r = data[idx] / 255;
    const g = data[idx + 1] / 255;
    const b = data[idx + 2] / 255;
    const a = data[idx + 3] / 255;
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    
    grid.push({
      r: Math.round(r * 1000) / 1000,
      g: Math.round(g * 1000) / 1000,
      b: Math.round(b * 1000) / 1000,
      l: Math.round(l * 1000) / 1000,
      a: Math.round(a * 1000) / 1000
    });
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
    grids[bgName] = extractGrid(canvas, ctx, size, CONFIG.gridSize, bgColor);
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

async function processInParallel(emojis, backgrounds, concurrency) {
  const results = [];
  let completed = 0;
  let failed = 0;
  const total = emojis.length;
  const startTime = Date.now();
  
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
    
    if ((completed + failed) % 200 === 0) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = (completed + failed) / elapsed;
      const eta = Math.round((total - completed - failed) / rate);
      console.log(`   ${completed + failed}/${total} (${rate.toFixed(0)}/s, ETA: ${eta}s, ✓${completed} ✗${failed})`);
    }
  };
  
  while (pool.size < concurrency && queue.length > 0) {
    const promise = processNext().then(() => pool.delete(promise));
    pool.add(promise);
  }
  
  while (queue.length > 0 || pool.size > 0) {
    if (pool.size > 0) await Promise.race(pool);
    while (pool.size < concurrency && queue.length > 0) {
      const promise = processNext().then(() => pool.delete(promise));
      pool.add(promise);
    }
  }
  
  await Promise.all(pool);
  return { results, completed, failed };
}

async function main() {
  const startTime = Date.now();
  
  console.log('🎨 FULL Emoji Feature Extractor\n');
  console.log(`   CPUs: ${os.cpus().length}`);
  console.log(`   RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);
  console.log(`   Concurrency: ${CONFIG.concurrency}`);
  console.log(`   Backgrounds: ${Object.keys(CONFIG.backgrounds).length}\n`);
  
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  console.log('📋 Generating emoji list...');
  const emojis = generateEmojiList();
  console.log(`   Found ${emojis.length} emojis to process\n`);
  
  console.log('🔄 Extracting features...');
  const { results, completed, failed } = await processInParallel(emojis, CONFIG.backgrounds, CONFIG.concurrency);
  
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Extracted ${completed} emojis (${failed} failed) in ${elapsed.toFixed(1)}s`);
  console.log(`   Rate: ${(completed / elapsed).toFixed(1)} emojis/second\n`);
  
  results.sort((a, b) => {
    if (a.codepoint === 'ZWJ') return 1;
    if (b.codepoint === 'ZWJ') return -1;
    return parseInt(a.codepoint, 16) - parseInt(b.codepoint, 16);
  });
  
  const fullPath = path.join(CONFIG.outputDir, 'emoji-features-full.json');
  await fs.writeFile(fullPath, JSON.stringify(results, null, 2));
  console.log(`📁 Full: ${fullPath}`);
  
  const compactPath = path.join(CONFIG.outputDir, 'emoji-features.json');
  const compact = {
    version: 2,
    gridSize: CONFIG.gridSize,
    backgrounds: Object.keys(CONFIG.backgrounds),
    emojis: results.map(f => ({ c: f.char, m: f.meta, g: f.grids }))
  };
  await fs.writeFile(compactPath, JSON.stringify(compact));
  
  const fileSize = (await fs.stat(compactPath)).size;
  console.log(`📁 Compact: ${compactPath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
  
  console.log(`\n📊 Final Stats:`);
  console.log(`   Emojis: ${results.length}`);
  console.log(`   Backgrounds: ${Object.keys(CONFIG.backgrounds).length}`);
  console.log(`   Grid: ${CONFIG.gridSize}×${CONFIG.gridSize}`);
  console.log(`   Features per emoji: ${80 * Object.keys(CONFIG.backgrounds).length}`);
  console.log(`   Total time: ${elapsed.toFixed(1)}s`);
}

main().catch(console.error);
