/**
 * Extract ALL Emojis using emoji-datasource
 * 
 * Includes skin tone variants for ~3,500+ emojis
 */

import { createCanvas, loadImage } from 'canvas';
import emojiData from 'emoji-datasource' with { type: 'json' };
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const CONFIG = {
  emojiSize: 64,
  gridSize: 8,
  outputDir: './data',
  concurrency: Math.min(os.cpus().length * 4, 48),
  
  backgrounds: {
    white:          '#FFFFFF',
    black:          '#000000',
    ios_light:      '#F2F2F7',
    ios_dark:       '#1C1C1E',
    android_light:  '#FEFBFF',
    android_dark:   '#1C1B1F',
    imsg_blue:      '#007AFF',
    imsg_green:     '#34C759',
    discord_dark:   '#313338',
    discord_light:  '#FFFFFF',
    discord_blurple:'#5865F2',
    whatsapp_light: '#DCF8C6',
    whatsapp_dark:  '#005C4B',
    whatsapp_bg:    '#0B141A',
    slack_light:    '#FFFFFF',
    slack_dark:     '#1A1D21',
    slack_purple:   '#4A154B',
    telegram_light: '#FFFFFF',
    telegram_dark:  '#212121',
    telegram_blue:  '#2AABEE',
    twitter_light:  '#FFFFFF',
    twitter_dark:   '#15202B',
    twitter_blue:   '#1DA1F2',
  }
};

const SKIN_TONES = [
  { suffix: '1F3FB', name: 'light' },
  { suffix: '1F3FC', name: 'medium-light' },
  { suffix: '1F3FD', name: 'medium' },
  { suffix: '1F3FE', name: 'medium-dark' },
  { suffix: '1F3FF', name: 'dark' },
];

function unifiedToChar(unified) {
  return unified.split('-').map(cp => String.fromCodePoint(parseInt(cp, 16))).join('');
}

function unifiedToTwemojiUrl(unified) {
  // For ZWJ sequences, keep the FE0F; for simple emojis, remove trailing FE0F
  const hasZwj = unified.includes('200D');
  let code = unified.toLowerCase();
  if (!hasZwj) {
    // Simple emoji - remove FE0F
    code = code.replace(/-fe0f/g, '');
  }
  return `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/72x72/${code}.png`;
}

