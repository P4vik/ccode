'use strict';

const express = require('express');
const store   = require('../store/users');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── GET /users ──────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { page, limit } = req.query;
  const result = store.getAll(page, limit);
  res.json(result);
});

// ─── POST /users ─────────────────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const { name, email } = req.body;
    const errors = [];

    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.push('Pole "name" jest wymagane i nie może być puste.');
    }
    if (!email || typeof email !== 'string' || email.trim() === '') {
      errors.push('Pole "email" jest wymagane i nie może być puste.');
    } else if (!EMAIL_RE.test(email.trim())) {
      errors.push('Pole "email" musi być poprawnym adresem e-mail.');
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Błąd walidacji.', details: errors });
    }

    if (store.findByEmail(email)) {
      return res.status(409).json({ error: `Użytkownik z e-mailem "${email.trim()}" już istnieje.` });
    }

    const user = store.create({ name, email });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /users/:id ───────────────────────────────────────────────────────
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    if (isNaN(parseInt(id, 10))) {
      return res.status(400).json({ error: 'ID musi być liczbą całkowitą.' });
    }

    const removed = store.remove(id);
    if (!removed) {
      return res.status(404).json({ error: `Użytkownik o ID ${id} nie istnieje.` });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
