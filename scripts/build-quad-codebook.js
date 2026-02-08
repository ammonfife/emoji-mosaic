/**
 * Build 2×2 Emoji Quad Codebook
 * 
 * Pre-computes best emoji quads for common visual patterns.
 * Patterns: gradients, edges, corners, solids, transitions
 */

import { createCanvas } from 'canvas';
import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  gridSize: 16,  // 2×2 emojis at 8×8 each = 16×16
  outputPath: './data/quad-codebook.json',
  featuresPath: './data/emoji-features.json',
  
  // How many top single-emoji candidates to consider per cell
  candidatesPerCell: 8,
  
  // How many quads to store per pattern
  quadsPerPattern: 5,
};

// Generate archetypal patterns
function generatePatterns() {
  const patterns = [];
  
  // 1. SOLID COLORS - sample HSL space
  const hues = [0, 30, 60, 120, 180, 240, 300]; // red, orange, yellow, green, cyan, blue, magenta
  const saturations = [0, 0.5, 1.0];
  const lightnesses = [0.1, 0.3, 0.5, 0.7, 0.9];
  
  for (const h of hues) {
    for (const s of saturations) {
      for (const l of lightnesses) {
        patterns.push({
          name: `solid_h${h}_s${Math.round(s*100)}_l${Math.round(l*100)}`,
          type: 'solid',
          generate: () => generateSolid(h, s, l)
        });
      }
    }
  }
  
  // 2. GRADIENTS - 8 directions × color transitions
  const directions = [
    { name: 'right', dx: 1, dy: 0 },
    { name: 'left', dx: -1, dy: 0 },
    { name: 'down', dx: 0, dy: 1 },
    { name: 'up', dx: 0, dy: -1 },
    { name: 'diag_dr', dx: 1, dy: 1 },
    { name: 'diag_dl', dx: -1, dy: 1 },
    { name: 'diag_ur', dx: 1, dy: -1 },
    { name: 'diag_ul', dx: -1, dy: -1 },
  ];
  
  // Light to dark gradients
  for (const dir of directions) {
    patterns.push({
      name: `gradient_${dir.name}_light_dark`,
      type: 'gradient',
      generate: () => generateGradient(dir.dx, dir.dy, [1,1,1], [0,0,0])
    });
    patterns.push({
      name: `gradient_${dir.name}_dark_light`,
      type: 'gradient', 
      generate: () => generateGradient(dir.dx, dir.dy, [0,0,0], [1,1,1])
    });
  }
  
  // Color gradients (hue transitions)
  const colorPairs = [
    [[1,0,0], [1,1,0]], // red to yellow
    [[1,1,0], [0,1,0]], // yellow to green
    [[0,1,0], [0,1,1]], // green to cyan
    [[0,1,1], [0,0,1]], // cyan to blue
    [[0,0,1], [1,0,1]], // blue to magenta
    [[1,0,1], [1,0,0]], // magenta to red
  ];
  
  for (const dir of directions.slice(0, 4)) { // Just cardinal directions
    for (const [c1, c2] of colorPairs) {
      const name = `gradient_${dir.name}_${rgbName(c1)}_${rgbName(c2)}`;
      patterns.push({
        name,
        type: 'gradient',
        generate: () => generateGradient(dir.dx, dir.dy, c1, c2)
      });
    }
  }
  
  // 3. EDGES - sharp transitions
  for (const dir of directions.slice(0, 4)) {
    patterns.push({
      name: `edge_${dir.name}`,
      type: 'edge',
      generate: () => generateEdge(dir.dx, dir.dy)
    });
  }
  
  // 4. CORNERS
  const corners = [
    { name: 'tl', quadrant: 0 },
    { name: 'tr', quadrant: 1 },
    { name: 'bl', quadrant: 2 },
    { name: 'br', quadrant: 3 },
  ];
  for (const corner of corners) {
    patterns.push({
      name: `corner_${corner.name}`,
      type: 'corner',
      generate: () => generateCorner(corner.quadrant)
    });
  }
  
  return patterns;
}

