/**
 * Build SMS Emoji Vectors
 * 
 * Pre-computed 30-emoji-wide line patterns optimized for SMS/text rendering.
 * - Single line vectors (30×1) for horizontal gradients/patterns
 * - Double line vectors (30×2) for richer textures
 */

import fs from 'fs/promises';

const CONFIG = {
  lineWidth: 30,
  outputPath: './data/sms-vectors.json',
  featuresPath: './data/emoji-features.json',
  background: 'white',
};

// Color/pattern categories for vectors
const VECTOR_TYPES = {
  // Solid colors
  solids: [
    { name: 'white', rgb: [1, 1, 1] },
    { name: 'black', rgb: [0, 0, 0] },
    { name: 'red', rgb: [1, 0, 0] },
    { name: 'orange', rgb: [1, 0.5, 0] },
    { name: 'yellow', rgb: [1, 1, 0] },
    { name: 'green', rgb: [0, 1, 0] },
    { name: 'cyan', rgb: [0, 1, 1] },
    { name: 'blue', rgb: [0, 0, 1] },
    { name: 'purple', rgb: [0.5, 0, 1] },
    { name: 'magenta', rgb: [1, 0, 1] },
    { name: 'pink', rgb: [1, 0.5, 0.8] },
    { name: 'brown', rgb: [0.6, 0.3, 0.1] },
    { name: 'gray_light', rgb: [0.8, 0.8, 0.8] },
    { name: 'gray_mid', rgb: [0.5, 0.5, 0.5] },
    { name: 'gray_dark', rgb: [0.2, 0.2, 0.2] },
  ],
  
  // Horizontal gradients (left to right)
  gradients: [
    { name: 'rainbow', stops: [[1,0,0], [1,1,0], [0,1,0], [0,1,1], [0,0,1], [1,0,1]] },
    { name: 'sunset', stops: [[0.1,0,0.2], [0.8,0.2,0.3], [1,0.5,0.2], [1,0.9,0.3]] },
    { name: 'ocean', stops: [[0,0.1,0.3], [0,0.4,0.6], [0,0.7,0.8], [0.5,0.9,1]] },
    { name: 'forest', stops: [[0.1,0.2,0], [0.2,0.5,0.1], [0.3,0.7,0.2], [0.5,0.8,0.3]] },
    { name: 'fire', stops: [[0.3,0,0], [0.8,0.2,0], [1,0.5,0], [1,0.9,0.3]] },
    { name: 'grayscale', stops: [[0,0,0], [0.33,0.33,0.33], [0.66,0.66,0.66], [1,1,1]] },
    { name: 'night', stops: [[0,0,0.1], [0.1,0,0.3], [0.2,0.1,0.4], [0.1,0.1,0.2]] },
    { name: 'warm', stops: [[1,0.9,0.7], [1,0.7,0.5], [0.9,0.5,0.3], [0.7,0.3,0.2]] },
    { name: 'cool', stops: [[0.7,0.9,1], [0.5,0.7,0.9], [0.3,0.5,0.8], [0.2,0.3,0.6]] },
    { name: 'b_to_w', stops: [[0,0,0], [1,1,1]] },
    { name: 'w_to_b', stops: [[1,1,1], [0,0,0]] },
  ],
  
  // Alternating patterns
  patterns: [
    { name: 'checker_bw', colors: [[0,0,0], [1,1,1]], period: 2 },
    { name: 'checker_rb', colors: [[1,0,0], [0,0,1]], period: 2 },
    { name: 'stripes_3', colors: [[1,0,0], [1,1,1], [0,0,1]], period: 3 },
    { name: 'stripes_rainbow', colors: [[1,0,0], [1,0.5,0], [1,1,0], [0,1,0], [0,0,1], [0.5,0,1]], period: 6 },
    { name: 'dots_sparse', colors: [[1,1,1], [1,1,1], [1,1,1], [0,0,0]], period: 4 },
  ],
};

