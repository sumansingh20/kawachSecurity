/**
 * System Events Routes - MongoDB Version
 */

const express = require('express');
const { SystemEvent, AuditLog } = require('../models');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/events
router.get('/', authenticate, async (req, res) => {
  try {
    const { severity, status, eventType, source, page = 1, limit = 25 } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (severity) query.severity = severity;
    if (status) query.status = status;
    if (eventType) query.event_type = eventType;
    if (source) query.source = { $regex: source, $options: 'i' };

    const events = await SystemEvent.find(query)
      .sort({ severity: 1, created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SystemEvent.countDocuments(query);

    res.json({
      events,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
    });

  } catch (error) {
    console.error('Events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [critical, warning, info, resolved] = await Promise.all([
      SystemEvent.countDocuments({ severity: 'CRITICAL', status: 'ACTIVE' }),
      SystemEvent.countDocuments({ severity: 'WARNING', status: 'ACTIVE' }),
      SystemEvent.countDocuments({ severity: 'INFO', status: 'ACTIVE' }),
      SystemEvent.countDocuments({ status: 'RESOLVED', resolved_at: { $gte: yesterday } })
    ]);

    res.json({ summary: { critical, warning, info, resolvedToday: resolved } });

  } catch (error) {
    console.error('Events summary error:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// POST /api/events (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { event_type, severity, source, description, metadata } = req.body;

    if (!event_type || !severity || !description) {
      return res.status(400).json({ error: 'event_type, severity, and description are required' });
    }

    const event = await SystemEvent.create({
      event_type, severity, source: source || 'MANUAL',
      description, metadata, user_id: req.user._id
    });

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'EVENT_CREATED',
      category: 'SYSTEM',
      description: `Created ${severity} event: ${event_type}`,
      ip_address: req.ip
    });

    res.status(201).json({ message: 'Event created successfully', eventId: event._id });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id/resolve
router.put('/:id/resolve', authenticate, async (req, res) => {
  try {
    const event = await SystemEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    event.status = 'RESOLVED';
    event.resolved_at = new Date();
    if (req.body.resolution_note) {
      event.metadata = { ...event.metadata, resolution_note: req.body.resolution_note };
    }
    await event.save();

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'EVENT_RESOLVED',
      category: 'SYSTEM',
      description: `Resolved event: ${event.event_type}`,
      ip_address: req.ip
    });

    res.json({ message: 'Event resolved successfully' });

  } catch (error) {
    console.error('Resolve event error:', error);
    res.status(500).json({ error: 'Failed to resolve event' });
  }
});

// DELETE /api/events/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await SystemEvent.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    await SystemEvent.deleteOne({ _id: req.params.id });

    await AuditLog.create({
      user_id: req.user._id,
      user_email: req.user.email,
      action: 'EVENT_DELETED',
      category: 'SYSTEM',
      description: `Deleted event: ${event.event_type}`,
      ip_address: req.ip
    });

    res.json({ message: 'Event deleted successfully' });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;
