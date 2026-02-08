/**
 * Vision-based Emoji Prompter
 * Pipeline: Image → Vision AI description → Text-to-emoji compression
 * 
 * This module provides the text-to-emoji conversion.
 * The vision API call happens server-side or via the OpenClaw image tool.
 */

// Comprehensive word-to-emoji mapping
const WORD_TO_EMOJI = {
  // === NATURE & LANDSCAPE ===
  mountain: '🏔️', mountains: '⛰️🏔️', peak: '🗻', peaks: '⛰️', hill: '⛰️', hills: '🏞️',
  cliff: '🧗⛰️', cliffs: '🪨⛰️', ridge: '⛰️', valley: '🏞️', canyon: '🏜️',
  snow: '❄️', snowy: '❄️🌨️', ice: '🧊', icy: '❄️🥶', glacier: '🏔️❄️', frozen: '🥶',
  cloud: '☁️', clouds: '☁️⛅', cloudy: '🌥️', overcast: '☁️', fog: '🌫️', mist: '🌫️',
  sky: '🌤️', skies: '☁️🌤️', horizon: '🌅', vista: '🏞️',
  sunrise: '🌅', sunset: '🌇🌅', dawn: '🌅', dusk: '🌆', twilight: '🌆🌙',
  sun: '☀️', sunny: '☀️🌞', sunshine: '🌞✨', sunlight: '☀️✨', rays: '☀️✨', beam: '✨',
  moon: '🌙', moonlight: '🌙✨', lunar: '🌙', crescent: '🌙', moonlit: '🌙✨',
  star: '⭐', stars: '✨⭐🌟', starry: '🌌✨', constellation: '✨', stellar: '⭐',
  night: '🌃🌙', nighttime: '🌃', midnight: '🌑', dark: '🌑', darkness: '🌑🖤',
  
  // === WATER ===
  ocean: '🌊', sea: '🌊🐚', wave: '🌊', waves: '🌊💦', water: '💧🌊', waters: '🌊',
  beach: '🏖️', shore: '🏖️', coast: '🏖️⛱️', coastal: '🌊', seaside: '🏖️', sandy: '🏖️',
  lake: '🏞️💧', pond: '🪷', river: '🏞️💧', stream: '💧', creek: '💧', waterfall: '💦',
  rain: '🌧️', rainy: '🌧️☔', storm: '⛈️', stormy: '🌩️', thunder: '⚡', lightning: '⚡⛈️',
  tropical: '🌴🏝️', island: '🏝️', reef: '🪸', coral: '🪸',
  
  // === VEGETATION ===
  tree: '🌳', trees: '🌲🌳', forest: '🌲🌳', woods: '🌲', woodland: '🌲🍃', grove: '🌳',
  grass: '🌿', grassy: '🌱', meadow: '🌾🌻', field: '🌾', fields: '🌾🏞️', lawn: '🌿',
  flower: '🌸', flowers: '💐🌷', bloom: '🌸', blossom: '🌸🌺', floral: '💐', petal: '🌸',
  plant: '🌱', plants: '🌿🪴', vegetation: '🌿', foliage: '🍃', leaves: '🍃🍂', leaf: '🍃',
  garden: '🌷🌻', park: '🌳🏞️', jungle: '🌴🐒', rainforest: '🌴🌧️',
  green: '💚🌿', lush: '🌿✨', verdant: '🌲🌿',
  
  // === ANIMALS ===
  dog: '🐕', dogs: '🐕🐶', puppy: '🐶', beagle: '🐕', retriever: '🐕', labrador: '🐕',
  cat: '🐈', cats: '🐈🐱', kitten: '🐱', feline: '🐈',
  bird: '🐦', birds: '🐦🕊️', eagle: '🦅', owl: '🦉', dove: '🕊️', hawk: '🦅',
  fish: '🐟', whale: '🐋🐳', dolphin: '🐬', shark: '🦈', seal: '🦭',
  horse: '🐎', horses: '🐎🐴', deer: '🦌', bear: '🐻', wolf: '🐺', fox: '🦊',
  lion: '🦁', tiger: '🐅', elephant: '🐘', giraffe: '🦒', monkey: '🐒',
  butterfly: '🦋', bee: '🐝', insect: '🐛',
  pet: '🐾', animal: '🐾', wildlife: '🦌🦊',
  
  // === PEOPLE ===
  person: '👤', people: '👥', man: '👨', woman: '👩', child: '👶', children: '👶🧒',
  face: '😊', portrait: '🖼️👤', figure: '👤', silhouette: '👤',
  happy: '😊😄', joyful: '😄🎉', cheerful: '😊', smiling: '😊', smile: '😊',
  sad: '😢', melancholic: '😔', nostalgic: '😌💭',
  
  // === BUILDINGS & URBAN ===
  city: '🏙️', cities: '🌆', urban: '🏢🌆', town: '🏘️', village: '🏘️',
  building: '🏢', buildings: '🏢🏛️', tower: '🗼', skyscraper: '🏢',
  house: '🏠', home: '🏡', apartment: '🏢', residential: '🏘️',
  street: '🛣️', road: '🛣️', path: '🛤️', alley: '🏘️',
  japanese: '🇯🇵🏮', japan: '🇯🇵', tokyo: '🗼🇯🇵',
  bridge: '🌉', station: '🚉', neon: '💡✨',
  
  // === COLORS ===
  red: '❤️🔴', crimson: '❤️', scarlet: '🔴',
  orange: '🧡🍊', amber: '🧡💡', golden: '✨💛',
  yellow: '💛', gold: '✨💛',
  green: '💚🌿', emerald: '💚💎', olive: '🫒',
  blue: '💙', azure: '💙🌊', teal: '🩵💙', turquoise: '🩵', cyan: '🩵',
  purple: '💜', violet: '💜🔮', lavender: '💜🌸', magenta: '💜💗',
  pink: '💗🌸', rose: '🌹💗', coral: '🪸💗',
  brown: '🤎', tan: '🤎', beige: '🤎',
  white: '🤍', cream: '🤍', ivory: '🤍',
  black: '🖤', dark: '🌑🖤',
  gray: '🩶', grey: '🩶', silver: '🩶✨',
  colorful: '🌈', vibrant: '🌈✨', muted: '🌫️', pastel: '🎨',
  
  // === MOOD & ATMOSPHERE ===
  beautiful: '✨😍', stunning: '✨🤩', gorgeous: '💎✨', magnificent: '👑✨',
  serene: '😌☮️', peaceful: '☮️🕊️', calm: '😌💙', tranquil: '🧘💙', quiet: '🤫',
  dramatic: '🎭⚡', intense: '🔥', powerful: '💪⚡',
  romantic: '💕💗', dreamy: '💭✨', magical: '✨🔮', mystical: '🔮🌙',
  moody: '🌫️🎭', atmospheric: '🌫️', ethereal: '✨🌌',
  cozy: '🏠☕', warm: '🔥☀️', cool: '❄️💙', cold: '❄️🥶',
  playful: '🎉😄', fun: '🎉', joyful: '😄✨',
  lonely: '😔👤', solitude: '🧘👤', isolated: '🏝️',
  
  // === TIME & LIGHT ===
  morning: '🌅☀️', afternoon: '☀️', evening: '🌆', daytime: '☀️',
  light: '💡✨', bright: '✨💡', glow: '✨', glowing: '✨🌟', luminous: '✨',
  shadow: '🌑', shadows: '🌑👤', shade: '🌳', shady: '🌳🌑',
  reflection: '🪞💧', reflections: '🪞', mirror: '🪞',
  silhouette: '👤🌑', outline: '📐',
  
  // === PHOTO/ART TERMS ===
  landscape: '🏞️', seascape: '🌊🏖️', cityscape: '🌆🏙️',
  panorama: '🏞️', view: '👀🏞️', scene: '🎬', scenery: '🏞️',
  portrait: '🖼️👤', closeup: '🔍', macro: '🔬',
  cinematic: '🎬🎥', filmic: '🎬', aesthetic: '🎨✨',
  minimalist: '⬜', abstract: '🎨',
  
  // === MISC ===
  fire: '🔥', flames: '🔥', burning: '🔥',
  smoke: '💨', steam: '♨️💨',
  dirt: '🟤', mud: '🟤', soil: '🌱',
  rock: '🪨', rocks: '🪨', stone: '🪨', rocky: '🪨',
  power: '⚡', electric: '⚡', lines: '➖',
  tongue: '😛', mouth: '👄', open: '😮',
  sitting: '🧘', standing: '🧍', walking: '🚶',
  outdoor: '🌳🏞️', outdoors: '🌳', outside: '🌤️',
  indoor: '🏠', indoors: '🏠', inside: '🏠',
};

