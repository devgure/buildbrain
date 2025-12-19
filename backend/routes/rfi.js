const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middleware/auth');
const i18n = require('../services/i18nService');

const router = express.Router();

router.use(auth);

router.post('/', async (req, res) => {
  const { projectId, title, description, requesterId, assigneeId, linkedDocs } = req.body;
  try {
    const rfi = await prisma.rFI.create({ data: { projectId, title, description, status: 'open', requesterId, assigneeId, linkedDocs } });
    const accept = req.get('Accept-Language') || '';
    const targetLang = accept.split(',')[0] || null;
    if (targetLang) {
      try {
        rfi.translated = {
          title: await i18n.translate(rfi.title, targetLang),
          description: await i18n.translate(rfi.description, targetLang),
        };
      } catch (err) {
        console.warn('RFI translation failed:', err.message);
      }
    }
    res.json(rfi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'create failed' });
  }
});

router.get('/', async (req, res) => {
  const { projectId } = req.query;
  try {
    const rfis = await prisma.rFI.findMany({ where: { projectId: projectId || undefined } });
    const accept = req.get('Accept-Language') || '';
    const targetLang = accept.split(',')[0] || null;
    if (targetLang) {
      await Promise.all(rfis.map(async r => {
        try {
          r.translated = {
            title: await i18n.translate(r.title, targetLang),
            description: await i18n.translate(r.description, targetLang),
          };
        } catch (err) {
          // ignore translation errors per-item
        }
      }));
    }
    res.json(rfis);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'list failed' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const rfi = await prisma.rFI.findUnique({ where: { id: req.params.id } });
    const accept = req.get('Accept-Language') || '';
    const targetLang = accept.split(',')[0] || null;
    if (targetLang) {
      try {
        rfi.translated = {
          title: await i18n.translate(rfi.title, targetLang),
          description: await i18n.translate(rfi.description, targetLang),
        };
      } catch (err) {
        // ignore
      }
    }
    res.json(rfi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'get failed' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = req.body;
    const rfi = await prisma.rFI.update({ where: { id: req.params.id }, data });
    res.json(rfi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'update failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await prisma.rFI.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'delete failed' });
  }
});

module.exports = router;
