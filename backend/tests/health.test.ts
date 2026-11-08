import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/database/index.js';

describe('GET /health', () => {
  it('responde HTTP 200 com status ok', async () => {
    const { db, sqlite } = openDatabase(':memory:');
    try {
      const response = await request(createApp(db)).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    } finally {
      sqlite.close();
    }
  });
});
