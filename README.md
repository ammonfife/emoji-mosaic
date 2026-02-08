# Emoji Mosaic Generator

Convert images to emoji mosaics using **structural 4×4 pattern matching**.

Unlike simple average-color matching, this compares the actual rendered pattern of each emoji against source image blocks for more accurate results.

## Features

- **4×4 structural grid matching** - captures edges, gradients, and patterns within emojis
- **RGBLA per cell** - Red, Green, Blue, Luminance, Alpha for accurate matching
- **8 background presets** - white, black, iOS light/dark, Android light/dark, iMessage blue/green
- **Color + Grayscale modes** - full RGB or luminance-only matching
- **Fast** - pre-computed features enable real-time generation

## Quick Start

```bash
# Install dependencies
npm install

# Extract emoji features (one-time, ~2 min)
npm run extract

# Build web demo
npm run build

# Serve demo
npm run demo
# → Open http://localhost:3000
```

## How It Works

### 1. Feature Extraction

Each emoji is rendered at 64×64px on 8 different backgrounds, then downsampled to a 4×4 grid. Each cell stores:

- **R, G, B** - color values (0-1, premultiplied with background)
- **L** - luminance (0.299R + 0.587G + 0.114B)
- **A** - alpha/coverage (how opaque this cell is)

This gives 80 floats per emoji per background (16 cells × 5 values).

### 2. Image Matching

For each emoji-sized block in the source image:

1. Extract the same 4×4 RGBLA grid
2. Compare against all emoji grids using L2 distance
3. Weight by source alpha (transparent areas matter less)
4. Pick the emoji with the lowest distance

### 3. Structural Advantage

```
Average Color Only (1×1):
  Source: "red top-left, white bottom-right"
  Matches: 🟥 (solid red) ← Wrong!

Structural 4×4:
  Source: "red top-left, white bottom-right"  
  Matches: 🎅 (red hat, white beard) ← Correct pattern!
```

## Project Structure

```
emoji-mosaic/
├── scripts/
│   ├── extract-features.js  # Feature extraction from Twemoji
│   └── build-web.js         # Build web distribution
├── src/
│   ├── matcher.js           # Core matching algorithm
│   └── index.html           # Web demo UI
├── data/
│   └── emoji-features.json  # Extracted features (~500KB)
└── dist/                    # Built web files
```

## Customization

### Add More Backgrounds

Edit `CONFIG.backgrounds` in `extract-features.js`:

```javascript
backgrounds: {
  my_custom_bg: '#FF5733',
  discord_dark: '#313338',
  // ...
}
```

Then re-run `npm run extract`.

### Use Full Emoji Set

The default extracts ~500 curated emojis. For all ~3,900:

1. Modify `EMOJI_RANGES` in `extract-features.js` to cover the full Unicode emoji range
2. Or load from a complete emoji list JSON

### Embed in Your App

```javascript
import { createMatcher } from './matcher.js';

const matcher = await createMatcher('./emoji-features.json');

// Get image data from canvas
const ctx = canvas.getContext('2d');
const imageData = ctx.getImageData(0, 0, width, height);

// Generate mosaic
const mosaic = matcher.imageToMosaic(imageData, {
  width: 30,           // 30 emojis wide
  background: 'white', // or 'ios_dark', 'imsg_blue', etc.
  mode: 'color'        // or 'grayscale'
});

// Convert to string
const text = matcher.mosaicToString(mosaic);
console.log(text);
```

## Future Improvements

- [ ] Learned embeddings (autoencoder) for better compression
- [ ] WASM-accelerated matching
- [ ] Apple/Noto emoji variants (currently Twemoji only)
- [ ] Dithering for smoother gradients
- [ ] Video support (frame-by-frame)

## License

MIT

## Setup

```bash
# Install dependencies
npm install

# Extract emoji features (downloads ~3500 emojis from Twemoji)
node scripts/extract-all-emojis-v2.js

# Build the web app
npm run build

# Serve locally
npm run demo
```
