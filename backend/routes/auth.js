const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { signToken, auth } = require('../middleware/auth');
const User = require('../models/User');

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await User.findOne({ email });
    if (!user || !bcrypt.compareSync(password || '', user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.json({ token: signToken(user), user: safe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!cleanName || !cleanEmail || typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    if (await User.findOne({ email: cleanEmail })) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    const user = await User.create({ name: cleanName, email: cleanEmail, password: bcrypt.hashSync(password, 10), role: 'staff' });
    const safe = { id: user.id, name: user.name, email: user.email, role: user.role };
    res.status(201).json({ token: signToken(user), user: safe });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', auth(), (req, res) => res.json({ user: req.user }));

module.exports = router;