function generateEmojiList() {
  const emojis = [];
  const seen = new Set();
  
  for (const e of emojiData) {
    // Skip component emojis (skin tone modifiers themselves)
    if (e.category === 'Component') continue;
    
    // Must have Twitter image
    if (!e.has_img_twitter) continue;
    
    const unified = e.unified;
    const char = unifiedToChar(unified);
    
    if (seen.has(char)) continue;
    seen.add(char);
    
    emojis.push({
      char,
      unified,
      url: unifiedToTwemojiUrl(unified),
      name: e.short_name,
      category: e.category,
    });
    
    // Add skin tone variants
    if (e.skin_variations) {
      for (const tone of SKIN_TONES) {
        const variant = e.skin_variations[tone.suffix];
        if (variant && variant.has_img_twitter) {
          const varUnified = variant.unified;
          const varChar = unifiedToChar(varUnified);
          
          if (seen.has(varChar)) continue;
          seen.add(varChar);
          
          emojis.push({
            char: varChar,
            unified: varUnified,
            url: unifiedToTwemojiUrl(varUnified),
            name: `${e.short_name}_${tone.name}`,
            category: e.category,
          });
        }
      }
    }
  }
  
  // Add missing ZWJ sequences that emoji-datasource doesn't include
  // NOTE: Pink heart (🩷) is Unicode 15.0 and not in Twemoji yet
  const MISSING_EMOJIS = [
    // White hair component
    { char: '🦳', unified: '1F9B3', name: 'white_hair' },
    // Trans flag
    { char: '🏳️‍⚧️', unified: '1F3F3-FE0F-200D-26A7-FE0F', name: 'transgender_flag' },
    // Gendered swimmers with skin tones
    { char: '🏊🏾‍♀️', unified: '1F3CA-1F3FE-200D-2640-FE0F', name: 'woman_swimming_medium_dark' },
    { char: '🏊🏽‍♀️', unified: '1F3CA-1F3FD-200D-2640-FE0F', name: 'woman_swimming_medium' },
    { char: '🏊🏽‍♂️', unified: '1F3CA-1F3FD-200D-2642-FE0F', name: 'man_swimming_medium' },
    // Water polo
    { char: '🤽🏽‍♂️', unified: '1F93D-1F3FD-200D-2642-FE0F', name: 'man_water_polo_medium' },
    { char: '🤽🏽‍♀️', unified: '1F93D-1F3FD-200D-2640-FE0F', name: 'woman_water_polo_medium' },
    { char: '🤽🏾‍♀️', unified: '1F93D-1F3FE-200D-2640-FE0F', name: 'woman_water_polo_medium_dark' },
    { char: '🤽🏿‍♀️', unified: '1F93D-1F3FF-200D-2640-FE0F', name: 'woman_water_polo_dark' },
    // Heroes
    { char: '🦸🏼‍♀️', unified: '1F9B8-1F3FC-200D-2640-FE0F', name: 'woman_superhero_medium_light' },
    { char: '🦸🏼‍♂️', unified: '1F9B8-1F3FC-200D-2642-FE0F', name: 'man_superhero_medium_light' },
    // Gesturing
    { char: '🙅🏼‍♀️', unified: '1F645-1F3FC-200D-2640-FE0F', name: 'woman_gesturing_no_medium_light' },
    { char: '🙅🏼‍♂️', unified: '1F645-1F3FC-200D-2642-FE0F', name: 'man_gesturing_no_medium_light' },
    { char: '🙆🏾‍♂️', unified: '1F646-1F3FE-200D-2642-FE0F', name: 'man_gesturing_ok_medium_dark' },
    { char: '🙆🏽‍♂️', unified: '1F646-1F3FD-200D-2642-FE0F', name: 'man_gesturing_ok_medium' },
    { char: '🙆‍♂️', unified: '1F646-200D-2642-FE0F', name: 'man_gesturing_ok' },
    // Mages
    { char: '🧙🏻‍♀️', unified: '1F9D9-1F3FB-200D-2640-FE0F', name: 'woman_mage_light' },
    // Police
    { char: '👮🏼‍♀️', unified: '1F46E-1F3FC-200D-2640-FE0F', name: 'woman_police_officer_medium_light' },
    { char: '👮‍♀️', unified: '1F46E-200D-2640-FE0F', name: 'woman_police_officer' },
    // Tipping hand
    { char: '💁🏻‍♂️', unified: '1F481-1F3FB-200D-2642-FE0F', name: 'man_tipping_hand_light' },
    { char: '💁🏼‍♂️', unified: '1F481-1F3FC-200D-2642-FE0F', name: 'man_tipping_hand_medium_light' },
    // Climbing
    { char: '🧗‍♂️', unified: '1F9D7-200D-2642-FE0F', name: 'man_climbing' },
    // Wedding
    { char: '👰🏾‍♂️', unified: '1F470-1F3FE-200D-2642-FE0F', name: 'man_with_veil_medium_dark' },
    { char: '👰‍♂️', unified: '1F470-200D-2642-FE0F', name: 'man_with_veil' },
    // Blonde
    { char: '👱🏿‍♀️', unified: '1F471-1F3FF-200D-2640-FE0F', name: 'blond_woman_dark' },
    { char: '👱🏼‍♀️', unified: '1F471-1F3FC-200D-2640-FE0F', name: 'blond_woman_medium_light' },
    { char: '👱‍♀️', unified: '1F471-200D-2640-FE0F', name: 'blond_woman' },
    // Elf
    { char: '🧝🏻‍♀️', unified: '1F9DD-1F3FB-200D-2640-FE0F', name: 'woman_elf_light' },
    // Raising hand
    { char: '🙋🏻‍♂️', unified: '1F64B-1F3FB-200D-2642-FE0F', name: 'man_raising_hand_light' },
    // Health worker
    { char: '🧑‍⚕️', unified: '1F9D1-200D-2695-FE0F', name: 'health_worker' },
    // Bowing
    { char: '🙇🏼‍♀️', unified: '1F647-1F3FC-200D-2640-FE0F', name: 'woman_bowing_medium_light' },
    // Sauna
    { char: '🧖🏾‍♂️', unified: '1F9D6-1F3FE-200D-2642-FE0F', name: 'man_in_steamy_room_medium_dark' },
    // Biking
    { char: '🚵🏼‍♀️', unified: '1F6B5-1F3FC-200D-2640-FE0F', name: 'woman_mountain_biking_medium_light' },
    // Kneeling
    { char: '🧎🏼‍♂️‍➡️', unified: '1F9CE-1F3FC-200D-2642-FE0F-200D-27A1-FE0F', name: 'man_kneeling_facing_right_medium_light' },
  ];
  
  for (const e of MISSING_EMOJIS) {
    if (seen.has(e.char)) continue;
    seen.add(e.char);
    emojis.push({
      char: e.char,
      unified: e.unified,
      url: unifiedToTwemojiUrl(e.unified),
      name: e.name,
      category: 'People',
    });
  }
  
  return emojis;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 255, g: 255, b: 255 };
}

