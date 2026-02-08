/**
 * Jeffrey-Alexander Multi-Dimensional Optimization Diffuser
 * 
 * Advanced post-processing that optimizes emoji mosaics across
 * four simultaneous channels: Color, Texture, Pattern, Contrast
 * 
 * Uses iterative refinement with simulated annealing and
 * multi-channel error diffusion.
 */

export class JADiffuser {
  constructor(features, options = {}) {
    this.features = features;
    this.emojis = features.emojis;
    this.gridSize = features.gridSize;
    
    // Weights for each optimization channel
    this.weights = {
      color: options.colorWeight ?? 1.0,
      texture: options.textureWeight ?? 0.3,
      pattern: options.patternWeight ?? 0.2,
      contrast: options.contrastWeight ?? 0.4,
    };
    
    // Annealing parameters
    this.initialTemp = options.initialTemp ?? 1.0;
    this.coolingRate = options.coolingRate ?? 0.92;
    this.iterations = options.iterations ?? 5;
    
    // Build emoji index for fast lookup
    this.emojiIndex = new Map();
    this.emojis.forEach((e, i) => this.emojiIndex.set(e.c, i));
  }
  
  /**
   * Main optimization entry point
   */
  optimize(grid, imageData, blockW, blockH, background = 'white') {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Extract source features for each cell
    const sourceFeatures = this.extractSourceFeatures(imageData, rows, cols, blockW, blockH);
    
    // Initialize working grid
    let current = grid.map(row => [...row]);
    let currentScore = this.scoreGrid(current, sourceFeatures, background);
    
    console.log(`[JA-Diffuser] Initial score: ${currentScore.toFixed(2)}`);
    
    // Simulated annealing iterations
    let temp = this.initialTemp;
    
    for (let iter = 0; iter < this.iterations; iter++) {
      let changes = 0;
      
      // Forward pass (top-left to bottom-right)
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const result = this.optimizeCell(current, x, y, sourceFeatures, background, temp);
          if (result.changed) {
            current[y][x] = result.emoji;
            this.diffuseError(current, x, y, result.error, sourceFeatures, background);
            changes++;
          }
        }
      }
      
      // Backward pass (bottom-right to top-left) 
      for (let y = rows - 1; y >= 0; y--) {
        for (let x = cols - 1; x >= 0; x--) {
          const result = this.optimizeCell(current, x, y, sourceFeatures, background, temp);
          if (result.changed) {
            current[y][x] = result.emoji;
            changes++;
          }
        }
      }
      
      const newScore = this.scoreGrid(current, sourceFeatures, background);
      console.log(`[JA-Diffuser] Iter ${iter + 1}: score=${newScore.toFixed(2)}, changes=${changes}, temp=${temp.toFixed(3)}`);
      
