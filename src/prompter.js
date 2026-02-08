/**
 * Emoji Image Prompter
 * Converts images to emoji-based descriptions for AI recreation
 */

// Massive semantic emoji mappings - concepts to emoji
const SEMANTIC_MAP = {
  // Sky & Weather
  sky_blue: ['🌤️', '☀️', '🌞', '💙', '🩵', '🔵', '🏝️', '⛱️', '🪁', '🌈', '☁️', '🕊️', '✈️', '🛫'],
  sky_cloudy: ['☁️', '🌥️', '⛅', '🌫️', '🌁', '💨', '🌬️', '🕊️', '✈️', '🛩️'],
  sky_sunset: ['🌅', '🌇', '🧡', '💛', '🔶', '🟠', '🌄', '🏜️', '🦒', '🦁', '🐪', '🌾'],
  sky_night: ['🌙', '🌃', '✨', '⭐', '🌌', '🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘', '💫', '🪐', '🛸', '👽', '🔭', '🌠', '🎆', '🎇', '🦇', '🦉', '🐺', '🌲'],
  sky_stormy: ['🌧️', '⛈️', '🌩️', '⛱️', '☔', '💧', '🌊', '⚡', '🌪️', '🌀'],
  
  // Nature - Expanded
  grass: ['🌿', '🌱', '🍀', '💚', '🟢', '☘️', '🌾', '🎋', '🎍', '🪴', '🌵', '🪻', '🌻', '🐸', '🦗', '🦟', '🐛', '🦋', '🐝', '🐞', '🪲', '🐜', '🕷️'],
  trees: ['🌳', '🌲', '🌴', '🎋', '🎄', '🪵', '🪨', '🍂', '🍁', '🍃', '🌿', '🐿️', '🦜', '🦚', '🐒', '🦧', '🦍', '🐨', '🐼', '🦥', '🌰'],
  flowers: ['🌸', '🌺', '🌻', '🌷', '💐', '🌹', '🥀', '🪷', '🪻', '💮', '🏵️', '🌼', '🐝', '🦋', '🐛', '🌈'],
  water: ['🌊', '💧', '💦', '🏊', '🏄', '🚣', '⛵', '🛶', '🐟', '🐠', '🐡', '🦈', '🐳', '🐋', '🐬', '🦭', '🐧', '🦆', '🦢', '🌅', '🏝️', '⚓', '🚢', '🛳️'],
  ocean: ['🌊', '🐚', '🏖️', '⛵', '🚢', '🛳️', '🦑', '🐙', '🦞', '🦀', '🦐', '🐠', '🐟', '🐡', '🦈', '🐳', '🐋', '🐬', '🏄', '🤿', '🎣', '⚓', '🪸', '🐢', '🦭'],
  mountain: ['🏔️', '⛰️', '🗻', '🏕️', '⛺', '🥾', '🧗', '🦅', '🐐', '🦙', '🏂', '⛷️', '🎿', '🗿', '🪨'],
  desert: ['🏜️', '🌵', '☀️', '🦂', '🐪', '🐫', '🦎', '🐍', '🏺', '⌛', '🧭', '🔥', '🌡️'],
  forest: ['🌲', '🌳', '🍂', '🍃', '🍄', '🐻', '🦌', '🐺', '🦊', '🐗', '🦔', '🐿️', '🦝', '🦨', '🐾', '🪵', '🪨', '🏕️', '⛺', '🔥', '🌙', '🦉', '🦇'],
  
  // Animals
  animals: ['🐕', '🐈', '🐎', '🐄', '🐖', '🐑', '🐐', '🦌', '🐘', '🦏', '🦛', '🐪', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐'],
  pets: ['🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🐇', '🐹', '🐭', '🐀', '🐁', '🐿️', '🦔'],
  birds: ['🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐓', '🐔', '🐣', '🐤', '🐥', '🦃', '🦤'],
  sea_life: ['🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🪸', '🪼', '🦑', '🦞', '🦀', '🦐', '🐢', '🐊'],
  insects: ['🦋', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🪰', '🪱', '🦟'],
  
  // People & Figures - Expanded
  person: ['👤', '🧑', '👨', '👩', '🧔', '👱', '🧓', '👴', '👵', '👶', '🧒', '👦', '👧', '🙎', '🙍', '🙅', '🙆', '💁', '🙋', '🧏', '🙇', '🤦', '🤷'],
  people: ['👥', '👨‍👩‍👧', '🧑‍🤝‍🧑', '👫', '👭', '👬', '💑', '👪', '👨‍👩‍👦', '👨‍👩‍👧‍👦', '🤼', '👯'],
  face: ['😊', '🙂', '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥'],
  portrait: ['🖼️', '👤', '📸', '🎨', '🪞', '📷', '📹', '🎬', '🎭'],
  crowd: ['👥', '🎭', '🎪', '🏟️', '🎤', '🎸', '🎵', '🎶', '🎉', '🎊', '🪩'],
  
  // Activities & Sports
  sports: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤸', '⛹️', '🤺', '🚴', '🧗', '🤼', '🤽', '🤾', '🏌️', '🏇', '⛹️', '🏊', '🚣', '🧘'],
  
  // Buildings & Urban - Expanded
  building: ['🏢', '🏛️', '🏗️', '🏰', '🏯', '🕌', '🛕', '⛪', '🕍', '🏠', '🏡', '🏘️', '🏚️', '🏭', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🗼', '🗽', '⛲', '⛺', '🎪'],
  house: ['🏠', '🏡', '🏘️', '🏚️', '🛖', '🏕️', '⛺', '🪵', '🏰', '🏯', '💒'],
  city: ['🏙️', '🌆', '🌃', '🌇', '🌉', '🌁', '🚕', '🚖', '🚗', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🚲', '🛴', '🛵', '🏍️', '🚨', '🚥', '🚦', '🛑', '🚧'],
  street: ['🛣️', '🚗', '🏘️', '🚶', '🚶‍♂️', '🚶‍♀️', '🧑‍🦯', '🧑‍🦼', '🧑‍🦽', '🚴', '🛴', '🚌', '🚏', '🚥', '🚦', '🛤️', '🚃'],
  
  // Food & Drink - Expanded
  food: ['🍽️', '🍕', '🍔', '🥗', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡'],
  fruits: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🫒', '🥑'],
  vegetables: ['🥦', '🥬', '🥒', '🌶️', '🫑', '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥜', '🫘', '🌰'],
  drinks: ['🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧉', '🍾', '🍶', '🫗', '🍵', '☕', '🫖', '🧋', '🥤', '🧃', '🥛', '🍼'],
  desserts: ['🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯'],
  
  // Objects - Expanded
  vehicle: ['🚗', '🚙', '🚌', '✈️', '🚀', '🛸', '🚁', '🛩️', '🛫', '🛬', '⛵', '🚢', '🛳️', '⛴️', '🚂', '🚃', '🚄', '🚅', '🚆', '🚇', '🚈', '🚉', '🚊', '🚝', '🚞', '🚋', '🚲', '🛴', '🏍️', '🛵', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚜', '🛻', '🏎️', '🏍️'],
  tech: ['📱', '💻', '🖥️', '🖨️', '⌨️', '🖱️', '🖲️', '💽', '💾', '💿', '📀', '🧮', '🎮', '🕹️', '🎧', '🎤', '📷', '📸', '📹', '🎥', '📽️', '🎬', '📺', '📻', '🔌', '💡', '🔦', '🔋', '🪫'],
  music: ['🎵', '🎶', '🎼', '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎤', '🎧', '📯', '🔔', '🎚️', '🎛️'],
  book: ['📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📃', '📜', '📄', '📰', '🗞️', '📑', '🔖', '🏷️', '✉️', '📩', '📨', '📧', '💌', '📮', '📪', '📫', '📬', '📭', '📦'],
  art: ['🎨', '🖼️', '✨', '🖌️', '🖍️', '✏️', '🔍', '🔎', '🪞', '🎭', '🎪', '🎢', '🎡', '🎠'],
  tools: ['🔧', '🪛', '🔩', '⚙️', '🗜️', '⚖️', '🦯', '🔗', '⛓️', '🪝', '🧰', '🧲', '🪜', '⚗️', '🧪', '🧫', '🧬', '🔬', '🔭', '📡'],
  
  // Colors (pure) - Expanded with more objects of each color
  red: ['❤️', '🔴', '🍎', '🌹', '🍒', '🍓', '🥀', '🎈', '❣️', '💋', '👠', '🧣', '🧤', '🎒', '🏮', '📕', '🚗', '🚒', '🦞', '🦑', '🍅', '🌶️', '🫑', '🍷', '🎸', '🥊', '🎯', '🧧', '♥️', '♦️', '⛽', '🅰️', '🅱️', '🆎', '🅾️', '🔻', '🔺'],
  orange: ['🧡', '🟠', '🍊', '🔶', '🥕', '🎃', '🦊', '🐅', '🐯', '🦁', '🥧', '🏵️', '🔸', '📙', '🏀', '🥭', '🍑', '🦐', '🍤', '🥮', '🍁', '🔥', '🌅', '🌄', '🏜️'],
  yellow: ['💛', '🟡', '⭐', '🌟', '🌻', '🌼', '🍋', '🍌', '🌽', '🧀', '🐥', '🐤', '🐣', '🦆', '⚡', '💡', '🔔', '🏆', '🥇', '🎗️', '👑', '📒', '✨', '🌕', '🌙', '☀️', '🌞', '🔱', '⚜️', '🪙', '🛎️', '📀'],
  green: ['💚', '🟢', '🌿', '🍀', '☘️', '🌱', '🌲', '🌳', '🎋', '🎍', '🥒', '🥬', '🥦', '🥝', '🍏', '🐸', '🦎', '🐊', '🐢', '🐍', '🦖', '🌵', '🎄', '📗', '🔫', '🧩', '🪀', '♻️', '✅', '❎'],
  blue: ['💙', '🔵', '🌊', '💎', '🩵', '🧿', '🫐', '🐳', '🐋', '🐬', '🦋', '🐦', '🦕', '🧊', '❄️', '🌀', '💠', '🔷', '🔹', '📘', '🧢', '👖', '🩱', '🌐', '🛟', '🪣', '🎽', '🥏', '🛝'],
  purple: ['💜', '🟣', '🍇', '👾', '🔮', '🪻', '☂️', '🌂', '🍆', '🫐', '🦄', '🪁', '🎆', '🧕', '👿', '😈', '🛐', '☮️', '✝️', '☪️', '🕉️', '☯️', '✡️', '🔯', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'],
  pink: ['💗', '🩷', '🌸', '🎀', '💕', '💖', '💝', '💘', '💓', '💞', '💟', '🌷', '🌺', '🦩', '🐷', '🐽', '🐖', '🧁', '🍧', '🍨', '🍥', '🩰', '👛', '👚', '🎟️', '🏩', '💒'],
  brown: ['🤎', '🟤', '🌰', '🪵', '🐻', '🦁', '🐴', '🐎', '🦌', '🐿️', '🦫', '🦔', '🐕', '🐩', '🏈', '⚾', '🏉', '🥜', '🥔', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🍖', '🍗', '🥩', '🌭', '🍔', '🍟', '🌮', '🌯', '🫔', '🥙', '🧆', '🪺', '📦', '👜', '👞', '🪘', '🪕', '🎻'],
  black: ['🖤', '⬛', '🌑', '🎱', '🦇', '🐈‍⬛', '🕷️', '🕸️', '🦍', '🐻‍❄️', '🐧', '🎩', '🎓', '🕶️', '💣', '🏴', '🏴‍☠️', '♠️', '♣️', '🔲', '▪️', '◾', '◼️', '⚫', '🔳', '⌨️', '🖥️', '💻', '🎮', '📷', '🎥'],
  white: ['🤍', '⬜', '☁️', '🕊️', '🦢', '🐇', '🐑', '🦙', '🐻‍❄️', '⛄', '☃️', '❄️', '🌨️', '💎', '🥛', '🍚', '🍙', '🧂', '🦴', '💀', '👻', '👰', '🧑‍🍳', '🥼', '📃', '📄', '🏳️', '⚪', '◽', '◻️', '▫️', '🔳', '💍', '🪥', '🛁', '🚽'],
  gray: ['🩶', '🔘', '🌫️', '🐘', '🦏', '🐺', '🐭', '🐀', '🦈', '🐋', '🌪️', '🌀', '💨', '🗿', '🪨', '⚙️', '🔩', '⛓️', '🖇️', '📎', '🗑️', '🪣', '🛢️', '🗄️', '📁'],
  
  // Mood & Atmosphere - Expanded
  happy: ['😊', '🌈', '✨', '🎉', '🎊', '🥳', '🎈', '🎁', '🏆', '🥇', '👏', '🙌', '💃', '🕺', '🎵', '🎶', '☀️', '🌻', '🦋', '🐝', '🍦', '🎂', '🧁', '🍭', '🍬', '🎠', '🎡', '🎢', '🪩'],
  calm: ['😌', '🧘', '🌅', '☮️', '🕊️', '🌿', '🍃', '🌊', '🏝️', '⛱️', '🌸', '🪷', '🧖', '💆', '🛀', '🛌', '📖', '☕', '🍵', '🌙', '⭐', '🎐', '🪴', '🧺'],
  dramatic: ['🎭', '⚡', '🔥', '💥', '🌪️', '🌋', '☄️', '💫', '🌠', '🎆', '🎇', '🏴‍☠️', '⚔️', '🗡️', '🛡️', '👑', '🦅', '🐉', '🔮', '🎩', '🃏'],
  romantic: ['💕', '🌹', '💑', '🥰', '💏', '💋', '💘', '💝', '💖', '💗', '💓', '💞', '💟', '❣️', '❤️‍🔥', '💐', '🌸', '🌷', '🍫', '🍷', '🥂', '🎻', '🕯️', '🌙', '✨', '🌃', '🌉', '🎠', '💒', '👰', '🤵', '💍'],
  mysterious: ['🌙', '🔮', '🌌', '👁️', '🦉', '🦇', '🐈‍⬛', '🕷️', '🕸️', '🌑', '🌒', '🌘', '⭐', '✨', '💫', '🪬', '🧿', '🎴', '🃏', '🗝️', '🔐', '📿', '🧙', '🧛', '👻', '💀', '☠️', '🏚️', '🌫️', '🌀'],
  energetic: ['⚡', '🔥', '💥', '🚀', '🏃', '💨', '🎸', '🤘', '🎤', '🎵', '🪩', '💃', '🕺', '🏄', '🏂', '⛷️', '🚴', '🏎️', '🏍️', '🛹', '🎢', '🎡', '🎆', '🎇', '🌋', '☄️'],
  peaceful: ['🕊️', '☮️', '🌿', '😌', '🧘', '🪷', '🌅', '🌄', '🏞️', '🏕️', '⛺', '🛶', '🚣', '🎣', '🌲', '🌳', '🦌', '🐿️', '🦋', '🐝', '🌸', '🌼', '🍃', '💧', '☁️', '⛅', '🌤️'],
  
  // Composition
  centered: ['🎯', '⭕', '🔵', '🔴', '⚫', '⚪', '🟢', '🟡', '🟣', '🟠', '🟤', '👁️', '🧿', '💎', '🪬'],
  symmetrical: ['⚖️', '🔳', '🔲', '🎭', '♊', '🦋', '🪞', '🏛️', '🏰', '⛩️', '🕌'],
  layered: ['📊', '🗃️', '📚', '🍰', '🎂', '🏔️', '⛰️', '🌄', '🌅', '🏞️', '🌈'],
  framed: ['🖼️', '📷', '📸', '🪟', '🚪', '🏛️', '🎬', '📺', '🖥️', '📱'],
  
  // Skin tones (for portraits)
  skin: ['👤', '🧑', '👨', '👩', '👶', '🧒', '👦', '👧', '🧔', '👱', '🧓', '👴', '👵', '🤰', '🤱', '👼', '🎅', '🤶', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟', '💆', '💇', '🚶', '🧎', '🏃', '💃', '🕺', '🧘', '🛀', '🛌']
};

// HSL-based detection (more accurate than RGB ranges)
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

// Color to concept mapping (legacy, kept for reference)
const COLOR_CONCEPTS = [
  { range: [[180, 220], [200, 255], [220, 255]], concept: 'sky_blue', name: 'blue sky' },
  { range: [[200, 240], [200, 240], [200, 255]], concept: 'sky_cloudy', name: 'cloudy' },
  { range: [[220, 255], [150, 200], [50, 150]], concept: 'sky_sunset', name: 'sunset' },
  { range: [[0, 50], [0, 50], [30, 100]], concept: 'sky_night', name: 'night' },
  { range: [[50, 150], [120, 200], [30, 100]], concept: 'grass', name: 'grass/foliage' },
  { range: [[20, 80], [60, 120], [20, 60]], concept: 'forest', name: 'forest' },
  { range: [[180, 255], [180, 240], [150, 220]], concept: 'skin', name: 'skin tones' },
  { range: [[0, 100], [100, 200], [150, 255]], concept: 'water', name: 'water' },
  { range: [[200, 255], [50, 120], [50, 120]], concept: 'red', name: 'red' },
  { range: [[220, 255], [150, 220], [50, 130]], concept: 'orange', name: 'orange' },
  { range: [[230, 255], [200, 255], [50, 150]], concept: 'yellow', name: 'yellow' },
  { range: [[100, 180], [50, 120], [150, 220]], concept: 'purple', name: 'purple' },
  { range: [[200, 255], [150, 210], [180, 230]], concept: 'pink', name: 'pink' },
  { range: [[100, 180], [80, 140], [50, 100]], concept: 'brown', name: 'brown' },
  { range: [[220, 255], [220, 255], [220, 255]], concept: 'white', name: 'white/bright' },
  { range: [[0, 60], [0, 60], [0, 60]], concept: 'black', name: 'black/dark' },
  { range: [[100, 180], [100, 180], [100, 180]], concept: 'gray', name: 'gray' },
];

class ImagePrompter {
  constructor() {
    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.currentImage = null;
    this.currentMode = 'prompt';
    this.detailLevels = {
      minimal: { gridSize: 3, maxEmoji: 10 },
      standard: { gridSize: 5, maxEmoji: 25 },
      detailed: { gridSize: 7, maxEmoji: 50 },
      rich: { gridSize: 10, maxEmoji: 100 }
    };
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.loadImage(file);
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files[0]) this.loadImage(e.target.files[0]);
    });
    
    document.getElementById('copyBtn').addEventListener('click', () => this.copyOutput());
    document.getElementById('regenerateBtn').addEventListener('click', () => this.analyze());
    
    document.querySelectorAll('.mode-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentMode = tab.dataset.mode;
        this.updateHelpText();
        if (this.currentImage) this.analyze();
      });
    });
    
    ['detailLevel', 'includeComposition', 'includeColors', 'includeMood'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => {
        if (this.currentImage) this.analyze();
      });
    });
  }
  
  updateHelpText() {
    const helpTexts = {
      prompt: '<strong>Color Analysis:</strong> Emoji based on detected colors and concepts',
      vision: '<strong>Vision → Emoji:</strong> Paste an AI description (ChatGPT/Claude) for semantic emoji',
      grid: '<strong>Spatial Grid:</strong> Shows emoji layout matching image composition',
      story: '<strong>Story Mode:</strong> Narrative description of the scene'
    };
    document.getElementById('helpText').innerHTML = helpTexts[this.currentMode];
  }
  
  loadImage(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        this.currentImage = img;
        
        // Show preview
        const dropZone = document.getElementById('dropZone');
        dropZone.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        
        // Enable buttons
        document.getElementById('copyBtn').disabled = false;
        document.getElementById('regenerateBtn').disabled = false;
        
        this.analyze();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  analyze() {
    if (!this.currentImage) return;
    
    const level = this.detailLevels[document.getElementById('detailLevel').value];
    const analysis = this.analyzeImage(level.gridSize);
    
    let output;
    switch (this.currentMode) {
      case 'prompt':
        output = this.generatePrompt(analysis, level.maxEmoji);
        break;
      case 'grid':
        output = this.generateGrid(analysis);
        break;
      case 'story':
        output = this.generateStory(analysis, level.maxEmoji);
        break;
    }
    
    document.getElementById('output').textContent = output;
    
    // Stats
    const emojiCount = (output.match(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu) || []).length;
    document.getElementById('stats').textContent = `${emojiCount} emoji used`;
  }
  
  analyzeImage(gridSize) {
    // Scale image for analysis
    const maxSize = 200;
    const scale = Math.min(maxSize / this.currentImage.width, maxSize / this.currentImage.height);
    const w = Math.floor(this.currentImage.width * scale);
    const h = Math.floor(this.currentImage.height * scale);
    
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.drawImage(this.currentImage, 0, 0, w, h);
    
    const imageData = this.ctx.getImageData(0, 0, w, h);
    const pixels = imageData.data;
    
    // Analyze grid regions
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
    
    // Overall analysis
    const overall = this.analyzeRegion(pixels, w, 0, 0, w, h);
    
    // Detect composition
    const composition = this.detectComposition(grid);
    
    // Detect dominant concepts
    const concepts = this.detectConcepts(grid, overall);
    
    return { grid, overall, composition, concepts, aspectRatio: w / h };
  }
  
  analyzeRegion(pixels, imgWidth, x, y, w, h) {
    let r = 0, g = 0, b = 0, count = 0;
    const colors = {};
    
    // Track most saturated pixel for feature detection
    let maxSat = 0, maxSatColor = null;
    
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) {
        const i = (py * imgWidth + px) * 4;
        const pr = pixels[i], pg = pixels[i + 1], pb = pixels[i + 2];
        r += pr;
        g += pg;
        b += pb;
        count++;
        
        // Track saturation
        const pmax = Math.max(pr, pg, pb);
        const pmin = Math.min(pr, pg, pb);
        const psat = pmax === 0 ? 0 : (pmax - pmin) / pmax;
        if (psat > maxSat && pmax > 50) {  // Ignore very dark pixels
          maxSat = psat;
          maxSatColor = [pr, pg, pb];
        }
        
        // Quantize for histogram
        const qr = Math.floor(pr / 32);
        const qg = Math.floor(pg / 32);
        const qb = Math.floor(pb / 32);
        const key = `${qr},${qg},${qb}`;
        colors[key] = (colors[key] || 0) + 1;
      }
    }
    
    const avgR = Math.floor(r / count);
    const avgG = Math.floor(g / count);
    const avgB = Math.floor(b / count);
    
    // Find dominant quantized color
    let maxCount = 0;
    let dominant = null;
    for (const [key, cnt] of Object.entries(colors)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominant = key.split(',').map(n => parseInt(n) * 32 + 16);
      }
    }
    
    // Calculate brightness and saturation
    const brightness = (avgR + avgG + avgB) / 3;
    const max = Math.max(avgR, avgG, avgB);
    const min = Math.min(avgR, avgG, avgB);
    const saturation = max === 0 ? 0 : (max - min) / max;
    
    // Use most saturated color if it's bright enough and saturated enough
    // This helps detect colorful subjects on neutral backgrounds
    const maxSatBright = maxSatColor ? (maxSatColor[0] + maxSatColor[1] + maxSatColor[2]) / 3 : 0;
    const useColor = (maxSat > 0.4 && maxSatBright > 80 && maxSatColor) ? maxSatColor : [avgR, avgG, avgB];
    
    // Identify concept
    const concept = this.identifyConcept(useColor[0], useColor[1], useColor[2]);
    
    return {
      avgColor: [avgR, avgG, avgB],
      dominant,
      brightness,
      saturation,
      maxSatColor,
      maxSat,
      concept
    };
  }
  
  identifyConcept(r, g, b) {
    // Use HSL-based detection for better accuracy
    return detectConceptHSL(r, g, b);
  }
  
  detectComposition(grid) {
    const size = grid.length;
    const comp = {
      hasTop: false,
      hasBottom: false,
      hasCenter: false,
      isLayered: false,
      dominant: null
    };
    
    // Check top row (sky?)
    const topBrightness = grid[0].reduce((sum, c) => sum + c.brightness, 0) / size;
    const bottomBrightness = grid[size-1].reduce((sum, c) => sum + c.brightness, 0) / size;
    
    comp.hasTop = topBrightness > 150;
    comp.hasBottom = bottomBrightness < 150;
    comp.isLayered = Math.abs(topBrightness - bottomBrightness) > 50;
    
    // Check center
    const mid = Math.floor(size / 2);
    const centerBrightness = grid[mid][mid].brightness;
    const edgeBrightness = (grid[0][0].brightness + grid[0][size-1].brightness + 
                           grid[size-1][0].brightness + grid[size-1][size-1].brightness) / 4;
    comp.hasCenter = Math.abs(centerBrightness - edgeBrightness) > 30;
    
    return comp;
  }
  
  detectConcepts(grid, overall) {
    const conceptCounts = {};
    
    for (const row of grid) {
      for (const cell of row) {
        if (cell.concept) {
          conceptCounts[cell.concept] = (conceptCounts[cell.concept] || 0) + 1;
        }
      }
    }
    
    // Sort by frequency
    const sorted = Object.entries(conceptCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([concept]) => concept);
    
    return sorted;
  }
  
  getEmoji(concept, count = 1) {
    const options = SEMANTIC_MAP[concept] || SEMANTIC_MAP.gray;
    if (count === 1) {
      return options[Math.floor(Math.random() * options.length)];
    }
    const result = [];
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
      result.push(shuffled[i % shuffled.length]);
    }
    return result.join('');
  }
  
  getRandomEmoji(concept, count) {
    const options = SEMANTIC_MAP[concept] || SEMANTIC_MAP.gray;
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
  
  generatePrompt(analysis, maxEmoji) {
    const emojiCount = {
      minimal: 10,
      standard: 25,
      detailed: 50,
      rich: 100
    }[document.getElementById('detailLevel').value] || 25;
    
    const allEmoji = [];
    const parts = [];
    
    // Main concepts - use many varied emoji
    for (const concept of analysis.concepts.slice(0, 5)) {
      const count = Math.ceil(emojiCount / 5);
      const emoji = this.getRandomEmoji(concept, count);
      allEmoji.push(...emoji);
    }
    
    // Shuffle and add first batch
    const shuffled = allEmoji.sort(() => Math.random() - 0.5);
    parts.push(shuffled.slice(0, Math.floor(emojiCount * 0.6)).join(''));
    
    // Composition hints with varied emoji
    if (document.getElementById('includeComposition').checked) {
      if (analysis.composition.isLayered) {
        parts.push('⬆️🔝📈⬇️🔻📉');
      }
      if (analysis.composition.hasCenter) {
        const centerEmoji = this.getRandomEmoji('centered', 3);
        parts.push(centerEmoji.join(''));
      }
    }
    
    // Rich color palette
    if (document.getElementById('includeColors').checked) {
      const [r, g, b] = analysis.overall.avgColor;
      const colorEmoji = [];
      
      // Dominant color
      if (r > g && r > b) colorEmoji.push(...this.getRandomEmoji('red', 3));
      else if (g > r && g > b) colorEmoji.push(...this.getRandomEmoji('green', 3));
      else if (b > r && b > g) colorEmoji.push(...this.getRandomEmoji('blue', 3));
      
      // Warm vs cool
      if (r + g > b * 2) colorEmoji.push(...this.getRandomEmoji('orange', 2));
      if (b + g > r * 2) colorEmoji.push(...this.getRandomEmoji('water', 2));
      
      // Brightness indicators
      if (analysis.overall.brightness > 180) {
        colorEmoji.push('✨', '💫', '⭐', '🌟', '☀️', '💡');
      } else if (analysis.overall.brightness < 80) {
        colorEmoji.push('🌑', '🌙', '⭐', '✨', '🌌', '🦇');
      }
      
      if (colorEmoji.length) parts.push(colorEmoji.join(''));
    }
    
    // Rich mood section
    if (document.getElementById('includeMood').checked) {
      const brightness = analysis.overall.brightness;
      const saturation = analysis.overall.saturation;
      let moodEmoji = [];
      
      if (brightness > 180 && saturation > 0.3) {
        moodEmoji = this.getRandomEmoji('happy', 5);
      } else if (brightness < 80) {
        moodEmoji = this.getRandomEmoji('mysterious', 5);
      } else if (saturation > 0.5) {
        moodEmoji = this.getRandomEmoji('energetic', 4);
      } else if (saturation < 0.2) {
        moodEmoji = this.getRandomEmoji('calm', 4);
      } else {
        moodEmoji = this.getRandomEmoji('peaceful', 3);
      }
      
      if (moodEmoji.length) parts.push(moodEmoji.join(''));
    }
    
    // Spatial hints from grid with more emoji
    const size = analysis.grid.length;
    const mid = Math.floor(size / 2);
    
    // Top region (sky, background)
    const topConcept = analysis.grid[0][mid].concept;
    if (topConcept) {
      parts.push('⬆️' + this.getRandomEmoji(topConcept, 3).join(''));
    }
    
    // Bottom region (ground, foreground)
    const bottomConcept = analysis.grid[size-1][mid].concept;
    if (bottomConcept && bottomConcept !== topConcept) {
      parts.push('⬇️' + this.getRandomEmoji(bottomConcept, 3).join(''));
    }
    
    // Left and right edges for panoramic feel
    const leftConcept = analysis.grid[mid][0].concept;
    const rightConcept = analysis.grid[mid][size-1].concept;
    if (leftConcept && leftConcept !== topConcept && leftConcept !== bottomConcept) {
      parts.push('◀️' + this.getEmoji(leftConcept, 2));
    }
    if (rightConcept && rightConcept !== leftConcept) {
      parts.push('▶️' + this.getEmoji(rightConcept, 2));
    }
    
    return parts.join(' ');
  }
  
  generateGrid(analysis) {
    const lines = [];
    
    for (const row of analysis.grid) {
      const lineEmoji = [];
      for (const cell of row) {
        const emoji = cell.concept ? this.getEmoji(cell.concept) : '⬜';
        lineEmoji.push(emoji);
      }
      lines.push(lineEmoji.join(''));
    }
    
    return lines.join('\n');
  }
  
  generateStory(analysis, maxEmoji) {
    const parts = [];
    
    // Opening based on overall brightness
    if (analysis.overall.brightness > 180) {
      parts.push('✨ Bright scene:');
    } else if (analysis.overall.brightness < 80) {
      parts.push('🌙 Dark scene:');
    } else {
      parts.push('🖼️ Scene:');
    }
    
    // Top (often sky/background)
    const topConcept = analysis.grid[0][Math.floor(analysis.grid[0].length / 2)].concept;
    if (topConcept) {
      const name = COLOR_CONCEPTS.find(c => c.concept === topConcept)?.name || topConcept;
      parts.push(`${this.getEmoji(topConcept, 2)} ${name} above`);
    }
    
    // Main concepts
    for (const concept of analysis.concepts.slice(0, 3)) {
      const name = COLOR_CONCEPTS.find(c => c.concept === concept)?.name || concept.replace('_', ' ');
      parts.push(`${this.getEmoji(concept, 2)} ${name}`);
    }
    
    // Bottom (often ground/foreground)
    const size = analysis.grid.length;
    const bottomConcept = analysis.grid[size-1][Math.floor(size / 2)].concept;
    if (bottomConcept && bottomConcept !== topConcept) {
      const name = COLOR_CONCEPTS.find(c => c.concept === bottomConcept)?.name || bottomConcept;
      parts.push(`${this.getEmoji(bottomConcept, 2)} ${name} below`);
    }
    
    // Mood closer
    if (document.getElementById('includeMood').checked) {
      if (analysis.overall.saturation > 0.4) {
        parts.push('🎨 Vibrant colors');
      } else if (analysis.overall.saturation < 0.15) {
        parts.push('🌫️ Muted tones');
      }
    }
    
    return parts.join(' • ');
  }
  
  copyOutput() {
    const output = document.getElementById('output').textContent;
    navigator.clipboard.writeText(output).then(() => {
      const btn = document.getElementById('copyBtn');
      const orig = btn.textContent;
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = orig, 2000);
    });
  }
}

// Initialize
const prompter = new ImagePrompter();
