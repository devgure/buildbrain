require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const uploadRouter = require('./routes/upload');
const qdrantStub = require('./services/qdrantStub');
const rfiRouter = require('./routes/rfi');
const emailRouter = require('./routes/email');
const scheduleRouter = require('./routes/schedule');
const billingRouter = require('./routes/billing');
const stripeWebhooks = require('./routes/stripe_webhooks');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// File upload route
app.use('/upload', uploadRouter);

// RFI routes
app.use('/rfis', rfiRouter);

// Email webhook
app.use('/email', emailRouter);

// Scheduling
app.use('/schedule', scheduleRouter);

// Billing
app.use('/billing', billingRouter);

// Stripe webhooks (must be mounted before JSON bodyParser or use raw)
app.use('/stripe', stripeWebhooks);

// Simple search endpoint (calls Qdrant stub)
app.post('/search', async (req, res) => {
  const { q } = req.body;
  if (!q) return res.status(400).json({ error: 'missing query' });
  const results = await qdrantStub.search(q);
  res.json({ results });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on ${PORT}`));
