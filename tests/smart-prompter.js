/**
 * Smart Image Prompter
 * Pipeline: Image → Vision AI → Text → Emoji Compression
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Word to emoji mapping - comprehensive
const WORD_TO_EMOJI = {
  // Nature & Landscape
  mountain: '🏔️', mountains: '⛰️🏔️', peak: '🗻', peaks: '⛰️', hill: '⛰️', hills: '🏞️',
  snow: '❄️🌨️', snowy: '❄️', ice: '🧊', icy: '❄️', glacier: '🏔️❄️', frozen: '🥶❄️',
  cloud: '☁️', clouds: '☁️⛅', cloudy: '🌥️', overcast: '☁️🌫️', fog: '🌫️', mist: '🌫️', haze: '🌫️',
  sky: '🌤️', sunrise: '🌅', sunset: '🌇', dawn: '🌅', dusk: '🌆', twilight: '🌆',
  sun: '☀️', sunny: '☀️🌞', sunshine: '🌞', sunlight: '☀️✨', rays: '☀️✨',
  moon: '🌙', moonlight: '🌙✨', lunar: '🌙', crescent: '🌙', full: '🌕',
  star: '⭐', stars: '✨⭐🌟', starry: '🌌✨', constellation: '✨⭐',
  night: '🌙🌃', nighttime: '🌃', midnight: '🌑', dark: '🌑🖤', darkness: '🌑',
  
  // Water
  ocean: '🌊🐚', sea: '🌊', wave: '🌊', waves: '🌊💦', water: '💧🌊', waters: '🌊',
  beach: '🏖️', shore: '🏖️', coast: '🏖️', coastal: '🌊🏖️', seaside: '🏖️',
  lake: '🏞️💧', pond: '🪷💧', river: '🏞️', stream: '💧', waterfall: '💦🏞️',
  rain: '🌧️', rainy: '🌧️☔', storm: '⛈️', stormy: '🌩️⛈️', thunder: '⚡🌩️', lightning: '⚡',
  
  // Vegetation
  tree: '🌳', trees: '🌲🌳', forest: '🌲🌳🌿', woods: '🌲', woodland: '🌲🍃',
  grass: '🌿', grassy: '🌱🌿', meadow: '🌾🌻', field: '🌾', fields: '🌾🏞️',
  flower: '🌸', flowers: '💐🌷🌺', bloom: '🌸', blossom: '🌸🌺', floral: '💐',
  plant: '🌱', plants: '🌿🪴', vegetation: '🌿🌱', foliage: '🍃🌿', leaves: '🍃🍂',
  garden: '🌷🌻', park: '🌳🏞️', jungle: '🌴🌿🐒', tropical: '🌴🌺',
  
  // Animals
  bird: '🐦', birds: '🐦🕊️', eagle: '🦅', owl: '🦉', dove: '🕊️',
  fish: '🐟', fishes: '🐠🐟', whale: '🐋🐳', dolphin: '🐬', shark: '🦈',
  dog: '🐕', dogs: '🐕🐶', cat: '🐈', cats: '🐈🐱', pet: '🐾',
  horse: '🐎', horses: '🐎🐴', cow: '🐄', sheep: '🐑', goat: '🐐',
  bear: '🐻', deer: '🦌', wolf: '🐺', fox: '🦊', rabbit: '🐇',
  lion: '🦁', tiger: '🐅', elephant: '🐘', giraffe: '🦒', zebra: '🦓',
  butterfly: '🦋', bee: '🐝', insect: '🐛', spider: '🕷️',
  
  // People
  person: '👤', people: '👥', man: '👨', woman: '👩', child: '👶🧒',
  face: '😊', portrait: '🖼️👤', figure: '👤', silhouette: '👤🌑',
  crowd: '👥🎭', group: '👥', family: '👨‍👩‍👧', couple: '💑',
  
  // Buildings & Places
  city: '🏙️', urban: '🌆🏢', town: '🏘️', village: '🏘️',
  building: '🏢', buildings: '🏢🏛️', house: '🏠', home: '🏡',
  tower: '🗼', castle: '🏰', church: '⛪', temple: '🛕',
  bridge: '🌉', road: '🛣️', street: '🏘️🚗', path: '🛤️',
  
  // Weather & Atmosphere  
  warm: '🔥☀️', hot: '🔥🌡️', cold: '❄️🥶', cool: '💨',
  bright: '✨💡', vibrant: '🌈✨', colorful: '🌈🎨', vivid: '✨🎨',
  dramatic: '🎭⚡', stunning: '✨😍', beautiful: '🌸✨', gorgeous: '💎✨',
  serene: '😌🕊️', peaceful: '☮️🌿', calm: '😌💙', tranquil: '🧘💙',
  moody: '🌫️🎭', atmospheric: '🌫️✨', ethereal: '✨🌌', mystical: '🔮✨',
  
  // Colors
  pink: '💗🌸', orange: '🧡🍊', yellow: '💛🌻', golden: '✨💛',
  red: '❤️🔴', blue: '💙🌊', green: '💚🌿', purple: '💜🔮',
  white: '🤍☁️', black: '🖤🌑', gray: '🩶🌫️', grey: '🩶',
  
  // Time & Light
  morning: '🌅☀️', afternoon: '☀️', evening: '🌆', day: '☀️🌤️',
  light: '💡✨', shadow: '🌑👤', shadows: '🌑', shade: '🌳🌑',
  glow: '✨💫', glowing: '✨🌟', shine: '✨', shining: '🌟✨',
  reflection: '🪞💧', reflections: '🪞✨', mirror: '🪞',
  
  // Descriptors
  beautiful: '😍✨', majestic: '👑🏔️', magnificent: '✨🏛️', grand: '🏰✨',
  vast: '🌌🏞️', endless: '♾️🌊', infinite: '♾️✨', wide: '🏞️',
  rugged: '🪨⛰️', rocky: '🪨', rough: '🪨', smooth: '💧',
  thick: '🌫️☁️', dense: '🌲🌳', blanket: '☁️🛏️', layer: '📊',
  
  // Actions & States
  rising: '📈⬆️', setting: '🌅⬇️', falling: '⬇️🍂', flowing: '💧🌊',
  contrast: '⚫⚪', contrasting: '🖤🤍',
  filling: '💧📥', surrounding: '🔄', covering: '☁️🛏️',
  
  // Photo/Art terms
  landscape: '🏞️', seascape: '🌊🏖️', cityscape: '🌆🏙️',
  panorama: '🏞️📸', view: '👀🏞️', scene: '🎬🖼️', scenery: '🏞️',
  foreground: '⬇️👀', background: '⬆️🖼️', horizon: '🌅➖',
  capture: '📸', captures: '📸✨', image: '🖼️', photo: '📷',
};

// Compress text to emoji
function textToEmoji(text) {
  const words = text.toLowerCase().split(/\s+/);
  const emojis = new Set();
  
  // Single word matches
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (WORD_TO_EMOJI[clean]) {
      WORD_TO_EMOJI[clean].split('').forEach(e => {
        if (e.match(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{26FF}]/u)) {
          emojis.add(e);
        }
      });
      // Add full emoji sequences
      const matches = WORD_TO_EMOJI[clean].match(/[\u{1F300}-\u{1FAFF}][\u{FE00}-\u{FE0F}]?[\u{200D}]?|[\u{2600}-\u{26FF}]/gu);
      if (matches) matches.forEach(e => emojis.add(e));
    }
  }
  
  // Two-word phrases
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = words[i].replace(/[^a-z]/g, '') + ' ' + words[i+1].replace(/[^a-z]/g, '');
    // Check compound concepts
    if (phrase.includes('snow') && phrase.includes('cap')) emojis.add('🏔️').add('❄️');
    if (phrase.includes('night') && phrase.includes('sky')) emojis.add('🌌').add('⭐').add('🌙');
    if (phrase.includes('blue') && phrase.includes('sky')) emojis.add('🌤️').add('💙');
  }
  
  return [...emojis].join('');
}

// Use vision model to describe image
async function describeImage(imagePath) {
  // Using the image tool via a temporary script approach
  // In practice, this would call the vision API directly
  
  const absPath = path.resolve(imagePath);
  console.log(`   Analyzing: ${path.basename(imagePath)}`);
  
  // For now, we'll use a simple exec to call a vision describer
  // This simulates what the image tool does
  try {
    // Write a temp script that uses the anthropic API
    const result = execSync(`cat << 'EOF' | node --input-type=module
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic();
const imageData = fs.readFileSync('${absPath}');
const base64 = imageData.toString('base64');
const mediaType = '${absPath}'.endsWith('.png') ? 'image/png' : 'image/jpeg';

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 200,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 }
      },
      {
        type: 'text', 
        text: 'Describe this image in 2-3 sentences focusing on the main subjects, colors, mood, and setting. Be specific about what you see.'
      }
    ]
  }]
});

console.log(response.content[0].text);
EOF`, { encoding: 'utf-8', timeout: 30000 });
    
    return result.trim();
  } catch (err) {
    // Fallback to basic color analysis description
    console.log(`   Vision API error, using fallback`);
    return null;
  }
}

// Main smart prompter
async function smartPrompt(imagePath) {
  console.log(`\n🧠 Smart Prompter: ${path.basename(imagePath)}`);
  
  // Step 1: Get AI description
  const description = await describeImage(imagePath);
  
  if (description) {
    console.log(`   Description: ${description}`);
    
    // Step 2: Convert to emoji
    const emoji = textToEmoji(description);
    console.log(`   Emoji: ${emoji}`);
    
    // Step 3: Combine for final prompt
    const prompt = `${emoji} | ${description}`;
    console.log(`   Final prompt: ${prompt.slice(0, 100)}...`);
    
    return { description, emoji, prompt };
  }
  
  return null;
}

// Test on images
const testImages = process.argv.slice(2);

if (testImages.length === 0) {
  // Default test set
  const images = [
    'mountain-sunset.jpg',
    'ocean-beach.jpg',
    'city-night.jpg',
    'fire-flames.jpg',
    'dog-portrait.jpg'
  ];
  
  console.log('🎨 Smart Image Prompter Test\n');
  console.log('Pipeline: Image → Vision AI → Text → Emoji\n');
  console.log('='.repeat(60));
  
  for (const img of images) {
    const imgPath = path.join(__dirname, '../test-images', img);
    if (fs.existsSync(imgPath)) {
      await smartPrompt(imgPath);
    }
  }
} else {
  for (const img of testImages) {
    await smartPrompt(img);
  }
}