function rgbName(rgb) {
  if (rgb[0] === 1 && rgb[1] === 0 && rgb[2] === 0) return 'red';
  if (rgb[0] === 1 && rgb[1] === 1 && rgb[2] === 0) return 'yellow';
  if (rgb[0] === 0 && rgb[1] === 1 && rgb[2] === 0) return 'green';
  if (rgb[0] === 0 && rgb[1] === 1 && rgb[2] === 1) return 'cyan';
  if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 1) return 'blue';
  if (rgb[0] === 1 && rgb[1] === 0 && rgb[2] === 1) return 'magenta';
  return 'color';
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h/360 + 1/3);
    g = hue2rgb(p, q, h/360);
    b = hue2rgb(p, q, h/360 - 1/3);
  }
  return [r, g, b];
}

function generateSolid(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  const grid = [];
  for (let i = 0; i < 256; i++) { // 16x16
    grid.push({ r, g, b, l: 0.299*r + 0.587*g + 0.114*b });
  }
  return grid;
}

function generateGradient(dx, dy, c1, c2) {
  const grid = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let t;
      if (dx !== 0 && dy !== 0) {
        // Diagonal
        t = ((dx > 0 ? x : 15-x) + (dy > 0 ? y : 15-y)) / 30;
      } else if (dx !== 0) {
        t = dx > 0 ? x / 15 : (15-x) / 15;
      } else {
        t = dy > 0 ? y / 15 : (15-y) / 15;
      }
      const r = c1[0] + (c2[0] - c1[0]) * t;
      const g = c1[1] + (c2[1] - c1[1]) * t;
      const b = c1[2] + (c2[2] - c1[2]) * t;
      grid.push({ r, g, b, l: 0.299*r + 0.587*g + 0.114*b });
    }
  }
  return grid;
}

function generateEdge(dx, dy) {
  const grid = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let dark;
      if (dx !== 0) {
        dark = dx > 0 ? x < 8 : x >= 8;
      } else {
        dark = dy > 0 ? y < 8 : y >= 8;
      }
      const v = dark ? 0.2 : 0.8;
      grid.push({ r: v, g: v, b: v, l: v });
    }
  }
  return grid;
}

function generateCorner(quadrant) {
  const grid = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let dark;
      switch (quadrant) {
        case 0: dark = x < 8 && y < 8; break;  // TL
        case 1: dark = x >= 8 && y < 8; break; // TR
        case 2: dark = x < 8 && y >= 8; break; // BL
        case 3: dark = x >= 8 && y >= 8; break; // BR
      }
      const v = dark ? 0.2 : 0.8;
      grid.push({ r: v, g: v, b: v, l: v });
    }
  }
  return grid;
}

// Calculate distance between two 16×16 grids
function gridDistance(g1, g2) {
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    const dr = g1[i].r - g2[i].r;
    const dg = g1[i].g - g2[i].g;
    const db = g1[i].b - g2[i].b;
    const dl = g1[i].l - g2[i].l;
    sum += dr*dr + dg*dg + db*db + dl*dl;
  }
  return sum;
}

// Combine four 8×8 emoji grids into one 16×16 grid
function combineQuad(tl, tr, bl, br) {
  const grid = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let cell;
      if (y < 8) {
        cell = x < 8 ? tl[y * 8 + x] : tr[y * 8 + (x - 8)];
      } else {
        cell = x < 8 ? bl[(y - 8) * 8 + x] : br[(y - 8) * 8 + (x - 8)];
      }
      grid.push(cell);
    }
  }
  return grid;
}

// Find top emoji candidates for a quadrant of a pattern
function findTopCandidates(patternQuadrant, emojis, bg, k) {
  const candidates = [];
  
  for (let i = 0; i < emojis.length; i++) {
    const emojiGrid = emojis[i].g[bg];
    if (!emojiGrid) continue;
    
    let dist = 0;
    for (let j = 0; j < 64; j++) {
      const dr = patternQuadrant[j].r - emojiGrid[j].r;
      const dg = patternQuadrant[j].g - emojiGrid[j].g;
      const db = patternQuadrant[j].b - emojiGrid[j].b;
      dist += dr*dr + dg*dg + db*db;
    }
    candidates.push({ idx: i, dist });
  }
  
  candidates.sort((a, b) => a.dist - b.dist);
  return candidates.slice(0, k);
}

