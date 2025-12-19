const tesseract = require('node-tesseract-ocr')

const config = {
  lang: 'eng',
  oem: 1,
  psm: 3
}

async function extractText(filePath) {
  try {
    const text = await tesseract.recognize(filePath, config)
    return text
  } catch (err) {
    console.warn('Tesseract failed, returning null', err.message)
    return null
  }
}

module.exports = { extractText }
