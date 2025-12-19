jest.mock('../middleware/auth', () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');

describe('RFI routes', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    // mock prismaClient before requiring the router
    const mockPrisma = {
      rFI: {
        create: jest.fn().mockResolvedValue({ id: '1', title: 'T' }),
        findMany: jest.fn().mockResolvedValue([{ id: '1', title: 'T' }]),
        findUnique: jest.fn().mockResolvedValue({ id: '1', title: 'T' }),
        update: jest.fn().mockResolvedValue({ id: '1', title: 'Updated' }),
        delete: jest.fn().mockResolvedValue({}),
      }
    };
    jest.doMock('../prismaClient', () => mockPrisma);

    const rfiRouter = require('../routes/rfi');
    app = express();
    app.use(express.json());
    app.use('/rfis', rfiRouter);
  });

  test('POST /rfis creates an RFI', async () => {
    const res = await request(app).post('/rfis').send({ projectId: 'p1', title: 'T', description: 'd' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id');
  });

  test('GET /rfis returns list', async () => {
    const res = await request(app).get('/rfis');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /rfis/:id returns single', async () => {
    const res = await request(app).get('/rfis/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('id', '1');
  });

  test('PUT /rfis/:id updates', async () => {
    const res = await request(app).put('/rfis/1').send({ title: 'Updated' });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Updated');
  });

  test('DELETE /rfis/:id deletes', async () => {
    const res = await request(app).delete('/rfis/1');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
