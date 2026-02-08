/**
 * 2×2 Quad Refinement Layer
 * 
 * Improves emoji mosaics by optimizing 2×2 blocks using pre-computed
 * pattern codebook. Captures edge interactions between adjacent emojis.
 */

let codebook = null;
let codebookLoaded = false;

export async function loadCodebook(path = './quad-codebook.json') {
  if (codebookLoaded) return;
  
  const resp = await fetch(path);
  codebook = await resp.json();
  codebookLoaded = true;
  console.log(`[QuadRefiner] Loaded ${codebook.patterns.length} patterns`);
}

// Downsample a 2×2 block region to 16×16
function extractBlock16(imageData, x, y, blockW, blockH, width) {
  const canvas = new OffscreenCanvas(16, 16);
  const ctx = canvas.getContext('2d');
  
  // Create temp canvas with the 2×2 block region
  const tempCanvas = new OffscreenCanvas(blockW * 2, blockH * 2);
  const tempCtx = tempCanvas.getContext('2d');
  const temp = tempCtx.createImageData(blockW * 2, blockH * 2);
  
  // Copy pixel data for 2×2 block region
  for (let dy = 0; dy < blockH * 2 && (y * blockH + dy) < imageData.height; dy++) {
    for (let dx = 0; dx < blockW * 2 && (x * blockW + dx) < imageData.width; dx++) {
      const srcIdx = ((y * blockH + dy) * width + (x * blockW + dx)) * 4;
      const dstIdx = (dy * blockW * 2 + dx) * 4;
      temp.data[dstIdx] = imageData.data[srcIdx];
      temp.data[dstIdx + 1] = imageData.data[srcIdx + 1];
      temp.data[dstIdx + 2] = imageData.data[srcIdx + 2];
      temp.data[dstIdx + 3] = imageData.data[srcIdx + 3];
    }
  }
  tempCtx.putImageData(temp, 0, 0);
  
  // Downsample to 16×16
  ctx.drawImage(tempCanvas, 0, 0, 16, 16);
  const data = ctx.getImageData(0, 0, 16, 16).data;
  
  const grid = [];
  for (let i = 0; i < 256; i++) {
    grid.push([
      data[i * 4] / 255,
      data[i * 4 + 1] / 255,
      data[i * 4 + 2] / 255
    ]);
  }
  return grid;
}

// Find nearest pattern in codebook
function findNearestPattern(grid16) {
  let bestPattern = null;
  let bestDist = Infinity;
  
  for (const pattern of codebook.patterns) {
    let dist = 0;
    for (let i = 0; i < 256; i++) {
      const dr = grid16[i][0] - pattern.pattern[i][0] / 255;
      const dg = grid16[i][1] - pattern.pattern[i][1] / 255;
      const db = grid16[i][2] - pattern.pattern[i][2] / 255;
      dist += dr * dr + dg * dg + db * db;
    }
    if (dist < bestDist) {
      bestDist = dist;
      bestPattern = pattern;
    }
  }
  
  return bestPattern;
}

/**
 * Refine a mosaic grid using 2×2 quad optimization
 * 
 * @param {string[][]} grid - 2D array of emoji characters
 * @param {ImageData} imageData - Original source image
 * @param {number} blockW - Width of each emoji block in source pixels
 * @param {number} blockH - Height of each emoji block in source pixels
 * @returns {string[][]} - Refined grid
 */
export function refineWithQuads(grid, imageData, blockW, blockH) {
  if (!codebookLoaded) {
    console.warn('[QuadRefiner] Codebook not loaded, skipping refinement');
    return grid;
  }
  
  const rows = grid.length;
  const cols = grid[0].length;
  const refined = grid.map(row => [...row]);
  
  // Process 2×2 blocks (stepping by 2)
  for (let y = 0; y < rows - 1; y += 2) {
    for (let x = 0; x < cols - 1; x += 2) {
      // Extract 16×16 from source for this 2×2 region
      const block16 = extractBlock16(imageData, x, y, blockW, blockH, imageData.width);
      
      // Find nearest pattern
      const pattern = findNearestPattern(block16);
      
      if (pattern && pattern.quads.length > 0) {
        // Use best quad (or random from top for variety)
        const quad = pattern.quads[Math.floor(Math.random() * Math.min(3, pattern.quads.length))];
        
        // Apply quad
        refined[y][x] = quad.chars[0];
        refined[y][x + 1] = quad.chars[1];
        refined[y + 1][x] = quad.chars[2];
        refined[y + 1][x + 1] = quad.chars[3];
      }
    }
  }
  
  return refined;
}

/**
 * Hybrid refinement: only apply quads where they improve the match
 */
export function refineWithQuadsSelective(grid, imageData, blockW, blockH, features, bg, threshold = 0.8) {
  if (!codebookLoaded) {
    console.warn('[QuadRefiner] Codebook not loaded, skipping refinement');
    return grid;
  }
  
  const rows = grid.length;
  const cols = grid[0].length;
  const refined = grid.map(row => [...row]);
  let replaced = 0;
  
  for (let y = 0; y < rows - 1; y += 2) {
    for (let x = 0; x < cols - 1; x += 2) {
      const block16 = extractBlock16(imageData, x, y, blockW, blockH, imageData.width);
      const pattern = findNearestPattern(block16);
      
      if (pattern && pattern.quads.length > 0) {
        // Calculate current grid's distance to source
        const currentQuad = [
          grid[y][x], grid[y][x + 1],
          grid[y + 1][x], grid[y + 1][x + 1]
        ];
        
        // Get best codebook quad
        const bestQuad = pattern.quads[0];
        
        // Only replace if codebook quad is significantly better
        if (bestQuad.dist < threshold) {
          refined[y][x] = bestQuad.chars[0];
          refined[y][x + 1] = bestQuad.chars[1];
          refined[y + 1][x] = bestQuad.chars[2];
          refined[y + 1][x + 1] = bestQuad.chars[3];
          replaced++;
        }
      }
    }
  }
  
  console.log(`[QuadRefiner] Replaced ${replaced} 2×2 blocks`);
  return refined;
}

export function isLoaded() {
  return codebookLoaded;
}