// Workaround for node-canvas fillRect bug
function fillCanvasWithColor(ctx, width, height, hexColor) {
  const rgb = hexToRgb(hexColor);
  const imgData = ctx.createImageData(width, height);
  for (let i = 0; i < imgData.data.length; i += 4) {
    imgData.data[i] = rgb.r;
    imgData.data[i + 1] = rgb.g;
    imgData.data[i + 2] = rgb.b;
    imgData.data[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}

function extractGrid(sourceCanvas, size, gridSize, bgColor) {
  const smallCanvas = createCanvas(gridSize, gridSize);
  const smallCtx = smallCanvas.getContext('2d');
  
  // Use putImageData workaround for node-canvas fillRect bug
  fillCanvasWithColor(smallCtx, gridSize, gridSize, bgColor);
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.imageSmoothingQuality = 'high';
  smallCtx.drawImage(sourceCanvas, 0, 0, gridSize, gridSize);
  
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
  const { char, url } = emoji;
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
    // Use putImageData workaround for node-canvas fillRect bug
    fillCanvasWithColor(ctx, size, size, bgColor);
    ctx.drawImage(img, 0, 0, size, size);
    grids[bgName] = extractGrid(canvas, size, CONFIG.gridSize, bgColor);
  }
  
  const whiteGrid = grids.white;
  const avgAlpha = whiteGrid.reduce((sum, c) => sum + c.a, 0) / whiteGrid.length;
  const avgLum = whiteGrid.reduce((sum, c) => sum + c.l, 0) / whiteGrid.length;
  const avgR = whiteGrid.reduce((sum, c) => sum + c.r, 0) / whiteGrid.length;
  const avgG = whiteGrid.reduce((sum, c) => sum + c.g, 0) / whiteGrid.length;
  const avgB = whiteGrid.reduce((sum, c) => sum + c.b, 0) / whiteGrid.length;
  
  return {
    char,
    grids,
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
    
    if ((completed + failed) % 500 === 0) {
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
  
  console.log('🎨 FULL Emoji Feature Extractor v2\n');
  console.log(`   CPUs: ${os.cpus().length}`);
  console.log(`   RAM: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`);
  console.log(`   Concurrency: ${CONFIG.concurrency}`);
  console.log(`   Backgrounds: ${Object.keys(CONFIG.backgrounds).length}\n`);
  
  await fs.mkdir(CONFIG.outputDir, { recursive: true });
  
  console.log('📋 Generating emoji list from emoji-datasource...');
  const emojis = generateEmojiList();
  console.log(`   Found ${emojis.length} emojis (including skin tone variants)\n`);
  
  console.log('🔄 Extracting features...');
  const { results, completed, failed } = await processInParallel(emojis, CONFIG.backgrounds, CONFIG.concurrency);
  
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Extracted ${completed} emojis (${failed} failed) in ${elapsed.toFixed(1)}s`);
  console.log(`   Rate: ${(completed / elapsed).toFixed(1)} emojis/second\n`);
  
  // Sort by character for consistent ordering
  results.sort((a, b) => a.char.localeCompare(b.char));
  
  // Save full output
  const fullOutput = {
    version: 2,
    gridSize: CONFIG.gridSize,
    backgrounds: Object.keys(CONFIG.backgrounds),
    emojis: results.map(r => ({
      c: r.char,
      m: r.meta,
      g: r.grids
    }))
  };
  
  const fullPath = path.join(CONFIG.outputDir, 'emoji-features-full.json');
  await fs.writeFile(fullPath, JSON.stringify(fullOutput));
  const fullStats = await fs.stat(fullPath);
  console.log(`📁 Full: ${fullPath} (${(fullStats.size / 1024 / 1024).toFixed(1)} MB)`);
  
  // Save compact output
  const compactOutput = {
    version: 2,
    gridSize: CONFIG.gridSize,
    backgrounds: Object.keys(CONFIG.backgrounds),
    emojis: results.map(r => ({
      c: r.char,
      m: r.meta,
      g: r.grids
    }))
  };
  
  const compactPath = path.join(CONFIG.outputDir, 'emoji-features.json');
  await fs.writeFile(compactPath, JSON.stringify(compactOutput));
  const stats = await fs.stat(compactPath);
  console.log(`📁 Compact: ${compactPath} (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);
  
  console.log(`\n📊 Final Stats:`);
  console.log(`   Emojis: ${completed}`);
  console.log(`   Backgrounds: ${Object.keys(CONFIG.backgrounds).length}`);
  console.log(`   Grid: ${CONFIG.gridSize}×${CONFIG.gridSize}`);
  console.log(`   Total time: ${elapsed.toFixed(1)}s`);
}

main().catch(console.error);
