/**
 * Image Generation Test
 * Tests the emoji prompter by generating images from emoji descriptions
 * and comparing them to originals
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HSL-based color detection (copied from prompter)
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function detectConceptHSL(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  if (l < 20) return 'sky_night';
  if (l < 30) return 'black';
  if (l > 90) return 'white';
  if (l > 80 && s < 15) return 'sky_cloudy';
  if (s < 10) return 'gray';
  if (s < 20 && l > 40 && l < 70) return 'gray';
  if (s > 15) {
    if (h < 15 || h > 345) return l > 60 ? 'pink' : 'red';
    if (h >= 15 && h < 45) return l > 70 ? 'sky_sunset' : (s > 40 ? 'orange' : 'brown');
    if (h >= 45 && h < 65) return l > 60 ? 'yellow' : 'brown';
    if (h >= 65 && h < 160) return l < 35 ? 'forest' : (s > 30 ? 'grass' : 'green');
    if (h >= 160 && h < 220) return (l > 60 && s < 40) ? 'sky_blue' : (s > 30 ? 'water' : 'sky_blue');
    if (h >= 220 && h < 260) return l < 30 ? 'sky_night' : 'blue';
    if (h >= 260 && h < 290) return 'purple';
    if (h >= 290 && h < 345) return l > 60 ? 'pink' : 'purple';
  }
  if (s >= 10 && s <= 50 && l >= 40 && l <= 80 && h >= 10 && h <= 40) return 'skin';
  return 'gray';
}

// Concept to natural language mapping
const CONCEPT_DESCRIPTIONS = {
  sky_blue: 'bright blue sky',
  sky_cloudy: 'overcast cloudy sky',
  sky_sunset: 'warm sunset sky with orange and pink',
  sky_night: 'dark night sky',
  grass: 'green grass and foliage',
  forest: 'dark forest trees',
  water: 'blue water',
  red: 'red colors',
  orange: 'warm orange tones',
  yellow: 'bright yellow',
  green: 'green nature',
  blue: 'deep blue',
  purple: 'purple and violet',
  pink: 'soft pink',
  brown: 'earthy brown tones',
  black: 'dark shadows',
  white: 'bright white',
  gray: 'neutral gray tones',
  skin: 'natural skin tones'
};

class ImageGenTester {
  constructor() {
    this.outputDir = path.join(__dirname, '../generated');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async analyzeImage(imagePath) {
    const img = await loadImage(imagePath);
    const maxSize = 200;
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    const w = Math.floor(img.width * scale);
    const h = Math.floor(img.height * scale);

    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);

    const imageData = ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;
    const gridSize = 5;
    const cellW = Math.floor(w / gridSize);
    const cellH = Math.floor(h / gridSize);

    const conceptCounts = {};
    let totalR = 0, totalG = 0, totalB = 0, totalCount = 0;

    for (let gy = 0; gy < gridSize; gy++) {
      for (let gx = 0; gx < gridSize; gx++) {
        const region = this.analyzeRegion(pixels, w, gx * cellW, gy * cellH, cellW, cellH);
        if (region.concept) {
          conceptCounts[region.concept] = (conceptCounts[region.concept] || 0) + 1;
        }
        totalR += region.avgColor[0];
        totalG += region.avgColor[1];
        totalB += region.avgColor[2];
        totalCount++;
      }
    }

    const concepts = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([c]) => c);

    const avgR = Math.round(totalR / totalCount);
    const avgG = Math.round(totalG / totalCount);
    const avgB = Math.round(totalB / totalCount);
    const brightness = (avgR + avgG + avgB) / 3;

    return { concepts, avgColor: [avgR, avgG, avgB], brightness };
  }

  analyzeRegion(pixels, imgWidth, x, y, w, h) {
    let r = 0, g = 0, b = 0, count = 0;
    let maxSat = 0, maxSatColor = null;

    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const i = (py * imgWidth + px) * 4;
        if (i + 2 < pixels.length) {
          const pr = pixels[i], pg = pixels[i + 1], pb = pixels[i + 2];
          r += pr; g += pg; b += pb; count++;

          const pmax = Math.max(pr, pg, pb);
          const pmin = Math.min(pr, pg, pb);
          const psat = pmax === 0 ? 0 : (pmax - pmin) / pmax;
          if (psat > maxSat && pmax > 50) {
            maxSat = psat;
            maxSatColor = [pr, pg, pb];
          }
        }
      }
    }

    if (count === 0) return { avgColor: [128, 128, 128], concept: 'gray' };

    const avgR = Math.floor(r / count);
    const avgG = Math.floor(g / count);
    const avgB = Math.floor(b / count);

    const maxSatBright = maxSatColor ? (maxSatColor[0] + maxSatColor[1] + maxSatColor[2]) / 3 : 0;
    const useColor = (maxSat > 0.4 && maxSatBright > 80 && maxSatColor) ? maxSatColor : [avgR, avgG, avgB];
    const concept = detectConceptHSL(useColor[0], useColor[1], useColor[2]);

    return { avgColor: [avgR, avgG, avgB], concept };
  }

  generatePrompt(analysis) {
    // Create a natural language prompt from concepts
    const descriptions = analysis.concepts
      .slice(0, 4)
      .map(c => CONCEPT_DESCRIPTIONS[c] || c)
      .filter(Boolean);

    let prompt = descriptions.join(', ');
    
    // Add brightness hint
    if (analysis.brightness > 180) {
      prompt += ', bright and vibrant';
    } else if (analysis.brightness < 80) {
      prompt += ', dark and moody';
    }

    // Add style hints
    prompt += ', photorealistic, high quality';

    return prompt;
  }

  async generateImage(prompt, outputName) {
    const outputPath = path.join(this.outputDir, outputName);
    const scriptPath = '/opt/homebrew/Cellar/openclaw-cli/2026.2.3-1/libexec/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py';
    
    try {
      const cmd = `uv run "${scriptPath}" --prompt "${prompt.replace(/"/g, '\\"')}" --filename "${outputPath}" --resolution 1K 2>&1`;
      console.log(`   Generating: ${prompt.slice(0, 60)}...`);
      const result = execSync(cmd, { timeout: 60000, encoding: 'utf-8' });
      
      // Check if file was created
      if (fs.existsSync(outputPath)) {
        return outputPath;
      }
      
      // Try to extract path from MEDIA: line
      const mediaMatch = result.match(/MEDIA:(.+\.png)/);
      if (mediaMatch) {
        return mediaMatch[1];
      }
      
      return null;
    } catch (err) {
      console.error(`   Error: ${err.message}`);
      return null;
    }
  }

  async compareImages(originalPath, generatedPath) {
    if (!generatedPath || !fs.existsSync(generatedPath)) {
      return { similarity: 0, error: 'Generated image not found' };
    }

    try {
      const origAnalysis = await this.analyzeImage(originalPath);
      const genAnalysis = await this.analyzeImage(generatedPath);

      // Compare concepts
      const origConcepts = new Set(origAnalysis.concepts);
      const genConcepts = new Set(genAnalysis.concepts);
      const sharedConcepts = [...origConcepts].filter(c => genConcepts.has(c));
      const conceptSimilarity = sharedConcepts.length / Math.max(origConcepts.size, 1);

      // Compare colors
      const colorDiff = Math.sqrt(
        Math.pow(origAnalysis.avgColor[0] - genAnalysis.avgColor[0], 2) +
        Math.pow(origAnalysis.avgColor[1] - genAnalysis.avgColor[1], 2) +
        Math.pow(origAnalysis.avgColor[2] - genAnalysis.avgColor[2], 2)
      );
      const colorSimilarity = Math.max(0, 1 - colorDiff / 441); // 441 = max RGB distance

      // Compare brightness
      const brightDiff = Math.abs(origAnalysis.brightness - genAnalysis.brightness);
      const brightSimilarity = Math.max(0, 1 - brightDiff / 255);

      // Weighted average
      const similarity = conceptSimilarity * 0.5 + colorSimilarity * 0.3 + brightSimilarity * 0.2;

      return {
        similarity: Math.round(similarity * 100),
        conceptMatch: Math.round(conceptSimilarity * 100),
        colorMatch: Math.round(colorSimilarity * 100),
        brightMatch: Math.round(brightSimilarity * 100),
        sharedConcepts
      };
    } catch (err) {
      return { similarity: 0, error: err.message };
    }
  }

  async runTest(imageName) {
    const imagePath = path.join(__dirname, '../test-images', imageName);
    
    if (!fs.existsSync(imagePath)) {
      return { name: imageName, status: 'SKIP', reason: 'Image not found' };
    }

    console.log(`\n🖼️  ${imageName}`);
    
    // Analyze original
    const analysis = await this.analyzeImage(imagePath);
    console.log(`   Concepts: ${analysis.concepts.join(', ')}`);
    
    // Generate prompt
    const prompt = this.generatePrompt(analysis);
    console.log(`   Prompt: ${prompt}`);
    
    // Generate image
    const baseName = path.basename(imageName, path.extname(imageName));
    const outputName = `gen-${baseName}.png`;
    const generatedPath = await this.generateImage(prompt, outputName);
    
    if (!generatedPath) {
      return { name: imageName, status: 'FAIL', reason: 'Generation failed' };
    }
    
    console.log(`   Generated: ${generatedPath}`);
    
    // Compare
    const comparison = await this.compareImages(imagePath, generatedPath);
    
    if (comparison.error) {
      return { name: imageName, status: 'FAIL', reason: comparison.error };
    }
    
    const passed = comparison.similarity >= 30; // 30% similarity threshold
    
    console.log(`   Similarity: ${comparison.similarity}% (concept: ${comparison.conceptMatch}%, color: ${comparison.colorMatch}%, bright: ${comparison.brightMatch}%)`);
    console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'}`);
    
    return {
      name: imageName,
      status: passed ? 'PASS' : 'FAIL',
      similarity: comparison.similarity,
      details: comparison,
      prompt,
      generatedPath
    };
  }

  async runAllTests(imageNames) {
    console.log('🎨 Image Generation Test Suite\n');
    console.log('='.repeat(60));
    
    const results = [];
    let passed = 0, failed = 0, skipped = 0;

    for (const name of imageNames) {
      const result = await this.runTest(name);
      results.push(result);

      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log(`   Pass rate: ${Math.round(passed / (passed + failed) * 100)}%`);
    console.log(`\n   Generated images saved to: ${this.outputDir}`);

    return { passed, failed, skipped, results };
  }
}

// Test images to use
const TEST_IMAGES = [
  'mountain-sunset.jpg',
  'ocean-beach.jpg', 
  'city-night.jpg',
  'fire-flames.jpg',
  'starry-night.jpg'
];

// Parse args
const args = process.argv.slice(2);
const specificImage = args[0];

const tester = new ImageGenTester();

if (specificImage) {
  tester.runTest(specificImage).then(result => {
    console.log('\nResult:', JSON.stringify(result, null, 2));
  });
} else {
  tester.runAllTests(TEST_IMAGES).then(summary => {
    process.exit(summary.failed > 0 ? 1 : 0);
  });
}
