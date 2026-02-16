/**
 * Audit Log Routes - MongoDB Version
 */

const express = require('express');
const { AuditLog } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit
router.get('/', authenticate, async (req, res) => {
  try {
    const { search, action, category, startDate, endDate, page = 1, limit = 25 } = req.query;
    const skip = (page - 1) * limit;
    const isAdmin = req.user.role === 'ADMIN';

    const query = {};
    if (!isAdmin) query.user_id = req.user._id;

    if (search) {
      query.$or = [
        { user_email: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (action) query.action = action;
    if (category) query.category = category;
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate + 'T23:59:59');
    }

    const logs = await AuditLog.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });

  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// GET /api/audit/actions
router.get('/actions', authenticate, async (req, res) => {
  try {
    const actions = await AuditLog.distinct('action');
    res.json({ actions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch actions' });
  }
});

// GET /api/audit/categories
router.get('/categories', authenticate, async (req, res) => {
  try {
    const categories = await AuditLog.distinct('category');
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/audit/export (Admin only)
router.get('/export', authenticate, requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const query = {};
    if (startDate || endDate) {
      query.created_at = {};
      if (startDate) query.created_at.$gte = new Date(startDate);
      if (endDate) query.created_at.$lte = new Date(endDate + 'T23:59:59');
    }

    const logs = await AuditLog.find(query).sort({ created_at: -1 }).limit(10000);

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'AUDIT_EXPORT',
      category: 'AUDIT',
      description: `Exported ${logs.length} audit logs`,
      ip_address: req.ip
    });

    if (format === 'csv') {
      const csvHeader = 'ID,User,Action,Category,Description,IP,Timestamp\n';
      const csvData = logs.map(l => 
        `${l._id},"${l.user_email || ''}","${l.action}","${l.category}","${l.description || ''}","${l.ip_address || ''}","${l.created_at}"`
      ).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      res.send(csvHeader + csvData);
    } else {
      res.json({ logs, count: logs.length });
    }

  } catch (error) {
    console.error('Audit export error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

module.exports = router;
