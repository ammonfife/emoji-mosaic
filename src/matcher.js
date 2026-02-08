/**
 * Emoji Mosaic Matcher
 * 
 * Converts images to emoji mosaics using structural 4×4 pattern matching.
 * Compares source image blocks against pre-computed emoji feature grids.
 */

export class EmojiMatcher {
  constructor(features) {
    this.features = features;
    this.gridSize = features.gridSize;
    this.backgrounds = features.backgrounds;
    this.emojis = features.emojis;
    
    // Pre-compute flat arrays for faster matching
    this._precompute();
  }
  
  /**
   * Pre-compute optimized data structures
   */
  _precompute() {
    this._emojiChars = this.emojis.map(e => e.c);
    this._emojiMeta = this.emojis.map(e => e.m);
    
    // Pre-flatten grids per background for SIMD-friendly access
    this._cellCount = this.gridSize * this.gridSize;
    this._grids = {};
    for (const bg of this.backgrounds) {
      this._grids[bg] = this.emojis.map(e => {
        const grid = e.g[bg];
        const flat = new Float32Array(this._cellCount * 5);
        for (let i = 0; i < this._cellCount; i++) {
          flat[i * 5 + 0] = grid[i].r;
          flat[i * 5 + 1] = grid[i].g;
          flat[i * 5 + 2] = grid[i].b;
          flat[i * 5 + 3] = grid[i].l;
          flat[i * 5 + 4] = grid[i].a;
        }
        return flat;
      });
    }
  }
  
