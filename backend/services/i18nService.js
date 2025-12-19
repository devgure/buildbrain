const fetch = require('node-fetch');

async function translate(text, targetLang){
  const apiKey = process.env.GOOGLE_API_KEY;
  if(!apiKey) return text; // no-op if not configured
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ q: text, target: targetLang })
  });
  const data = await res.json();
  return data.data && data.data.translations && data.data.translations[0].translatedText || text;
}

module.exports = { translate };
