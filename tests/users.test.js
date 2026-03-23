'use strict';

const request = require('supertest');
const app     = require('../src/app');
const store   = require('../src/store/users');

// Resetuj store przed każdym testem — czyste środowisko
beforeEach(() => store.reset());

// ═══════════════════════════════════════════════════════════════════════════════
// GET /users
// ═══════════════════════════════════════════════════════════════════════════════
describe('GET /users', () => {
  test('zwraca 200 i poprawną strukturę paginacji', async () => {
    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      page:       1,
      limit:      10,
      total:      3,
      totalPages: 1,
    });
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(3);
  });

  test('obsługuje parametry paginacji ?page=2&limit=2', async () => {
    const res = await request(app).get('/users?page=2&limit=2');

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(2);
    expect(res.body.data).toHaveLength(1); // 3 użytkowników, strona 2 z limitem 2 → 1 element
    expect(res.body.totalPages).toBe(2);
  });

  test('każdy użytkownik ma pola id, name, email, createdAt', async () => {
    const res = await request(app).get('/users');

    res.body.data.forEach((user) => {
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('createdAt');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST /users
// ═══════════════════════════════════════════════════════════════════════════════
describe('POST /users', () => {
  test('tworzy nowego użytkownika i zwraca 201', async () => {
    const payload = { name: 'Piotr Zielony', email: 'piotr@example.com' };
    const res     = await request(app).post('/users').send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name:  'Piotr Zielony',
      email: 'piotr@example.com',
    });
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('createdAt');
  });

  test('zwraca 400 gdy brak pola "name"', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body).toHaveProperty('details');
    expect(res.body.details.some((d) => d.includes('"name"'))).toBe(true);
  });

  test('zwraca 400 gdy email ma niepoprawny format', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Test', email: 'to-nie-jest-email' });

    expect(res.status).toBe(400);
    expect(res.body.details.some((d) => d.includes('"email"'))).toBe(true);
  });

  test('zwraca 400 gdy brak obu pól', async () => {
    const res = await request(app).post('/users').send({});

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveLength(2);
  });

  test('zwraca 409 gdy email jest już zajęty', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Duplikat', email: 'anna@example.com' });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty('error');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /users/:id
// ═══════════════════════════════════════════════════════════════════════════════
describe('DELETE /users/:id', () => {
  test('usuwa istniejącego użytkownika i zwraca 204', async () => {
    const res = await request(app).delete('/users/1');

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
  });

  test('zwraca 404 gdy użytkownik nie istnieje', async () => {
    const res = await request(app).delete('/users/9999');

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  test('po usunięciu lista skraca się o 1', async () => {
    await request(app).delete('/users/2');
    const res = await request(app).get('/users');

    expect(res.body.total).toBe(2);
  });
});
