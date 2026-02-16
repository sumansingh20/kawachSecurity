/**
 * Authentication Routes - MongoDB Version
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { authenticate, generateToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email, status: 'ACTIVE' });

    if (!user) {
      await AuditLog.create({
        user_email: email,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        description: 'User not found or inactive',
        ip_address: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      await AuditLog.create({
        user_id: user._id,
        user_email: email,
        action: 'LOGIN_FAILED',
        category: 'AUTH',
        description: 'Invalid password',
        ip_address: req.ip
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Log success
    await AuditLog.create({
      user_id: user._id,
      user_email: email,
      action: 'LOGIN_SUCCESS',
      category: 'AUTH',
      description: 'User logged in successfully',
      ip_address: req.ip
    });

    // Set cookie
    res.cookie('kavach_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'LOGOUT',
      category: 'AUTH',
      description: 'User logged out',
      ip_address: req.ip
    });

    res.clearCookie('kavach_token');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      phone: req.user.phone,
      last_login: req.user.last_login
    }
  });
});

module.exports = router;
