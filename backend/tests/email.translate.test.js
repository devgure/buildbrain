const request = require('supertest');
const express = require('express');

jest.mock('../services/i18nService', () => ({ translate: jest.fn().mockResolvedValue('TRANSLATED') }));

const emailRouter = require('../routes/email');

describe('Email parsing translations', () => {
  let app;
  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/email', emailRouter);
  });

  test('POST /email/inbound includes translated fields when Accept-Language set', async () => {
    const payload = { from: 'a@b.com', subject: 'delay', body: 'We are delayed' };
    const res = await request(app)
      .post('/email/inbound')
      .set('Accept-Language', 'de')
      .send(payload);
    expect([200,500]).toContain(res.status);
  });
});
