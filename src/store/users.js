'use strict';

let nextId = 4;

const users = [
  { id: 1, name: 'Anna Kowalska', email: 'anna@example.com', createdAt: '2026-01-10T08:00:00.000Z' },
  { id: 2, name: 'Jan Nowak',     email: 'jan@example.com',  createdAt: '2026-02-14T12:30:00.000Z' },
  { id: 3, name: 'Maria Wiśniewska', email: 'maria@example.com', createdAt: '2026-03-01T09:15:00.000Z' },
];

function getAll(page = 1, limit = 10) {
  const pageNum  = Math.max(1, parseInt(page, 10)  || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const start    = (pageNum - 1) * limitNum;
  const data     = users.slice(start, start + limitNum);

  return {
    data,
    page:       pageNum,
    limit:      limitNum,
    total:      users.length,
    totalPages: Math.ceil(users.length / limitNum),
  };
}

function findById(id) {
  return users.find((u) => u.id === parseInt(id, 10)) || null;
}

function findByEmail(email) {
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

function create({ name, email }) {
  const user = {
    id:        nextId++,
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return user;
}

function remove(id) {
  const idx = users.findIndex((u) => u.id === parseInt(id, 10));
  if (idx === -1) return false;
  users.splice(idx, 1);
  return true;
}

// Eksportuj też tablicę — przydatne przy resetowaniu stanu w testach
function reset() {
  users.length = 0;
  users.push(
    { id: 1, name: 'Anna Kowalska',    email: 'anna@example.com',  createdAt: '2026-01-10T08:00:00.000Z' },
    { id: 2, name: 'Jan Nowak',        email: 'jan@example.com',   createdAt: '2026-02-14T12:30:00.000Z' },
    { id: 3, name: 'Maria Wiśniewska', email: 'maria@example.com', createdAt: '2026-03-01T09:15:00.000Z' },
  );
  nextId = 4;
}

module.exports = { getAll, findById, findByEmail, create, remove, reset };
