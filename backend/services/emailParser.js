// Simple email parsing heuristics for material-delay detection
const i18n = require('./i18nService');

async function parseEmail(payload, targetLang) {
  // payload expected: { from, subject, body, receivedAt }
  const from = payload.from || '';
  const subject = payload.subject || '';
  const bodyRaw = payload.body || '';
  const body = bodyRaw.toLowerCase();

  const keywordsDelay = ['delay', 'backorder', 'shipping', 'eta', 'lead time', 'out of stock', 'shortage', 'late'];
  const match = keywordsDelay.find(k => body.includes(k) || subject.toLowerCase().includes(k));

  const summary = (bodyRaw || '').slice(0, 200);

  const result = {
    from,
    subject,
    summary,
    isDelay: !!match,
    matchedKeyword: match || null,
  };

  // If translation requested, include translated fields (no-op if API key absent)
  try {
    if (targetLang) {
      result.translated = {
        subject: await i18n.translate(subject, targetLang),
        summary: await i18n.translate(summary, targetLang),
      };
    }
  } catch (err) {
    console.warn('Translation failed in emailParser:', err.message);
  }

  return result;
}

module.exports = { parseEmail };
