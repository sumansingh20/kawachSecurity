/**
 * Settings Routes - MongoDB Version
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { User, AuditLog, Session, SystemSetting } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/settings/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password_hash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/settings/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, department } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone || null;
    if (department !== undefined) user.department = department || null;
    await user.save();

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'PROFILE_UPDATED',
      category: 'USER',
      description: 'Updated profile settings',
      ip_address: req.ip
    });

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/settings/password
router.put('/password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      await AuditLog.create({
        user_id: req.user._id,
        user_email: req.user.email,
        action: 'PASSWORD_CHANGE_FAILED',
        category: 'SECURITY',
        description: 'Incorrect current password',
        ip_address: req.ip
      });
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    user.password_hash = await bcrypt.hash(newPassword, rounds);
    await user.save();

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'PASSWORD_CHANGED',
      category: 'SECURITY',
      description: 'Password changed successfully',
      ip_address: req.ip
    });

    res.json({ message: 'Password changed successfully' });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/settings/system (Admin only)
router.get('/system', authenticate, requireAdmin, async (req, res) => {
  try {
    const settings = await SystemSetting.find().sort('setting_key');
    const settingsObj = {};
    settings.forEach(s => { settingsObj[s.setting_key] = s.setting_value; });
    res.json({ settings: settingsObj });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// PUT /api/settings/system (Admin only)
router.put('/system', authenticate, requireAdmin, async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No settings provided' });
    }

    for (const [key, value] of Object.entries(updates)) {
      await SystemSetting.findOneAndUpdate(
        { setting_key: key },
        { setting_value: value, updated_by: req.user._id, updated_at: new Date() },
        { upsert: true }
      );
    }

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'SETTINGS_UPDATED',
      category: 'SYSTEM',
      description: `Updated settings: ${Object.keys(updates).join(', ')}`,
      ip_address: req.ip
    });

    res.json({ message: 'Settings updated successfully' });

  } catch (error) {
    console.error('Update system settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
