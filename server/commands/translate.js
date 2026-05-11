const { exec } = require("child_process");
const { promisify } = require("util");
const execPromise = promisify(exec);

// Simple translation using Google Translate via PowerShell web request
async function translate(text, targetLang) {
  const langMap = {
    'persian': 'fa', 'farsi': 'fa',
    'spanish': 'es',
    'english': 'en'
  };
  
  const langCode = langMap[targetLang.toLowerCase()] || targetLang;
  
  try {
    // Use free Google Translate API
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`;
    const { stdout } = await execPromise(`powershell -Command "(Invoke-WebRequest -Uri '${url}' -UseBasicParsing).Content"`);
    
    const parsed = JSON.parse(stdout);
    const translated = parsed[0].map(part => part[0]).join('');
    
    return { success: true, translated };
  } catch (error) {
    return { success: false, error: "Translation failed" };
  }
}

// For local use without internet, basic dictionary fallback
const dictionary = {
  fa: {
    'hello': 'سلام',
    'goodbye': 'خداحافظ',
    'thank you': 'ممنون',
    'yes': 'بله',
    'no': 'نه',
    'good morning': 'صبح بخیر',
    'good night': 'شب بخیر',
    'how are you': 'حالت چطوره',
    'i love you': 'دوستت دارم',
    'friend': 'دوست',
    'family': 'خانواده',
    'water': 'آب',
    'food': 'غذا',
    'time': 'زمان',
    'day': 'روز',
    'night': 'شب',
    'school': 'مدرسه',
    'work': 'کار',
    'home': 'خانه',
  },
  es: {
    'hello': 'hola',
    'goodbye': 'adiós',
    'thank you': 'gracias',
    'yes': 'sí',
    'no': 'no',
    'good morning': 'buenos días',
    'good night': 'buenas noches',
    'how are you': 'cómo estás',
    'i love you': 'te quiero',
    'friend': 'amigo',
    'family': 'familia',
    'water': 'agua',
    'food': 'comida',
    'time': 'tiempo',
    'day': 'día',
    'night': 'noche',
    'school': 'escuela',
    'work': 'trabajo',
    'home': 'casa',
  }
};

function localTranslate(text, targetLang) {
  const lang = targetLang.toLowerCase();
  const lookup = dictionary[lang];
  if (!lookup) return null;
  
  const lower = text.toLowerCase().trim();
  if (lookup[lower]) return lookup[lower];
  
  // Check partial matches
  for (const [key, value] of Object.entries(lookup)) {
    if (lower.includes(key)) return value;
  }
  
  return null;
}

module.exports = { translate, localTranslate };