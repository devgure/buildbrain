const axios = require('axios')
const DONUT_URL = process.env.DONUT_URL || ''

async function extractWithDonut(fileBuffer, filename) {
  if (!DONUT_URL) throw new Error('DONUT_URL not configured')
  try {
    const form = new (require('form-data'))()
    form.append('file', fileBuffer, filename)
    const resp = await axios.post(`${DONUT_URL}/extract`, form, { headers: form.getHeaders(), timeout: 120000 })
    return resp.data.text
  } catch (err) {
    console.warn('Donut extraction failed', err.message)
    throw err
  }
}

module.exports = { extractWithDonut }
