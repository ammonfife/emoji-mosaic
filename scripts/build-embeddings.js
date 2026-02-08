/**
 * Build Compressed Embeddings from Raw Features
 * 
 * Uses PCA to reduce 80-float grids to 32-64 dim embeddings.
 * Much smaller file size and faster matching.
 */

import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  inputPath: './data/emoji-features.json',
  outputPath: './data/emoji-embeddings.json',
  embeddingDim: 48,  // Compress 320 → 48 dims (8×8×5 → 48)
};

/**
 * Simple PCA implementation (no external deps)
 */
function computePCA(data, targetDims) {
  const n = data.length;
  const d = data[0].length;
  
  // Center the data
  const mean = new Array(d).fill(0);
  for (const row of data) {
    for (let i = 0; i < d; i++) mean[i] += row[i] / n;
  }
  
  const centered = data.map(row => row.map((v, i) => v - mean[i]));
  
  // Compute covariance matrix (d × d)
  const cov = Array(d).fill(null).map(() => Array(d).fill(0));
  for (const row of centered) {
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        cov[i][j] += row[i] * row[j] / (n - 1);
      }
    }
  }
  
  // Power iteration for top eigenvectors (simple but works)
  const eigenvectors = [];
  const deflatedCov = cov.map(row => [...row]);
  
  for (let k = 0; k < targetDims; k++) {
    // Random init
    let v = Array(d).fill(0).map(() => Math.random() - 0.5);
    let norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / norm);
    
    // Power iteration
    for (let iter = 0; iter < 100; iter++) {
      const newV = Array(d).fill(0);
      for (let i = 0; i < d; i++) {
        for (let j = 0; j < d; j++) {
          newV[i] += deflatedCov[i][j] * v[j];
        }
      }
      norm = Math.sqrt(newV.reduce((s, x) => s + x * x, 0));
      v = newV.map(x => x / norm);
    }
    
    eigenvectors.push(v);
    
    // Deflate: remove this eigenvector's contribution
    const eigenvalue = v.reduce((s, _, i) => {
      let sum = 0;
      for (let j = 0; j < d; j++) sum += deflatedCov[i][j] * v[j];
      return s + sum * v[i];
    }, 0);
    
    for (let i = 0; i < d; i++) {
      for (let j = 0; j < d; j++) {
        deflatedCov[i][j] -= eigenvalue * v[i] * v[j];
      }
    }
  }
  
  return { mean, eigenvectors };
}

/**
 * Project data onto PCA basis
 */
function projectPCA(data, mean, eigenvectors) {
  return data.map(row => {
    const centered = row.map((v, i) => v - mean[i]);
    return eigenvectors.map(ev => 
      centered.reduce((s, v, i) => s + v * ev[i], 0)
    );
  });
}

/**
 * Flatten grid to vector
 */
function flattenGrid(grid) {
  const vec = [];
  for (const cell of grid) {
    vec.push(cell.r, cell.g, cell.b, cell.l, cell.a);
  }
  return vec;
}

async function main() {
  console.log('🔮 Building Emoji Embeddings\n');
  
  // Load raw features
  console.log('📂 Loading features...');
  const raw = JSON.parse(await fs.readFile(CONFIG.inputPath, 'utf-8'));
  console.log(`   ${raw.emojis.length} emojis, ${raw.backgrounds.length} backgrounds\n`);
  
  // Build embeddings per background
  const embeddings = {
    version: 2,
    gridSize: raw.gridSize,
    embeddingDim: CONFIG.embeddingDim,
    backgrounds: raw.backgrounds,
    pca: {},  // Store PCA params for encoding new images
    emojis: raw.emojis.map(e => ({
      c: e.c,
      m: e.m,
      e: {}  // embeddings per background
    }))
  };
  
  console.log('🔄 Computing PCA per background...');
  
  for (const bg of raw.backgrounds) {
    process.stdout.write(`   ${bg}... `);
    
    // Collect all grids for this background
    const allGrids = raw.emojis.map(e => flattenGrid(e.g[bg]));
    
    // Compute PCA
    const { mean, eigenvectors } = computePCA(allGrids, CONFIG.embeddingDim);
    
    // Project all emojis
    const projected = projectPCA(allGrids, mean, eigenvectors);
    
    // Store PCA params (for encoding source images)
    embeddings.pca[bg] = {
      mean: mean.map(v => Math.round(v * 10000) / 10000),
      eigenvectors: eigenvectors.map(ev => 
        ev.map(v => Math.round(v * 10000) / 10000)
      )
    };
    
    // Store embeddings
    for (let i = 0; i < raw.emojis.length; i++) {
      embeddings.emojis[i].e[bg] = projected[i].map(v => 
        Math.round(v * 10000) / 10000
      );
    }
    
    console.log('✓');
  }
  
  // Save embeddings
  console.log('\n📁 Saving embeddings...');
  await fs.writeFile(CONFIG.outputPath, JSON.stringify(embeddings));
  
  const rawSize = (await fs.stat(CONFIG.inputPath)).size;
  const embSize = (await fs.stat(CONFIG.outputPath)).size;
  
  console.log(`\n📊 Compression Results:`);
  console.log(`   Raw features: ${(rawSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Embeddings:   ${(embSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`   Reduction:    ${((1 - embSize / rawSize) * 100).toFixed(0)}%`);
  console.log(`   Dims: 80 → ${CONFIG.embeddingDim}`);
}

main().catch(console.error);
