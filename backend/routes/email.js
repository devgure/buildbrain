const express = require('express');
const emailParser = require('../services/emailParser');
const auth = require('../middleware/auth');

const router = express.Router();

// email webhooks should be protected by a webhook secret; for now allow auth or disabled
router.post('/inbound', auth, async (req, res) => {
  try {
    const data = req.body;
    const accept = req.get('Accept-Language') || '';
    const targetLang = accept.split(',')[0] || null;
    const parsed = await emailParser.parseEmail(data, targetLang);
    // TODO: enqueue parsed event into orchestrator/temporal
    res.json({ ok: true, parsed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'parse failed' });
  }
});

module.exports = router;