function interpolateColor(stops, t) {
  const n = stops.length - 1;
  const i = Math.min(Math.floor(t * n), n - 1);
  const localT = (t * n) - i;
  
  const c1 = stops[i];
  const c2 = stops[i + 1];
  
  return [
    c1[0] + (c2[0] - c1[0]) * localT,
    c1[1] + (c2[1] - c1[1]) * localT,
    c1[2] + (c2[2] - c1[2]) * localT,
  ];
}

function findBestEmoji(emojis, r, g, b, background, usedRecently = new Set(), topK = 5) {
  const candidates = [];
  
  for (let i = 0; i < emojis.length; i++) {
    const grid = emojis[i].g[background];
    if (!grid) continue;
    
    // Average color
    let er = 0, eg = 0, eb = 0;
    for (const cell of grid) {
      er += cell.r; eg += cell.g; eb += cell.b;
    }
    er /= grid.length; eg /= grid.length; eb /= grid.length;
    
    let dist = (er - r) ** 2 + (eg - g) ** 2 + (eb - b) ** 2;
    
    // Penalize recently used
    if (usedRecently.has(i)) {
      dist *= 2.5;
    }
    
    candidates.push({ idx: i, char: emojis[i].c, dist });
  }
  
  candidates.sort((a, b) => a.dist - b.dist);
  
  // Weighted random from top K
  const top = candidates.slice(0, topK);
  const weights = top.map((_, i) => 1 / (i + 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let r2 = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r2 -= weights[i];
    if (r2 <= 0) return top[i];
  }
  return top[0];
}

function generateSolidLine(emojis, rgb, width, background) {
  const line = [];
  const recent = new Set();
  
  for (let i = 0; i < width; i++) {
    const best = findBestEmoji(emojis, rgb[0], rgb[1], rgb[2], background, recent, 8);
    line.push(best.char);
    
    recent.add(best.idx);
    if (recent.size > 10) {
      const first = recent.values().next().value;
      recent.delete(first);
    }
  }
  
  return line;
}

function generateGradientLine(emojis, stops, width, background) {
  const line = [];
  const recent = new Set();
  
  for (let i = 0; i < width; i++) {
    const t = i / (width - 1);
    const [r, g, b] = interpolateColor(stops, t);
    const best = findBestEmoji(emojis, r, g, b, background, recent, 8);
    line.push(best.char);
    
    recent.add(best.idx);
    if (recent.size > 10) {
      const first = recent.values().next().value;
      recent.delete(first);
    }
  }
  
  return line;
}

function generatePatternLine(emojis, colors, period, width, background) {
  const line = [];
  const recent = new Set();
  
  for (let i = 0; i < width; i++) {
    const colorIdx = i % period;
    const rgb = colors[colorIdx % colors.length];
    const best = findBestEmoji(emojis, rgb[0], rgb[1], rgb[2], background, recent, 5);
    line.push(best.char);
    
    recent.add(best.idx);
    if (recent.size > 5) {
      const first = recent.values().next().value;
      recent.delete(first);
    }
  }
  
  return line;
}

function generateDoubleLine(emojis, type, params, width, background) {
  // Generate two related lines
  const line1 = [];
  const line2 = [];
  const recent = new Set();
  
  if (type === 'gradient_v') {
    // Vertical gradient across 2 rows
    const { top, bottom } = params;
    for (let i = 0; i < width; i++) {
      const t = i / (width - 1);
      const topColor = interpolateColor(top, t);
      const bottomColor = interpolateColor(bottom, t);
      
      const best1 = findBestEmoji(emojis, topColor[0], topColor[1], topColor[2], background, recent, 6);
      line1.push(best1.char);
      recent.add(best1.idx);
      
      const best2 = findBestEmoji(emojis, bottomColor[0], bottomColor[1], bottomColor[2], background, recent, 6);
      line2.push(best2.char);
      recent.add(best2.idx);
      
      if (recent.size > 15) {
        const first = recent.values().next().value;
        recent.delete(first);
      }
    }
  } else if (type === 'checker') {
    // Checkerboard pattern
    const { c1, c2 } = params;
    for (let i = 0; i < width; i++) {
      const color1 = i % 2 === 0 ? c1 : c2;
      const color2 = i % 2 === 0 ? c2 : c1;
      
      const best1 = findBestEmoji(emojis, color1[0], color1[1], color1[2], background, recent, 5);
      line1.push(best1.char);
      recent.add(best1.idx);
      
      const best2 = findBestEmoji(emojis, color2[0], color2[1], color2[2], background, recent, 5);
      line2.push(best2.char);
      recent.add(best2.idx);
      
      if (recent.size > 10) {
        const first = recent.values().next().value;
        recent.delete(first);
      }
    }
  } else if (type === 'wave') {
    // Wave pattern - brightness oscillates
    const { base, amplitude } = params;
    for (let i = 0; i < width; i++) {
      const phase1 = Math.sin(i * Math.PI / 5) * amplitude;
      const phase2 = Math.sin((i + 2.5) * Math.PI / 5) * amplitude;
      
      const c1 = base.map(c => Math.max(0, Math.min(1, c + phase1)));
      const c2 = base.map(c => Math.max(0, Math.min(1, c + phase2)));
      
      const best1 = findBestEmoji(emojis, c1[0], c1[1], c1[2], background, recent, 6);
      line1.push(best1.char);
      
      const best2 = findBestEmoji(emojis, c2[0], c2[1], c2[2], background, recent, 6);
      line2.push(best2.char);
      
      recent.add(best1.idx);
      recent.add(best2.idx);
      if (recent.size > 12) {
        const first = recent.values().next().value;
        recent.delete(first);
      }
    }
  }
  
  return [line1, line2];
}

async function main() {
  console.log('📱 Building SMS Emoji Vectors\n');
  
  // Load features
  console.log('📂 Loading emoji features...');
  const features = JSON.parse(await fs.readFile(CONFIG.featuresPath, 'utf-8'));
  const emojis = features.emojis;
  console.log(`   ${emojis.length} emojis loaded\n`);
  
  const vectors = {
    version: 1,
    width: CONFIG.lineWidth,
    background: CONFIG.background,
    singleLines: [],
    doubleLines: [],
  };
  
  // Generate solid lines
  console.log('🎨 Generating solid color lines...');
  for (const solid of VECTOR_TYPES.solids) {
    const line = generateSolidLine(emojis, solid.rgb, CONFIG.lineWidth, CONFIG.background);
    vectors.singleLines.push({
      name: `solid_${solid.name}`,
      type: 'solid',
      line: line.join(''),
    });
  }
  console.log(`   ${VECTOR_TYPES.solids.length} solid lines`);
  
  // Generate gradient lines
  console.log('🌈 Generating gradient lines...');
  for (const grad of VECTOR_TYPES.gradients) {
    const line = generateGradientLine(emojis, grad.stops, CONFIG.lineWidth, CONFIG.background);
    vectors.singleLines.push({
      name: `gradient_${grad.name}`,
      type: 'gradient',
      line: line.join(''),
    });
    
    // Also generate reversed gradient
    const reversedStops = [...grad.stops].reverse();
    const reversedLine = generateGradientLine(emojis, reversedStops, CONFIG.lineWidth, CONFIG.background);
    vectors.singleLines.push({
      name: `gradient_${grad.name}_rev`,
      type: 'gradient',
      line: reversedLine.join(''),
    });
  }
  console.log(`   ${VECTOR_TYPES.gradients.length * 2} gradient lines`);
  
  // Generate pattern lines
  console.log('🔲 Generating pattern lines...');
  for (const pat of VECTOR_TYPES.patterns) {
    const line = generatePatternLine(emojis, pat.colors, pat.period, CONFIG.lineWidth, CONFIG.background);
    vectors.singleLines.push({
      name: `pattern_${pat.name}`,
      type: 'pattern',
      line: line.join(''),
    });
  }
  console.log(`   ${VECTOR_TYPES.patterns.length} pattern lines`);
  
  // Generate double lines
  console.log('📊 Generating double lines...');
  
  // Vertical gradients
  const vGradients = [
    { name: 'sky', top: [[0.3,0.6,1], [0.5,0.8,1]], bottom: [[0.7,0.9,1], [1,1,1]] },
    { name: 'ground', top: [[0.3,0.6,0.2], [0.4,0.7,0.3]], bottom: [[0.5,0.3,0.1], [0.4,0.25,0.1]] },
    { name: 'fire_v', top: [[1,0.9,0.2], [1,0.6,0]], bottom: [[1,0.3,0], [0.5,0,0]] },
    { name: 'ocean_v', top: [[0.2,0.6,0.9], [0.3,0.7,1]], bottom: [[0,0.3,0.6], [0,0.2,0.4]] },
  ];
  
  for (const vg of vGradients) {
    const [line1, line2] = generateDoubleLine(emojis, 'gradient_v', { top: vg.top, bottom: vg.bottom }, CONFIG.lineWidth, CONFIG.background);
    vectors.doubleLines.push({
      name: `vgradient_${vg.name}`,
      type: 'gradient_v',
      lines: [line1.join(''), line2.join('')],
    });
  }
  
  // Checkerboard doubles
  const checkers = [
    { name: 'bw', c1: [0,0,0], c2: [1,1,1] },
    { name: 'rb', c1: [1,0,0], c2: [0,0,1] },
    { name: 'yp', c1: [1,1,0], c2: [0.5,0,1] },
  ];
  
  for (const ck of checkers) {
    const [line1, line2] = generateDoubleLine(emojis, 'checker', { c1: ck.c1, c2: ck.c2 }, CONFIG.lineWidth, CONFIG.background);
    vectors.doubleLines.push({
      name: `checker_${ck.name}`,
      type: 'checker',
      lines: [line1.join(''), line2.join('')],
    });
  }
  
  // Wave patterns
  const waves = [
    { name: 'blue_wave', base: [0.2, 0.4, 0.8], amplitude: 0.3 },
    { name: 'green_wave', base: [0.2, 0.6, 0.3], amplitude: 0.25 },
    { name: 'gray_wave', base: [0.5, 0.5, 0.5], amplitude: 0.35 },
  ];
  
  for (const wave of waves) {
    const [line1, line2] = generateDoubleLine(emojis, 'wave', { base: wave.base, amplitude: wave.amplitude }, CONFIG.lineWidth, CONFIG.background);
    vectors.doubleLines.push({
      name: `wave_${wave.name}`,
      type: 'wave',
      lines: [line1.join(''), line2.join('')],
    });
  }
  
  console.log(`   ${vectors.doubleLines.length} double lines\n`);
  
  // Save
  await fs.writeFile(CONFIG.outputPath, JSON.stringify(vectors, null, 2));
  const stats = await fs.stat(CONFIG.outputPath);
  
  console.log(`✅ SMS Vectors built:`);
  console.log(`   Single lines: ${vectors.singleLines.length}`);
  console.log(`   Double lines: ${vectors.doubleLines.length}`);
  console.log(`   File: ${CONFIG.outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  
  // Print samples
  console.log('\n📋 Samples:\n');
  console.log('Rainbow gradient:');
  console.log(vectors.singleLines.find(l => l.name === 'gradient_rainbow')?.line);
  console.log('\nSunset gradient:');
  console.log(vectors.singleLines.find(l => l.name === 'gradient_sunset')?.line);
  console.log('\nSky (double line):');
  const sky = vectors.doubleLines.find(l => l.name === 'vgradient_sky');
  if (sky) {
    console.log(sky.lines[0]);
    console.log(sky.lines[1]);
  }
}

main().catch(console.error);
