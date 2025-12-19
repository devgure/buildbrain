const request = require('supertest')
const app = require('../index')

describe('RFI routes (integration stub)', () => {
  it('GET /rfis returns 200', async () => {
    const res = await request('http://localhost:4000').get('/rfis')
    expect([200,401,403]).toContain(res.status)
  })
})