// Extract 8×8 quadrant from 16×16 pattern
function extractQuadrant(pattern, qx, qy) {
  const quadrant = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      quadrant.push(pattern[(qy * 8 + y) * 16 + (qx * 8 + x)]);
    }
  }
  return quadrant;
}

async function main() {
  console.log('🧩 Building 2×2 Quad Codebook\n');
  
  // Load emoji features
  console.log('📂 Loading emoji features...');
  const features = JSON.parse(await fs.readFile(CONFIG.featuresPath, 'utf-8'));
  const emojis = features.emojis;
  console.log(`   ${emojis.length} emojis loaded\n`);
  
  // Generate patterns
  console.log('🎨 Generating patterns...');
  const patternDefs = generatePatterns();
  console.log(`   ${patternDefs.length} patterns defined\n`);
  
  // Process each pattern
  const bg = 'white'; // Start with white background
  const codebook = [];
  
  console.log('🔍 Finding best quads for each pattern...');
  const startTime = Date.now();
  
  for (let pi = 0; pi < patternDefs.length; pi++) {
    const pdef = patternDefs[pi];
    const pattern = pdef.generate();
    
    // Get top candidates for each quadrant
    const tlPattern = extractQuadrant(pattern, 0, 0);
    const trPattern = extractQuadrant(pattern, 1, 0);
    const blPattern = extractQuadrant(pattern, 0, 1);
    const brPattern = extractQuadrant(pattern, 1, 1);
    
    const tlCandidates = findTopCandidates(tlPattern, emojis, bg, CONFIG.candidatesPerCell);
    const trCandidates = findTopCandidates(trPattern, emojis, bg, CONFIG.candidatesPerCell);
    const blCandidates = findTopCandidates(blPattern, emojis, bg, CONFIG.candidatesPerCell);
    const brCandidates = findTopCandidates(brPattern, emojis, bg, CONFIG.candidatesPerCell);
    
    // Try all combinations
    const combos = [];
    for (const tl of tlCandidates) {
      for (const tr of trCandidates) {
        for (const bl of blCandidates) {
          for (const br of brCandidates) {
            const quad = combineQuad(
              emojis[tl.idx].g[bg],
              emojis[tr.idx].g[bg],
              emojis[bl.idx].g[bg],
              emojis[br.idx].g[bg]
            );
            const dist = gridDistance(pattern, quad);
            combos.push({
              emojis: [tl.idx, tr.idx, bl.idx, br.idx],
              chars: [emojis[tl.idx].c, emojis[tr.idx].c, emojis[bl.idx].c, emojis[br.idx].c],
              dist
            });
          }
        }
      }
    }
    
    // Sort and keep top quads
    combos.sort((a, b) => a.dist - b.dist);
    const topQuads = combos.slice(0, CONFIG.quadsPerPattern);
    
    codebook.push({
      name: pdef.name,
      type: pdef.type,
      pattern: pattern.map(c => [
        Math.round(c.r * 255),
        Math.round(c.g * 255),
        Math.round(c.b * 255)
      ]),
      quads: topQuads.map(q => ({
        chars: q.chars,
        dist: Math.round(q.dist * 1000) / 1000
      }))
    });
    
    if ((pi + 1) % 50 === 0) {
      console.log(`   ${pi + 1}/${patternDefs.length} patterns processed`);
    }
  }
  
  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n✅ Processed ${patternDefs.length} patterns in ${elapsed.toFixed(1)}s`);
  
  // Save codebook
  const output = {
    version: 1,
    background: bg,
    gridSize: CONFIG.gridSize,
    patterns: codebook
  };
  
  await fs.writeFile(CONFIG.outputPath, JSON.stringify(output));
  const stats = await fs.stat(CONFIG.outputPath);
  console.log(`\n📁 Saved: ${CONFIG.outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  console.log(`   ${codebook.length} patterns × ${CONFIG.quadsPerPattern} quads each`);
}

main().catch(console.error);
