const express = require('express');
const prisma = require('../prismaClient');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

router.post('/tasks', async (req, res) => {
  const { projectId, title, startDate, endDate, assigneeId, dependencies } = req.body;
  try {
    const task = await prisma.scheduleTask.create({ data: { projectId, title, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null, assigneeId, dependencies: dependencies || [] } });
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'create task failed' });
  }
});

module.exports = router;
