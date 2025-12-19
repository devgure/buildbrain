const axios = require('axios')
const qdrantStub = require('./qdrantStub')

const QDRANT_URL = process.env.QDRANT_URL || ''

async function indexDocument(id, text, vector=null) {
  if (process.env.PINECONE_API_KEY) {
    try {
      const pinecone = require('./pineconeClient')
      await pinecone.upsert(id, vector || [], { text })
      return { ok: true }
    } catch (err) {
      console.warn('Pinecone upsert failed', err.message)
    }
  }
  if (!QDRANT_URL) return qdrantStub.indexDocument(id, text, vector)
  try {
    // create collection if missing (simple)
    const collection = process.env.QDRANT_COLLECTION || 'buildbrain'
    await axios.put(`${QDRANT_URL}/collections/${collection}`, { vectors: { size: vector ? vector.length : 1536, distance: 'Cosine' } }).catch(()=>{})
    await axios.put(`${QDRANT_URL}/collections/${collection}/points`, { points: [{ id, vector, payload: { text } }] })
    return { ok: true }
  } catch (err) {
    console.warn('Qdrant client error; falling back to stub', err.message)
    return qdrantStub.indexDocument(id, text, vector)
  }
}

async function search(q, top=10) {
  if (!QDRANT_URL) return qdrantStub.search(q)
  try {
    const collection = process.env.QDRANT_COLLECTION || 'buildbrain'
    const resp = await axios.post(`${QDRANT_URL}/collections/${collection}/points/search`, { vector: null, limit: top, filter: { must: [{ key: 'text', match: { value: q } }] } })
    return resp.data.result || []
  } catch (err) {
    console.warn('Qdrant search failed', err.message)
    return qdrantStub.search(q)
  }
}

module.exports = { indexDocument, search }
