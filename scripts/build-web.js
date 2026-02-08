/**
 * Build script - copies files to dist/ for web serving
 */

import fs from 'fs/promises';
import path from 'path';

const DIST = './dist';

async function build() {
  console.log('📦 Building web distribution...\n');
  
  await fs.mkdir(DIST, { recursive: true });
  
  // Copy HTML
  await fs.copyFile('./src/index.html', path.join(DIST, 'index.html'));
  console.log('   ✓ index.html');
  
  // Copy matchers
  await fs.copyFile('./src/matcher.js', path.join(DIST, 'matcher.js'));
  console.log('   ✓ matcher.js (raw features)');
  
  try {
    await fs.copyFile('./src/matcher-fast.js', path.join(DIST, 'matcher-fast.js'));
    console.log('   ✓ matcher-fast.js (embeddings)');
  } catch (e) {}
  
  try {
    await fs.copyFile('./src/quad-refiner.js', path.join(DIST, 'quad-refiner.js'));
    console.log('   ✓ quad-refiner.js (2×2 refinement)');
  } catch (e) {}
  
  try {
    await fs.copyFile('./src/ja-diffuser.js', path.join(DIST, 'ja-diffuser.js'));
    console.log('   ✓ ja-diffuser.js (JA optimization)');
  } catch (e) {}
  
  // Copy data files
  try {
    await fs.copyFile('./data/emoji-features.json', path.join(DIST, 'emoji-features.json'));
    const size = (await fs.stat(path.join(DIST, 'emoji-features.json'))).size;
    console.log(`   ✓ emoji-features.json (${(size/1024/1024).toFixed(1)} MB)`);
  } catch (e) {
    console.log('   ⚠ emoji-features.json not found');
  }
  
  try {
    await fs.copyFile('./data/emoji-embeddings.json', path.join(DIST, 'emoji-embeddings.json'));
    const size = (await fs.stat(path.join(DIST, 'emoji-embeddings.json'))).size;
    console.log(`   ✓ emoji-embeddings.json (${(size/1024/1024).toFixed(1)} MB)`);
  } catch (e) {
    console.log('   ⚠ emoji-embeddings.json not found');
  }
  
  try {
    await fs.copyFile('./data/quad-codebook.json', path.join(DIST, 'quad-codebook.json'));
    const size = (await fs.stat(path.join(DIST, 'quad-codebook.json'))).size;
    console.log(`   ✓ quad-codebook.json (${(size/1024).toFixed(1)} KB)`);
  } catch (e) {
    console.log('   ⚠ quad-codebook.json not found');
  }
  
  try {
    await fs.copyFile('./data/sms-vectors.json', path.join(DIST, 'sms-vectors.json'));
    const size = (await fs.stat(path.join(DIST, 'sms-vectors.json'))).size;
    console.log(`   ✓ sms-vectors.json (${(size/1024).toFixed(1)} KB)`);
  } catch (e) {
    console.log('   ⚠ sms-vectors.json not found');
  }
  
  console.log('\n✅ Build complete! Run `npm run demo` to serve.');
}

build().catch(console.error);
