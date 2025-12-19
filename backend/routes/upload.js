const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const minioClient = require('../services/minioClient');
const ocrService = require('../services/ocrService');
const embeddingsService = require('../services/embeddingsService');
const qdrantClient = require('../services/qdrantClient');
const i18n = require('../services/i18nService');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads/') });

// Protected upload + ingestion endpoint
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'no file' });

    const localPath = req.file.path;
    const filename = req.file.originalname;

    // Upload to MinIO
    const objectName = `blueprints/${Date.now()}_${filename}`;
    await minioClient.uploadFile(localPath, objectName);

    // Run OCR: prefer Donut service if configured, otherwise Tesseract
    let text = null
    try {
      if (process.env.DONUT_URL) {
        const donut = require('../services/donutClient')
        const buf = require('fs').readFileSync(localPath)
        text = await donut.extractWithDonut(buf, filename)
      }
    } catch (err) {
      console.warn('Donut failed, falling back to tesseract:', err.message)
    }

    if (!text) {
      text = await ocrService.extractText(localPath) || `Indexed file ${filename}`;
    }

    // Compute embeddings (OpenAI or fallback)
    const vector = await embeddingsService.embedText(text);

    // If client requested translated text via Accept-Language, include translatedText
    const accept = req.get('Accept-Language') || '';
    const targetLang = accept.split(',')[0] || null;
    let translatedText = null;
    try {
      if (targetLang) translatedText = await i18n.translate(text, targetLang);
    } catch (err) {
      console.warn('Translation failed in upload route:', err.message);
    }

    // Index in Qdrant (or stub)
    await qdrantClient.indexDocument(objectName, text, vector);

    // Remove local file
    fs.unlink(localPath, () => {});

    const resp = { ok: true, object: objectName };
    if (translatedText) resp.translatedText = translatedText;
    res.json(resp);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'upload failed' });
  }
});

module.exports = router;
