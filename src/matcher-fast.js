/**
 * Fast Emoji Matcher using PCA Embeddings
 * 
 * Uses 32-dim embeddings instead of 80-dim raw grids.
 * 60% smaller data, 2.5x faster matching.
 */

export class FastEmojiMatcher {
  constructor(embeddings) {
    this.embeddings = embeddings;
    this.embeddingDim = embeddings.embeddingDim;
    this.gridSize = embeddings.gridSize || 4;
    this.backgrounds = embeddings.backgrounds;
    this.emojis = embeddings.emojis;
    this.pca = embeddings.pca;
    
    this._cellCount = this.gridSize * this.gridSize;
    this._vecSize = this._cellCount * 5;
    
    this._precompute();
  }
  
  _precompute() {
    this._emojiChars = this.emojis.map(e => e.c);
    this._emojiMeta = this.emojis.map(e => e.m);
    
    // Pre-flatten embeddings per background for fast access
    this._embeddings = {};
    for (const bg of this.backgrounds) {
      this._embeddings[bg] = this.emojis.map(e => 
        new Float32Array(e.e[bg])
      );
    }
  }
  
  /**
   * Flatten NxN RGBLA grid to vector
   */
  _flattenGrid(grid) {
    const vec = new Float32Array(this._vecSize);
    for (let i = 0; i < this._cellCount; i++) {
      vec[i * 5 + 0] = grid[i].r;
      vec[i * 5 + 1] = grid[i].g;
      vec[i * 5 + 2] = grid[i].b;
      vec[i * 5 + 3] = grid[i].l;
      vec[i * 5 + 4] = grid[i].a;
    }
    return vec;
  }
  
  /**
   * Project vector to embedding using stored PCA params
   */
  _projectToEmbedding(vec, background) {
    const { mean, eigenvectors } = this.pca[background];
    const embedding = new Float32Array(this.embeddingDim);
    
    for (let k = 0; k < this.embeddingDim; k++) {
      let sum = 0;
      const ev = eigenvectors[k];
      for (let i = 0; i < this._vecSize; i++) {
        sum += (vec[i] - mean[i]) * ev[i];
      }
      embedding[k] = sum;
    }
    
    return embedding;
  }
  
  /**
   * L2 distance between two embeddings
   */
  _l2Distance(a, b) {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const d = a[i] - b[i];
      sum += d * d;
    }
    return sum;
  }
  
  /**
   * Extract NxN RGBLA grid from image region via direct downsampling
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
    const grid = [];
    
    for (let i = 0; i < gridSize * gridSize; i++) {
      const idx = i * 4;
      const r = smallData[idx] / 255;
      const g = smallData[idx + 1] / 255;
      const b = smallData[idx + 2] / 255;
      const a = smallData[idx + 3] / 255;
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      grid.push({ r, g, b, l, a });
    }
    
    return grid;
  }
  
  /**
   * Find best matching emoji for a source grid
   */
  findBestMatch(sourceGrid, background) {
    // Convert source grid to embedding
    const vec80 = this._flattenGrid(sourceGrid);
    const sourceEmb = this._projectToEmbedding(vec80, background);
    
    const emojiEmbs = this._embeddings[background];
    
    let bestIdx = 0;
    let bestDist = Infinity;
    
    // Fast L2 search in embedding space
    for (let i = 0; i < emojiEmbs.length; i++) {
      const dist = this._l2Distance(sourceEmb, emojiEmbs[i]);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    }
    
    return {
      emoji: this._emojiChars[bestIdx],
      distance: bestDist,
      index: bestIdx
    };
  }
  
  /**
   * Convert entire image to emoji mosaic
   */
  imageToMosaic(imageData, options = {}) {
    const {
      width: emojiWidth = 30,
      background = 'white',
      // Emoji aspect: 1.0 = true aspect ratio, 0.5 = compensate for text line height
      emojiAspect = 1.0
    } = options;
    
    const { width, height } = imageData;
    const aspect = height / width;
    const emojiHeight = Math.round(emojiWidth * aspect * emojiAspect);
    
    const blockW = width / emojiWidth;
    const blockH = height / emojiHeight;
    
    const bgHex = this._bgColors[background] || '#FFFFFF';
    const bgColor = this._hexToRgb(bgHex);
    
    const result = [];
    
    for (let ey = 0; ey < emojiHeight; ey++) {
      const row = [];
      for (let ex = 0; ex < emojiWidth; ex++) {
        const x = Math.floor(ex * blockW);
        const y = Math.floor(ey * blockH);
        
        const grid = this.extractGrid(imageData, x, y, blockW, blockH, bgColor);
        const match = this.findBestMatch(grid, background);
        
        row.push(match.emoji);
      }
      result.push(row);
    }
    
    return result;
  }
  
  mosaicToString(mosaic) {
    return mosaic.map(row => row.join('')).join('\n');
  }
  
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

export async function createFastMatcher(embeddingsUrl = './emoji-embeddings.json') {
  const response = await fetch(embeddingsUrl);
  const embeddings = await response.json();
  return new FastEmojiMatcher(embeddings);
}
