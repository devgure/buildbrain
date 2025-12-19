jest.mock('../middleware/auth', () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');

describe('Upload route', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    // mock minioClient, ocrService, embeddingsService, qdrantClient
    jest.doMock('../services/minioClient', () => ({ uploadFile: jest.fn().mockResolvedValue('s3://bucket/key') }));
    jest.doMock('../services/ocrService', () => ({ ocrFile: jest.fn().mockResolvedValue('extracted text') }));
    jest.doMock('../services/embeddingsService', () => ({ embedText: jest.fn().mockResolvedValue([0.1,0.2,0.3]) }));
    jest.doMock('../services/qdrantClient', () => ({ upsert: jest.fn().mockResolvedValue({}) }));

    const uploadRouter = require('../routes/upload');
    app = express();
    app.use(express.json());
    app.use('/upload', uploadRouter);
  });

  test('POST /upload returns 200', async () => {
    const res = await request(app).post('/upload').attach('file', Buffer.from('fake'), 'test.pdf');
    expect([200,201]).toContain(res.statusCode);
  });
});
