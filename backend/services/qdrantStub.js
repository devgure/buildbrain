// Simple in-memory stub to simulate vector index behaviour
const index = [];

async function indexDocument(id, text) {
  index.push({ id, text, ts: Date.now() });
  return { ok: true };
}

async function search(q) {
  // naive search by substring
  const results = index
    .filter(d => d.text.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 10)
    .map(d => ({ id: d.id, snippet: d.text }));
  return results;
}

module.exports = { indexDocument, search };