  /**
   * Extract NxN RGBLA grid from image region via direct downsampling
   * Uses offscreen canvas for proper interpolated downsampling
   */
  extractGrid(imageData, x, y, blockWidth, blockHeight, bgColor) {
    const { data, width, height } = imageData;
    const gridSize = this.gridSize;
    
    // Create offscreen canvas for the source block
    const blockCanvas = new OffscreenCanvas(Math.ceil(blockWidth), Math.ceil(blockHeight));
    const blockCtx = blockCanvas.getContext('2d');
    
    // Copy the block from imageData to the canvas
    const blockImageData = blockCtx.createImageData(Math.ceil(blockWidth), Math.ceil(blockHeight));
    const bw = Math.ceil(blockWidth);
    const bh = Math.ceil(blockHeight);
    
    for (let py = 0; py < bh; py++) {
      for (let px = 0; px < bw; px++) {
        const srcX = Math.floor(x) + px;
        const srcY = Math.floor(y) + py;
        if (srcX >= width || srcY >= height) continue;
        
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (py * bw + px) * 4;
        
        blockImageData.data[dstIdx] = data[srcIdx];
        blockImageData.data[dstIdx + 1] = data[srcIdx + 1];
        blockImageData.data[dstIdx + 2] = data[srcIdx + 2];
        blockImageData.data[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    blockCtx.putImageData(blockImageData, 0, 0);
    
    // Create small canvas at grid size and downsample
    const smallCanvas = new OffscreenCanvas(gridSize, gridSize);
    const smallCtx = smallCanvas.getContext('2d');
    
    // Fill with background
    smallCtx.fillStyle = `rgb(${bgColor.r * 255}, ${bgColor.g * 255}, ${bgColor.b * 255})`;
    smallCtx.fillRect(0, 0, gridSize, gridSize);
    
    // Enable smooth downsampling
    smallCtx.imageSmoothingEnabled = true;
    smallCtx.imageSmoothingQuality = 'high';
    
    // Draw block onto small canvas - proper interpolated downsampling
    smallCtx.drawImage(blockCanvas, 0, 0, gridSize, gridSize);
    
    // Read the NxN pixels directly
    const smallData = smallCtx.getImageData(0, 0, gridSize, gridSize).data;
    const grid = new Float32Array(this._cellCount * 5);
    
    for (let i = 0; i < this._cellCount; i++) {
      const idx = i * 4;
      const r = smallData[idx] / 255;
      const g = smallData[idx + 1] / 255;
      const b = smallData[idx + 2] / 255;
      const a = smallData[idx + 3] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      
      grid[i * 5 + 0] = r;
      grid[i * 5 + 1] = g;
      grid[i * 5 + 2] = b;
      grid[i * 5 + 3] = l;
      grid[i * 5 + 4] = a;
    }
    
    return grid;
  }
  
  /**
   * Find best matching emoji for a source grid
   */
  findBestMatch(sourceGrid, background, mode = 'color', topK = 1, usedRecently = null) {
    const emojiGrids = this._grids[background];
    
    // Collect all distances
    const candidates = [];
    
    for (let i = 0; i < emojiGrids.length; i++) {
      const emojiGrid = emojiGrids[i];
      let dist = 0;
      
      if (mode === 'color') {
        // Full RGB matching weighted by alpha + saturation fidelity
        for (let c = 0; c < this._cellCount; c++) {
          const si = c * 5;
          const sr = sourceGrid[si], sg = sourceGrid[si + 1], sb = sourceGrid[si + 2];
          const sa = sourceGrid[si + 4];
          const er = emojiGrid[si], eg = emojiGrid[si + 1], eb = emojiGrid[si + 2];
          const ea = emojiGrid[si + 4];
          
          // Color distance
          const colorDist = (sr - er) ** 2 + (sg - eg) ** 2 + (sb - eb) ** 2;
          
          // Saturation distance (penalize saturation mismatch)
          const sMax = Math.max(sr, sg, sb), sMin = Math.min(sr, sg, sb);
          const eMax = Math.max(er, eg, eb), eMin = Math.min(er, eg, eb);
          const sSat = sMax > 0 ? (sMax - sMin) / sMax : 0;
          const eSat = eMax > 0 ? (eMax - eMin) / eMax : 0;
          const satDist = (sSat - eSat) ** 2;
          
          // Alpha distance (coverage match)
          const alphaDist = (sa - ea) ** 2;
          
          // Weight by source alpha (transparent areas matter less)
          // Saturation weight: 1.5 = strong penalty for saturation mismatch
          // This prevents saturated emojis from matching muted source colors
          dist += (colorDist + satDist * 1.5 + alphaDist * 0.3) * (0.5 + sa * 0.5);
        }
      } else if (mode === 'grayscale') {
        // Luminance-only matching
        for (let c = 0; c < this._cellCount; c++) {
          const si = c * 5;
          const sl = sourceGrid[si + 3];
          const sa = sourceGrid[si + 4];
          const el = emojiGrid[si + 3];
          const ea = emojiGrid[si + 4];
          
          dist += ((sl - el) ** 2 + (sa - ea) ** 2 * 0.3) * (0.5 + sa * 0.5);
        }
      }
      
      // Penalize recently used emojis for diversity
      if (usedRecently && usedRecently.has(i)) {
        dist *= 3.0;  // Strong penalty to force variety
      }
      
      candidates.push({ idx: i, dist });
    }
    
    // Sort by distance and pick from top K
    candidates.sort((a, b) => a.dist - b.dist);
    
    let chosen;
    if (topK > 1) {
      // Random selection from top K
      // Use flatter distribution for more variety
      const topCandidates = candidates.slice(0, topK);
      
      // Flat distribution with slight preference for better matches
      // Weight by inverse distance, capped to prevent extreme skew
      const minDist = topCandidates[0].dist + 0.001;
      const weights = topCandidates.map(c => 1 / Math.sqrt(c.dist / minDist + 0.1));
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      
      let r = Math.random() * totalWeight;
      let chosenIdx = 0;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) { chosenIdx = i; break; }
      }
      chosen = topCandidates[chosenIdx];
    } else {
      chosen = candidates[0];
    }
    
    return {
      emoji: this._emojiChars[chosen.idx],
      distance: chosen.dist,
      index: chosen.idx
    };
  }
  
  /**
   * Convert entire image to emoji mosaic
   */
  imageToMosaic(imageData, options = {}) {
    const {
      width: emojiWidth = 30,
      background = 'white',
      mode = 'color',
      // Emoji aspect correction: in most fonts, emoji glyphs are square but
      // take ~2 char widths in text. Set to 1.0 for true square grid output.
      emojiAspect = 1.0,  // 1.0 = square pixels, 0.5 = text-display correction
      // Diversity options
      diversity = 1,  // 1 = best match only, 3-5 = pick from top N
      avoidRecent = 0  // How many recent emojis to penalize (0 = off)
    } = options;
    
    const { width, height } = imageData;
    const aspect = height / width;
    const emojiHeight = Math.round(emojiWidth * aspect * emojiAspect);
    
    const blockW = width / emojiWidth;
    const blockH = height / emojiHeight;
    
    // Parse background color
    const bgHex = this._bgColors[background] || '#FFFFFF';
    const bgColor = this._hexToRgb(bgHex);
    
    const result = [];
    const recentlyUsed = avoidRecent > 0 ? [] : null;
    
    for (let ey = 0; ey < emojiHeight; ey++) {
      const row = [];
      for (let ex = 0; ex < emojiWidth; ex++) {
        const x = Math.floor(ex * blockW);
        const y = Math.floor(ey * blockH);
        
        const grid = this.extractGrid(imageData, x, y, blockW, blockH, bgColor);
        
        // Build set of recently used emoji indices
        const usedSet = recentlyUsed ? new Set(recentlyUsed) : null;
        
        const match = this.findBestMatch(grid, background, mode, diversity, usedSet);
        
        // Track recently used
        if (recentlyUsed) {
          recentlyUsed.push(match.index);
          if (recentlyUsed.length > avoidRecent) {
            recentlyUsed.shift();
          }
        }
        
        row.push(match.emoji);
      }
      result.push(row);
    }
    
    return result;
  }
  
  /**
   * Mosaic result to string
   */
  mosaicToString(mosaic) {
    return mosaic.map(row => row.join('')).join('\n');
  }
  
  /**
   * Background color lookup
   */
  _bgColors = {
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
  };
  
  _hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 1, g: 1, b: 1 };
  }
}

/**
 * Load features and create matcher
 */
export async function createMatcher(featuresUrl = './emoji-features.json') {
  const response = await fetch(featuresUrl);
  const features = await response.json();
  return new EmojiMatcher(features);
}
