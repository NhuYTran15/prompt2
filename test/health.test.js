import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/ecommerce?schema=public';
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const { app } = await import('../src/app.js');

test('GET /health returns HTTP 200 with the basic health status', async () => {
  const response = await request(app).get('/health');
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
});

test('GET /health/live returns service status without a database dependency', async () => {
  const response = await request(app).get('/health/live');
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.service, 'ecommerce-api');
});

test('unknown route returns JSON 404', async () => {
  const response = await request(app).get('/does-not-exist');
  assert.equal(response.status, 404);
  assert.match(response.body.error.message, /not found/i);
});
