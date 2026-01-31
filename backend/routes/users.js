/**
 * User Management Routes - MongoDB Version
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, AuditLog } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/users - List all users (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const users = await User.find(query)
      .select('-password_hash')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users
router.post('/', authenticate, requireAdmin, [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['ADMIN', 'USER']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { name, email, password, role, department, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const passwordHash = await bcrypt.hash(password, rounds);

    const user = await User.create({
      name, email, password_hash: passwordHash, role,
      status: 'ACTIVE', department, phone
    });

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'USER_CREATED',
      category: 'USER',
      description: `Created user: ${email}`,
      ip_address: req.ip
    });

    res.status(201).json({ message: 'User created successfully', userId: user._id });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, role, status, department, phone } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userId === req.user._id.toString() && status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    user.name = name || user.name;
    user.role = role || user.role;
    user.status = status || user.status;
    user.department = department;
    user.phone = phone;
    await user.save();

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'USER_UPDATED',
      category: 'USER',
      description: `Updated user: ${user.email}`,
      ip_address: req.ip
    });

    res.json({ message: 'User updated successfully' });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.deleteOne({ _id: userId });

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'USER_DELETED',
      category: 'USER',
      description: `Deleted user: ${user.email}`,
      ip_address: req.ip
    });

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
