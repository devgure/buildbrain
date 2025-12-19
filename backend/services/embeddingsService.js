const { Configuration, OpenAIApi } = require('openai')
const configuration = process.env.OPENAI_API_KEY ? new Configuration({ apiKey: process.env.OPENAI_API_KEY }) : null
const openai = configuration ? new OpenAIApi(configuration) : null

async function embedText(text) {
  if (!text) return null
  if (openai) {
    try {
      const resp = await openai.createEmbedding({ model: 'text-embedding-3-small', input: text })
      return resp.data.data[0].embedding
    } catch (err) {
      console.warn('OpenAI embedding failed, falling back to dummy vector', err.message)
    }
  }
  // fallback: deterministic pseudo-random vector based on text
  const vec = Array.from({ length: 1536 }, (_, i) => ((text.charCodeAt(i % text.length) || 31) % 100) / 100)
  return vec
}

module.exports = { embedText }
