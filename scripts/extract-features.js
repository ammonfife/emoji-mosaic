/**
 * Extract 4×4 RGBLA feature grids from Twemoji images
 * 
 * For each emoji, renders on multiple backgrounds and extracts
 * a 4×4 grid where each cell contains:
 *   - R, G, B (0-1, premultiplied by alpha)
 *   - L (luminance: 0.299R + 0.587G + 0.114B)
 *   - A (alpha/coverage: 0-1)
 */

import { createCanvas, loadImage } from 'canvas';
import { parse as parseEmoji } from 'twemoji-parser';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const CONFIG = {
  emojiSize: 64,        // Render size (will downsample to 4×4)
  gridSize: 4,          // 4×4 structural grid
  outputDir: './data',
  
  // Background colors to render against
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

// Curated emoji list - skip skin tones, flags, components
// This is a representative set; full extraction can include all
const EMOJI_RANGES = [
  // Smileys & Emotion
  [0x1F600, 0x1F64F],
  // People & Body (base only, skip modifiers)
  [0x1F466, 0x1F469],
  [0x1F476, 0x1F478],
  // Animals & Nature
  [0x1F400, 0x1F43F],
  [0x1F980, 0x1F9AE],
  // Food & Drink
  [0x1F345, 0x1F37F],
  [0x1F950, 0x1F96F],
  // Activities
  [0x26BD, 0x26C8],
  [0x1F3A0, 0x1F3CA],
  // Travel & Places
  [0x1F680, 0x1F6C5],
  [0x1F300, 0x1F320],
  // Objects
  [0x1F4A0, 0x1F4FD],
  [0x1F500, 0x1F53D],
  // Symbols
  [0x2600, 0x26FF],
  [0x2700, 0x27BF],
  [0x1F534, 0x1F53D],
  // Shapes
  [0x1F7E0, 0x1F7EB],
  // Hearts
  [0x2764, 0x2764],
  [0x1F493, 0x1F49F],
  [0x1F5A4, 0x1F5A4],
  [0x1F90D, 0x1F90E],
  [0x1FA75, 0x1FA77],
];

/**
 * Generate list of emoji codepoints to process
 */
function generateEmojiList() {
  const emojis = new Set();
  
  for (const [start, end] of EMOJI_RANGES) {
    for (let cp = start; cp <= end; cp++) {
      const char = String.fromCodePoint(cp);
      // Verify it's a valid emoji via twemoji-parser
      const parsed = parseEmoji(char);
      if (parsed.length > 0) {
        // Convert SVG URL to PNG URL (72x72 PNG version)
        const svgUrl = parsed[0].url;
        const pngUrl = svgUrl
          .replace('/svg/', '/72x72/')
          .replace('.svg', '.png');
        
        emojis.add({
          char,
          codepoint: cp.toString(16).toUpperCase(),
          url: pngUrl
        });
      }
    }
  }
  
  return Array.from(emojis);
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : null;
}

/**
 * Extract 4×4 RGBLA grid from canvas
 */
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
        // Premultiply with background for actual rendered color
        r += (data[i] / 255 * alpha + bg.r * (1 - alpha));
        g += (data[i + 1] / 255 * alpha + bg.g * (1 - alpha));
        b += (data[i + 2] / 255 * alpha + bg.b * (1 - alpha));
        a += alpha;
      }
      
      r /= pixelCount;
      g /= pixelCount;
      b /= pixelCount;
      a /= pixelCount;
      
      // Luminance (BT.601)
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

/**
 * Render emoji on background and extract features
 */
async function processEmoji(emoji, backgrounds) {
  const { char, codepoint, url } = emoji;
  const size = CONFIG.emojiSize;
  
  // Load emoji image from Twemoji CDN
  let img;
  try {
    img = await loadImage(url);
  } catch (e) {
    console.warn(`  ⚠ Failed to load ${char} (${codepoint}): ${e.message}`);
    return null;
  }
  
  const grids = {};
  
  for (const [bgName, bgColor] of Object.entries(backgrounds)) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, size, size);
    
    // Draw emoji centered
    ctx.drawImage(img, 0, 0, size, size);
    
    // Extract 4×4 grid
    grids[bgName] = extractGrid(ctx, size, CONFIG.gridSize, bgColor);
  }
  
  // Compute metadata (averaged across white background)
  const whiteGrid = grids.white;
  const avgAlpha = whiteGrid.reduce((sum, c) => sum + c.a, 0) / whiteGrid.length;
  const avgLum = whiteGrid.reduce((sum, c) => sum + c.l, 0) / whiteGrid.length;
  
  // Dominant hue (simplified - from avg color)
  const avgR = whiteGrid.reduce((sum, c) => sum + c.r, 0) / whiteGrid.length;
  const avgG = whiteGrid.reduce((sum, c) => sum + c.g, 0) / whiteGrid.length;
  const avgB = whiteGrid.reduce((sum, c) => sum + c.b, 0) / whiteGrid.length;
  
  return {
    char,
    codepoint,
    grids,
    meta: {
      avgAlpha: Math.round(avgAlpha * 1000) / 1000,
      avgLuminance: Math.round(avgLum * 1000) / 1000,
      avgColor: [
        Math.round(avgR * 1000) / 1000,
        Math.round(avgG * 1000) / 1000,
        Math.round(avgB * 1000) / 1000
      ]
    }
  };
}

/**
 * Main extraction pipeline
 */
async function main() {
  console.log('🎨 Emoji Mosaic Feature Extractor\n');
  
  // Create output directory
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  // Generate emoji list
  console.log('📋 Generating emoji list...');
  const emojis = generateEmojiList();
  console.log(`   Found ${emojis.length} emojis to process\n`);
  
  // Process each emoji
  console.log('🔄 Extracting features...');
  const features = [];
  let processed = 0;
  let failed = 0;
  
  for (const emoji of emojis) {
    const result = await processEmoji(emoji, CONFIG.backgrounds);
    if (result) {
      features.push(result);
      processed++;
    } else {
      failed++;
    }
    
    // Progress
    if ((processed + failed) % 50 === 0) {
      console.log(`   Processed ${processed + failed}/${emojis.length}...`);
    }
  }
  
  console.log(`\n✅ Extracted ${processed} emojis (${failed} failed)\n`);
  
  // Save full features (for development/debugging)
  const fullPath = path.join(CONFIG.outputDir, 'emoji-features-full.json');
  await fs.writeFile(fullPath, JSON.stringify(features, null, 2));
  console.log(`📁 Full features: ${fullPath}`);
  
  // Save compact binary format for web
  const compactPath = path.join(CONFIG.outputDir, 'emoji-features.json');
  const compact = {
    version: 1,
    gridSize: CONFIG.gridSize,
    backgrounds: Object.keys(CONFIG.backgrounds),
    emojis: features.map(f => ({
      c: f.char,
      m: f.meta,
      g: f.grids
    }))
  };
  await fs.writeFile(compactPath, JSON.stringify(compact));
  console.log(`📁 Compact features: ${compactPath}`);
  
  // Stats
  const fileSize = (await fs.stat(compactPath)).size;
  console.log(`\n📊 Stats:`);
  console.log(`   Emojis: ${features.length}`);
  console.log(`   Backgrounds: ${Object.keys(CONFIG.backgrounds).length}`);
  console.log(`   Grid: ${CONFIG.gridSize}×${CONFIG.gridSize}`);
  console.log(`   File size: ${(fileSize / 1024).toFixed(1)} KB`);
}

main().catch(console.error);
