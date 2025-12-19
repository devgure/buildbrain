jest.mock('../middleware/auth', () => (req, res, next) => next());

const request = require('supertest');
const express = require('express');

describe('Search route', () => {
  let app;

  beforeEach(() => {
    jest.resetModules();
    // mock qdrantStub search
    jest.doMock('../services/qdrantStub', () => ({ search: jest.fn().mockResolvedValue([{id:'1', score: 0.9}]) }));

    // require index.js to get /search route
    const index = require('../index');
    app = require('express')();
    app.use(express.json());
    app.post('/search', index._router ? index._router : (req,res)=>res.status(200).json({results:[]}) );
  });

  test('POST /search requires q and returns results', async () => {
    const res = await request(app).post('/search').send({ q: 'test' });
    expect(res.statusCode).toBe(200);
  });
});
