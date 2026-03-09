'use strict';

const request = require('supertest');
const { app, getRequestCount, getRecentPayloads } = require('./index');

describe('POST /GitHub/webhook', () => {
  it('returns 200 with { ok: true }', async () => {
    const res = await request(app)
      .post('/GitHub/webhook')
      .set('Content-Type', 'application/json')
      .send({ action: 'opened' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('increments the request counter', async () => {
    const before = getRequestCount();
    await request(app)
      .post('/GitHub/webhook')
      .set('Content-Type', 'application/json')
      .send({ action: 'closed' });

    expect(getRequestCount()).toBe(before + 1);
  });

  it('stores the payload in recentPayloads', async () => {
    const payload = { action: 'synchronize', number: 42 };
    await request(app)
      .post('/GitHub/webhook')
      .set('x-github-event', 'pull_request')
      .set('x-github-delivery', 'abc-123')
      .set('Content-Type', 'application/json')
      .send(payload);

    const payloads = getRecentPayloads();
    expect(payloads.length).toBeGreaterThan(0);
    const latest = payloads[0];
    expect(latest.headers['x-github-event']).toBe('pull_request');
    expect(latest.headers['x-github-delivery']).toBe('abc-123');
    expect(latest.body).toEqual(payload);
    expect(latest.receivedAt).toBeTruthy();
  });

  it('caps stored payloads at 10', async () => {
    for (let i = 0; i < 12; i++) {
      await request(app)
        .post('/GitHub/webhook')
        .set('Content-Type', 'application/json')
        .send({ index: i });
    }
    expect(getRecentPayloads().length).toBeLessThanOrEqual(10);
  });
});

describe('GET /', () => {
  it('returns 200 with HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('displays the total request count', async () => {
    const before = getRequestCount();
    await request(app)
      .post('/GitHub/webhook')
      .set('Content-Type', 'application/json')
      .send({ ping: true });

    const res = await request(app).get('/');
    const count = getRequestCount();
    expect(res.text).toContain(`${count}`);
  });

  it('displays recent payload information when present', async () => {
    await request(app)
      .post('/GitHub/webhook')
      .set('x-github-event', 'push')
      .set('Content-Type', 'application/json')
      .send({ ref: 'refs/heads/main' });

    const res = await request(app).get('/');
    expect(res.text).toContain('push');
    expect(res.text).toContain('refs/heads/main');
  });

  it('escapes HTML in payload bodies', async () => {
    await request(app)
      .post('/GitHub/webhook')
      .set('Content-Type', 'application/json')
      .send({ xss: '<script>alert(1)</script>' });

    const res = await request(app).get('/');
    expect(res.text).not.toContain('<script>');
    expect(res.text).toContain('&lt;script&gt;');
  });
});
