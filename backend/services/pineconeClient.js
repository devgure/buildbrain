const axios = require('axios')

const PINECONE_API_KEY = process.env.PINECONE_API_KEY
const PINECONE_ENV = process.env.PINECONE_ENV
const PINECONE_INDEX = process.env.PINECONE_INDEX || 'buildbrain'

async function upsert(id, vector, metadata={}) {
  if (!PINECONE_API_KEY || !PINECONE_ENV) throw new Error('Pinecone not configured')
  const url = `https://${PINECONE_INDEX}-${PINECONE_ENV}.svc.pinecone.io/vectors/upsert`
  const resp = await axios.post(url, { vectors: [{ id, values: vector, metadata }] }, { headers: { 'Api-Key': PINECONE_API_KEY, 'Content-Type': 'application/json' } })
  return resp.data
}

module.exports = { upsert }