      temp *= this.coolingRate;
    }
    
    const finalScore = this.scoreGrid(current, sourceFeatures, background);
    console.log(`[JA-Diffuser] Final score: ${finalScore.toFixed(2)} (improved ${((currentScore - finalScore) / currentScore * 100).toFixed(1)}%)`);
    
    return current;
  }
  
  /**
   * Extract multi-channel features from source image
   */
  extractSourceFeatures(imageData, rows, cols, blockW, blockH) {
    const features = [];
    const { data, width } = imageData;
    
    for (let y = 0; y < rows; y++) {
      const row = [];
      for (let x = 0; x < cols; x++) {
        const startX = x * blockW;
        const startY = y * blockH;
        
        // Sample block
        let r = 0, g = 0, b = 0, count = 0;
        let minL = 1, maxL = 0;
        const pixels = [];
        
        for (let dy = 0; dy < blockH && startY + dy < imageData.height; dy++) {
          for (let dx = 0; dx < blockW && startX + dx < width; dx++) {
            const idx = ((startY + dy) * width + (startX + dx)) * 4;
            const pr = data[idx] / 255;
            const pg = data[idx + 1] / 255;
            const pb = data[idx + 2] / 255;
            const pl = 0.299 * pr + 0.587 * pg + 0.114 * pb;
            
            r += pr; g += pg; b += pb;
            minL = Math.min(minL, pl);
            maxL = Math.max(maxL, pl);
            pixels.push({ r: pr, g: pg, b: pb, l: pl });
            count++;
          }
        }
        
        if (count > 0) {
          r /= count; g /= count; b /= count;
        }
        
        // Texture detection (variance-based)
        let variance = 0;
        const avgL = (minL + maxL) / 2;
        pixels.forEach(p => variance += (p.l - avgL) ** 2);
        variance = count > 0 ? variance / count : 0;
        
        // Edge detection (gradient magnitude)
        const gradient = maxL - minL;
        
        // Texture classification
        let textureType;
        if (gradient < 0.1 && variance < 0.01) {
          textureType = 'solid';
        } else if (gradient > 0.4) {
          textureType = 'edge';
        } else {
          textureType = 'gradient';
        }
        
        row.push({
          color: { r, g, b, l: 0.299 * r + 0.587 * g + 0.114 * b },
          contrast: { min: minL, max: maxL, range: gradient },
          texture: { variance, type: textureType },
          error: { r: 0, g: 0, b: 0, contrast: 0 }  // Accumulated diffusion error
        });
      }
      features.push(row);
    }
    
    return features;
  }
  
  /**
   * Optimize a single cell considering all channels
   */
  optimizeCell(grid, x, y, sourceFeatures, background, temp) {
    const rows = grid.length;
    const cols = grid[0].length;
    const currentEmoji = grid[y][x];
    const currentIdx = this.emojiIndex.get(currentEmoji);
    
    if (currentIdx === undefined) {
      return { changed: false, emoji: currentEmoji, error: { r: 0, g: 0, b: 0 } };
    }
    
    const source = sourceFeatures[y][x];
    const currentEmojiData = this.emojis[currentIdx];
    
    // Target color (source + accumulated error)
    const targetR = Math.max(0, Math.min(1, source.color.r + source.error.r));
    const targetG = Math.max(0, Math.min(1, source.color.g + source.error.g));
    const targetB = Math.max(0, Math.min(1, source.color.b + source.error.b));
    
    // Get neighbor context for pattern/contrast
    const neighbors = this.getNeighborContext(grid, x, y);
    
    // Score current emoji
    const currentScore = this.scoreCellMulti(
      currentEmojiData, targetR, targetG, targetB, source, neighbors, background
    );
    
    // Try to find better emoji
    let bestEmoji = currentEmoji;
    let bestIdx = currentIdx;
    let bestScore = currentScore;
    
    // Sample candidates (top matches + random exploration)
    const candidates = this.getCandidates(targetR, targetG, targetB, background, 20);
    
    for (const idx of candidates) {
      const emoji = this.emojis[idx];
      const score = this.scoreCellMulti(emoji, targetR, targetG, targetB, source, neighbors, background);
      
      // Simulated annealing acceptance
      if (score < bestScore || Math.random() < Math.exp((bestScore - score) / temp)) {
        bestScore = score;
        bestEmoji = emoji.c;
        bestIdx = idx;
      }
    }
    
    // Calculate error for diffusion
    const bestEmojiData = this.emojis[bestIdx];
    const bestGrid = bestEmojiData.g[background];
    const avgColor = this.getAverageColor(bestGrid);
    
    const error = {
      r: targetR - avgColor.r,
      g: targetG - avgColor.g,
      b: targetB - avgColor.b
    };
    
    return {
      changed: bestEmoji !== currentEmoji,
      emoji: bestEmoji,
      error
    };
  }
  
  /**
   * Multi-channel cell scoring
   */
  scoreCellMulti(emoji, targetR, targetG, targetB, source, neighbors, background) {
    const grid = emoji.g[background];
    if (!grid) return Infinity;
    
    const avg = this.getAverageColor(grid);
    
    // Color score (L2 distance)
    const colorScore = (avg.r - targetR) ** 2 + (avg.g - targetG) ** 2 + (avg.b - targetB) ** 2;
    
    // Texture score (match texture type)
    let textureScore = 0;
    const emojiVariance = this.getGridVariance(grid);
    if (source.texture.type === 'solid' && emojiVariance > 0.05) {
      textureScore = 0.5;  // Penalty for using textured emoji on solid region
    } else if (source.texture.type === 'edge' && emojiVariance < 0.02) {
      textureScore = 0.3;  // Penalty for using solid emoji on edge
    }
    
    // Pattern score (diversity from neighbors)
    let patternScore = 0;
    if (neighbors.chars.includes(emoji.c)) {
      patternScore = 0.3 * neighbors.chars.filter(c => c === emoji.c).length;
    }
    
    // Contrast score (preserve local contrast relationships)
    let contrastScore = 0;
    if (neighbors.luminances.length > 0) {
      const avgNeighborL = neighbors.luminances.reduce((a, b) => a + b, 0) / neighbors.luminances.length;
      const sourceContrast = source.color.l - avgNeighborL;
      const emojiContrast = avg.l - avgNeighborL;
      contrastScore = (sourceContrast - emojiContrast) ** 2;
    }
    
    // Weighted combination
    return (
      this.weights.color * colorScore +
      this.weights.texture * textureScore +
      this.weights.pattern * patternScore +
      this.weights.contrast * contrastScore
    );
  }
  
  /**
   * Diffuse error to neighboring cells (Floyd-Steinberg pattern extended)
   */
  diffuseError(grid, x, y, error, sourceFeatures, background) {
    const rows = grid.length;
    const cols = grid[0].length;
    
    // Floyd-Steinberg diffusion pattern:
    //        * 7/16
    // 3/16 5/16 1/16
    const diffusion = [
      { dx: 1, dy: 0, w: 7/16 },
      { dx: -1, dy: 1, w: 3/16 },
      { dx: 0, dy: 1, w: 5/16 },
      { dx: 1, dy: 1, w: 1/16 },
    ];
    
    for (const { dx, dy, w } of diffusion) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        sourceFeatures[ny][nx].error.r += error.r * w;
        sourceFeatures[ny][nx].error.g += error.g * w;
        sourceFeatures[ny][nx].error.b += error.b * w;
      }
    }
  }
  
  /**
   * Get neighboring emoji context
   */
  getNeighborContext(grid, x, y) {
    const rows = grid.length;
    const cols = grid[0].length;
    const chars = [];
    const luminances = [];
    
    const offsets = [[-1,0], [1,0], [0,-1], [0,1], [-1,-1], [1,-1], [-1,1], [1,1]];
    
    for (const [dx, dy] of offsets) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
        const char = grid[ny][nx];
        chars.push(char);
        
        const idx = this.emojiIndex.get(char);
        if (idx !== undefined) {
          const avg = this.emojis[idx].m?.avgLuminance ?? 0.5;
          luminances.push(avg);
        }
      }
    }
    
    return { chars, luminances };
  }
  
  /**
   * Get candidate emojis for optimization
   */
  getCandidates(r, g, b, background, count) {
    const candidates = [];
    
    for (let i = 0; i < this.emojis.length; i++) {
      const grid = this.emojis[i].g[background];
      if (!grid) continue;
      
      const avg = this.getAverageColor(grid);
      const dist = (avg.r - r) ** 2 + (avg.g - g) ** 2 + (avg.b - b) ** 2;
      candidates.push({ idx: i, dist });
    }
    
    candidates.sort((a, b) => a.dist - b.dist);
    
    // Return top matches + some random ones for exploration
    const result = candidates.slice(0, count - 5).map(c => c.idx);
    for (let i = 0; i < 5; i++) {
      const randomIdx = Math.floor(Math.random() * Math.min(100, candidates.length));
      result.push(candidates[randomIdx].idx);
    }
    
    return result;
  }
  
  /**
   * Score entire grid (for progress tracking)
   */
  scoreGrid(grid, sourceFeatures, background) {
    let total = 0;
    const rows = grid.length;
    const cols = grid[0].length;
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const char = grid[y][x];
        const idx = this.emojiIndex.get(char);
        if (idx === undefined) continue;
        
        const emoji = this.emojis[idx];
        const source = sourceFeatures[y][x];
        const neighbors = this.getNeighborContext(grid, x, y);
        
        total += this.scoreCellMulti(
          emoji, source.color.r, source.color.g, source.color.b,
          source, neighbors, background
        );
      }
    }
    
    return total / (rows * cols);
  }
  
  // Utility methods
  getAverageColor(grid) {
    let r = 0, g = 0, b = 0, l = 0;
    for (const cell of grid) {
      r += cell.r; g += cell.g; b += cell.b; l += cell.l;
    }
    const n = grid.length;
    return { r: r/n, g: g/n, b: b/n, l: l/n };
  }
  
  getGridVariance(grid) {
    const avg = this.getAverageColor(grid);
    let variance = 0;
    for (const cell of grid) {
      variance += (cell.l - avg.l) ** 2;
    }
    return variance / grid.length;
  }
}

// Factory function
export function createJADiffuser(features, options) {
  return new JADiffuser(features, options);
}