/**
 * Convert a text description to emoji
 * @param {string} text - Natural language description
 * @returns {string} - Emoji string
 */
export function textToEmoji(text) {
  if (!text) return '';
  
  const emojis = [];
  const words = text.toLowerCase().split(/[\s,.\-:;!?()]+/);
  const seen = new Set();
  
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, '');
    if (clean.length < 2) continue;
    
    // Direct match
    if (WORD_TO_EMOJI[clean] && !seen.has(clean)) {
      seen.add(clean);
      emojis.push(WORD_TO_EMOJI[clean]);
    }
    
    // Partial matches for compound words
    for (const [key, emoji] of Object.entries(WORD_TO_EMOJI)) {
      if (clean.includes(key) && clean !== key && !seen.has(key)) {
        seen.add(key);
        emojis.push(emoji);
      }
    }
  }
  
  // Dedupe emoji while preserving order
  const uniqueEmoji = [];
  const emojiSeen = new Set();
  for (const e of emojis.join('')) {
    if (!emojiSeen.has(e) && e.match(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u)) {
      emojiSeen.add(e);
      uniqueEmoji.push(e);
    }
  }
  
  return uniqueEmoji.slice(0, 30).join(''); // Limit to 30 emoji
}

/**
 * Create a full prompt from description
 * @param {string} description - AI-generated image description
 * @returns {object} - { emoji, prompt }
 */
export function createPrompt(description) {
  const emoji = textToEmoji(description);
  return {
    emoji,
    prompt: `${emoji} | ${description}`,
    description
  };
}

// Export for use in browser
if (typeof window !== 'undefined') {
  window.textToEmoji = textToEmoji;
  window.createPrompt = createPrompt;
}

export default { textToEmoji, createPrompt, WORD_TO_EMOJI };
