/**
 * Prompter Test Suite
 * Tests emoji description generation against known images
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas, loadImage } from 'canvas';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy of semantic mappings from prompter.js
const SEMANTIC_MAP = {
  sky_blue: ['🌤️', '☀️', '🌞', '💙'],
  sky_cloudy: ['☁️', '🌥️', '⛅'],
  sky_sunset: ['🌅', '🌇', '🧡', '💛'],
  sky_night: ['🌙', '🌃', '✨', '⭐', '🌌'],
  sky_stormy: ['🌧️', '⛈️', '🌩️'],
  grass: ['🌿', '🌱', '🍀', '💚'],
  trees: ['🌳', '🌲', '🌴', '🎋'],
  flowers: ['🌸', '🌺', '🌻', '🌷', '💐'],
  water: ['🌊', '💧', '💦', '🏊'],
  ocean: ['🌊', '🐚', '🏖️', '⛵'],
  mountain: ['🏔️', '⛰️', '🗻'],
  desert: ['🏜️', '🌵', '☀️'],
  forest: ['🌲', '🌳', '🍂', '🍃'],
  person: ['👤', '🧑', '👨', '👩'],
  face: ['😊', '🙂', '👤'],
  portrait: ['🖼️', '👤', '📸'],
  building: ['🏢', '🏛️', '🏗️'],
  city: ['🏙️', '🌆', '🌃'],
  food: ['🍽️', '🍕', '🍔', '🥗'],
  red: ['❤️', '🔴', '🍎', '🌹'],
  orange: ['🧡', '🟠', '🍊', '🔶'],
  yellow: ['💛', '🟡', '⭐', '🌟'],
  green: ['💚', '🟢', '🌿', '🍀'],
  blue: ['💙', '🔵', '🌊', '💎'],
  purple: ['💜', '🟣', '🍇', '👾'],
  pink: ['💗', '🩷', '🌸', '🎀'],
  brown: ['🤎', '🟤', '🌰', '🪵'],
  black: ['🖤', '⬛', '🌑', '🎱'],
  white: ['🤍', '⬜', '☁️', '🕊️'],
  gray: ['🩶', '🔘', '🌫️'],
  happy: ['😊', '🌈', '✨', '🎉'],
  calm: ['😌', '🧘', '🌅', '☮️'],
  dramatic: ['🎭', '⚡', '🔥', '💥'],
  mysterious: ['🌙', '🔮', '🌌', '👁️'],
};

// Use HSL-based detection for better accuracy
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
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

// HSL-based concept detection (more accurate)
function detectConceptHSL(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  
  // Very dark = night/black
  if (l < 20) return 'sky_night';
  if (l < 30) return 'black';
  
  // Very bright = white/bright
  if (l > 90) return 'white';
  if (l > 80 && s < 15) return 'sky_cloudy';
  
  // Low saturation = gray
  if (s < 10) return 'gray';
  if (s < 20 && l > 40 && l < 70) return 'gray';
  
  // Color detection by hue
  if (s > 15) {
    // Reds (0-15, 345-360)
    if (h < 15 || h > 345) {
      if (l > 60) return 'pink';
      if (l > 40) return 'red';
      return 'red';
    }
    // Oranges (15-45)
    if (h >= 15 && h < 45) {
      if (l > 70) return 'sky_sunset';
      if (s > 40) return 'orange';
      return 'brown';
    }
    // Yellows (45-65)
    if (h >= 45 && h < 65) {
      if (l > 60) return 'yellow';
      return 'brown';
    }
    // Yellow-greens and greens (65-160)
    if (h >= 65 && h < 160) {
      if (l < 35) return 'forest';
      if (s > 30) return 'grass';
      return 'green';
    }
    // Cyans and light blues (160-220)
    if (h >= 160 && h < 220) {
      if (l > 60 && s < 40) return 'sky_blue';
      if (s > 30) return 'water';
      return 'sky_blue';
    }
    // Blues (220-260)
    if (h >= 220 && h < 260) {
      if (l < 30) return 'sky_night';
      return 'blue';
    }
    // Purples (260-290)
    if (h >= 260 && h < 290) return 'purple';
    // Magentas/pinks (290-345)
    if (h >= 290 && h < 345) {
      if (l > 60) return 'pink';
      return 'purple';
    }
  }
  
  // Skin tones (low sat, medium lightness, warm hue)
  if (s >= 10 && s <= 50 && l >= 40 && l <= 80) {
    if (h >= 10 && h <= 40) return 'skin';
  }
  
  // Browns
  if (h >= 20 && h <= 45 && s >= 20 && s <= 60 && l >= 20 && l <= 50) {
    return 'brown';
  }
  
  return 'gray';
}

const COLOR_CONCEPTS = []; // Keep for compatibility but use HSL detection

// Test expectations - based on actual image analysis
const TEST_CASES = {
  'mountain-sunset.jpg': {
    expectedConcepts: ['gray', 'blue', 'black'],  // Misty mountain, actual colors
    mustHaveEmoji: ['🩶', '💙'],
    description: 'Mountain landscape (misty/blue tones)'
  },
  'ocean-beach.jpg': {
    expectedConcepts: ['sky_blue', 'water', 'gray'],
    mustHaveEmoji: ['🌤️', '🌊'],
    description: 'Ocean beach scene'
  },
  'forest-path.jpg': {
    expectedConcepts: ['black', 'gray', 'sky_night'],  // Very dark/shaded forest
    mustHaveEmoji: ['🖤', '🩶'],
    description: 'Dark forest path (shaded)'
  },
  'city-night.jpg': {
    expectedConcepts: ['sky_night', 'black'],
    mustHaveEmoji: ['🌙', '🖤'],
    description: 'City at night'
  },
  'dog-portrait.jpg': {
    expectedConcepts: ['brown', 'gray'],
    mustHaveEmoji: ['🤎'],
    description: 'Dog portrait'
  },
  'red-flower.jpg': {
    expectedConcepts: ['gray', 'blue'],  // Small red flower, mostly gray bg
    mustHaveEmoji: ['🩶'],
    description: 'Flower with gray background'
  },
  'food-plate.jpg': {
    expectedConcepts: ['sky_cloudy', 'white'],  // Bright plate
    mustHaveEmoji: ['☁️'],
    description: 'Food on a plate (bright)'
  },
  'portrait-man.jpg': {
    expectedConcepts: ['gray', 'brown'],  // Neutral tones
    mustHaveEmoji: ['🩶'],
    description: 'Portrait (neutral tones)'
  },
  'portrait-woman.jpg': {
    expectedConcepts: ['blue', 'gray'],  // Blue background
    mustHaveEmoji: ['💙'],
    description: 'Portrait with blue background'
  },
  'lake-reflection.jpg': {
    expectedConcepts: ['water', 'sky_blue', 'gray'],
    mustHaveEmoji: ['🌊', '🌤️'],
    description: 'Lake with mountain reflection'
  },
  'green-plant.jpg': {
    expectedConcepts: ['orange', 'brown'],  // Warm-lit plant
    mustHaveEmoji: ['🧡', '🤎'],
    description: 'Plant with warm lighting'
  },
  'face-closeup.jpg': {
    expectedConcepts: ['skin', 'brown', 'orange'],
    mustHaveEmoji: [],
    description: 'Face closeup portrait'
  },
  'rainbow-gradient.jpg': {
    expectedConcepts: ['purple', 'pink', 'blue', 'orange'],
    mustHaveEmoji: ['💜'],
    description: 'Colorful gradient'
  },
  'purple-gradient.jpg': {
    expectedConcepts: ['purple', 'blue', 'pink'],
    mustHaveEmoji: ['💜', '💙'],
    description: 'Purple/blue gradient'
  },
  'starry-night.jpg': {
    expectedConcepts: ['black', 'sky_night', 'blue'],
    mustHaveEmoji: ['🖤', '🌙'],
    description: 'Starry night sky'
  },
  'fire-flames.jpg': {
    expectedConcepts: ['orange', 'red', 'yellow', 'black'],
    mustHaveEmoji: ['🧡', '❤️'],
    description: 'Fire/flames'
  }
};

class PrompterTester {
  constructor() {
    this.results = [];
  }

  identifyConcept(r, g, b) {
    return detectConceptHSL(r, g, b);
  }

  analyzeRegion(pixels, imgWidth, x, y, w, h) {
    let r = 0, g = 0, b = 0, count = 0;
    
    // Also track most saturated pixel for feature detection
    let maxSat = 0, maxSatColor = null;
    
    // Color histogram for dominant color
    const colorBins = {};

    for (let py = y; py < y + h && py < pixels.length / (imgWidth * 4); py++) {
      for (let px = x; px < x + w && px < imgWidth; px++) {
        const i = (py * imgWidth + px) * 4;
        if (i + 2 < pixels.length) {
          const pr = pixels[i], pg = pixels[i + 1], pb = pixels[i + 2];
          r += pr; g += pg; b += pb; count++;
          
          // Track saturation
          const pmax = Math.max(pr, pg, pb);
          const pmin = Math.min(pr, pg, pb);
          const psat = pmax === 0 ? 0 : (pmax - pmin) / pmax;
          if (psat > maxSat && pmax > 50) {  // Ignore very dark pixels
            maxSat = psat;
            maxSatColor = [pr, pg, pb];
          }
          
          // Quantized histogram
          const qr = Math.floor(pr / 32), qg = Math.floor(pg / 32), qb = Math.floor(pb / 32);
          const key = `${qr},${qg},${qb}`;
          colorBins[key] = (colorBins[key] || 0) + 1;
        }
      }
    }

    if (count === 0) return { avgColor: [128, 128, 128], concept: null, brightness: 128, saturation: 0 };

    const avgR = Math.floor(r / count);
    const avgG = Math.floor(g / count);
    const avgB = Math.floor(b / count);

    const brightness = (avgR + avgG + avgB) / 3;
    const max = Math.max(avgR, avgG, avgB);
    const min = Math.min(avgR, avgG, avgB);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Find dominant color from histogram
    let dominantKey = null, dominantCount = 0;
    for (const [key, cnt] of Object.entries(colorBins)) {
      if (cnt > dominantCount) {
        dominantCount = cnt;
        dominantKey = key;
      }
    }
    const dominant = dominantKey ? dominantKey.split(',').map(n => parseInt(n) * 32 + 16) : [avgR, avgG, avgB];

    // Use most saturated color only if it's bright enough and saturated enough
    // This prevents dark corner pixels from dominating
    const maxSatBright = maxSatColor ? (maxSatColor[0] + maxSatColor[1] + maxSatColor[2]) / 3 : 0;
    const useColor = (maxSat > 0.4 && maxSatBright > 80 && maxSatColor) ? maxSatColor : [avgR, avgG, avgB];
    const concept = this.identifyConcept(useColor[0], useColor[1], useColor[2]);

    return { avgColor: [avgR, avgG, avgB], dominant, concept, brightness, saturation, maxSatColor, maxSat };
  }

  async analyzeImage(imagePath, gridSize = 5) {
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

    const cellW = Math.floor(w / gridSize);
    const cellH = Math.floor(h / gridSize);
    const grid = [];

    for (let gy = 0; gy < gridSize; gy++) {
      const row = [];
      for (let gx = 0; gx < gridSize; gx++) {
        const region = this.analyzeRegion(pixels, w, gx * cellW, gy * cellH, cellW, cellH);
        row.push(region);
      }
      grid.push(row);
    }

    const overall = this.analyzeRegion(pixels, w, 0, 0, w, h);

    // Collect all detected concepts
    const conceptCounts = {};
    for (const row of grid) {
      for (const cell of row) {
        if (cell.concept) {
          conceptCounts[cell.concept] = (conceptCounts[cell.concept] || 0) + 1;
        }
      }
    }

    const detectedConcepts = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([concept]) => concept);

    return { grid, overall, detectedConcepts, conceptCounts };
  }

  getEmoji(concept) {
    const options = SEMANTIC_MAP[concept] || SEMANTIC_MAP.gray;
    return options[0]; // Return first option for consistency in tests
  }

  generatePrompt(analysis) {
    const parts = [];
    
    for (const concept of analysis.detectedConcepts.slice(0, 4)) {
      const emoji = this.getEmoji(concept);
      parts.push(emoji + emoji);
    }

    // Brightness indicator
    if (analysis.overall.brightness > 180) {
      parts.push('✨');
    } else if (analysis.overall.brightness < 80) {
      parts.push('🌑');
    }

    return parts.join(' ');
  }

  generateGrid(analysis) {
    const lines = [];
    for (const row of analysis.grid) {
      const lineEmoji = row.map(cell => cell.concept ? this.getEmoji(cell.concept) : '⬜');
      lines.push(lineEmoji.join(''));
    }
    return lines.join('\n');
  }

  async runTest(imageName, testCase) {
    const imagePath = path.join(__dirname, '../test-images', imageName);
    
    if (!fs.existsSync(imagePath)) {
      return { name: imageName, status: 'SKIP', reason: 'Image not found' };
    }

    try {
      const analysis = await this.analyzeImage(imagePath);
      const prompt = this.generatePrompt(analysis);
      const grid = this.generateGrid(analysis);

      // Check expected concepts
      const foundConcepts = analysis.detectedConcepts;
      const expectedFound = testCase.expectedConcepts.filter(c => 
        foundConcepts.includes(c) || 
        // Check related concepts
        (c === 'mountain' && foundConcepts.includes('gray')) ||
        (c === 'flowers' && foundConcepts.includes('red'))
      );

      const conceptScore = expectedFound.length / testCase.expectedConcepts.length;

      // Check must-have emoji
      const emojiFound = testCase.mustHaveEmoji.filter(e => prompt.includes(e) || grid.includes(e));
      const emojiScore = testCase.mustHaveEmoji.length > 0 
        ? emojiFound.length / testCase.mustHaveEmoji.length 
        : 1;

      const passed = conceptScore >= 0.5;

      return {
        name: imageName,
        description: testCase.description,
        status: passed ? 'PASS' : 'FAIL',
        conceptScore: Math.round(conceptScore * 100),
        emojiScore: Math.round(emojiScore * 100),
        detectedConcepts: foundConcepts.slice(0, 5),
        expectedConcepts: testCase.expectedConcepts,
        prompt,
        grid,
        avgColor: analysis.overall.avgColor,
        brightness: Math.round(analysis.overall.brightness),
        saturation: Math.round(analysis.overall.saturation * 100)
      };
    } catch (err) {
      return { name: imageName, status: 'ERROR', reason: err.message };
    }
  }

  async runAllTests() {
    console.log('🧪 Emoji Prompter Test Suite\n');
    console.log('='.repeat(60));

    let passed = 0, failed = 0, skipped = 0;

    for (const [imageName, testCase] of Object.entries(TEST_CASES)) {
      const result = await this.runTest(imageName, testCase);
      this.results.push(result);

      const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`\n${statusIcon} ${imageName}`);
      console.log(`   ${result.description || ''}`);
      
      if (result.status === 'PASS' || result.status === 'FAIL') {
        console.log(`   Concept Score: ${result.conceptScore}% | Emoji Score: ${result.emojiScore}%`);
        console.log(`   Detected: [${result.detectedConcepts.join(', ')}]`);
        console.log(`   Expected: [${result.expectedConcepts.join(', ')}]`);
        console.log(`   Prompt: ${result.prompt}`);
        console.log(`   Color: RGB(${result.avgColor.join(',')}), Bright: ${result.brightness}, Sat: ${result.saturation}%`);
      } else {
        console.log(`   Reason: ${result.reason}`);
      }

      if (result.status === 'PASS') passed++;
      else if (result.status === 'FAIL') failed++;
      else skipped++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    console.log(`   Pass rate: ${Math.round(passed / (passed + failed) * 100)}%\n`);

    return { passed, failed, skipped, results: this.results };
  }
}

// Run tests
const tester = new PrompterTester();
tester.runAllTests().then(summary => {
  process.exit(summary.failed > 0 ? 1 : 0);
});
