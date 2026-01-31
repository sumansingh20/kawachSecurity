/**
 * Dashboard Routes - MongoDB Version
 */

const express = require('express');
const { User, AuditLog, SystemEvent } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'ADMIN';
    const stats = {};
    const now = new Date();
    const yesterday = new Date(now - 24 * 60 * 60 * 1000);

    if (isAdmin) {
      stats.totalUsers = await User.countDocuments({ status: 'ACTIVE' });
      stats.activeUsers = await User.countDocuments({ last_login: { $gte: yesterday } });
      stats.todayLogins = await AuditLog.countDocuments({
        action: 'LOGIN_SUCCESS', created_at: { $gte: yesterday }
      });
      stats.criticalAlerts = await SystemEvent.countDocuments({
        severity: 'CRITICAL', status: 'ACTIVE'
      });
      stats.warnings = await SystemEvent.countDocuments({
        severity: 'WARNING', status: 'ACTIVE'
      });
      stats.totalEvents = await SystemEvent.countDocuments({ status: 'ACTIVE' });

      const criticalWeight = stats.criticalAlerts * 20;
      const warningWeight = stats.warnings * 5;
      stats.systemHealth = Math.max(0, 100 - criticalWeight - warningWeight);

      const failedLogins = await AuditLog.countDocuments({
        action: 'LOGIN_FAILED', created_at: { $gte: yesterday }
      });
      stats.securityScore = Math.max(50, 100 - Math.min(50, failedLogins * 5));

    } else {
      stats.lastLogin = req.user.last_login;
      stats.myEvents = await SystemEvent.countDocuments({
        user_id: req.user._id, status: 'ACTIVE'
      });
      stats.systemHealth = 95;
      stats.securityScore = 92;
    }

    res.json({ stats });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const query = req.user.role !== 'ADMIN' ? { user_id: req.user._id } : {};

    const activity = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .limit(limit);

    res.json({ activity });

  } catch (error) {
    console.error('Recent activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const query = { status: 'ACTIVE' };

    if (req.user.role !== 'ADMIN') {
      query.$or = [
        { user_id: req.user._id },
        { severity: { $in: ['CRITICAL', 'WARNING'] } }
      ];
    }

    const alerts = await SystemEvent.find(query)
      .sort({ severity: 1, created_at: -1 })
      .limit(limit);

    res.json({ alerts });

  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

module.exports = router;
