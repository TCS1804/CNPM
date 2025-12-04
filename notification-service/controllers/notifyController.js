const { sendEmail } = require('../services/email');
const { sendSMS } = require('../services/sms');

// Simple in-memory notification store for web/browser notifications.
// Structure: { id, target: { role?, userId?, restaurantId? }, title, body, data, createdAt }
const webNotifications = [];

exports.email = async (req, res) => {
  try {
    await sendEmail(req.body);
    res.json({ message: 'Email sent' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'Email failed' });
  }
};

exports.sms = async (req, res) => {
  try {
    await sendSMS(req.body);
    res.json({ message: 'SMS sent' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'SMS failed' });
  }
};

// POST /notify/web  -> push a web notification (from services)
exports.webPush = async (req, res) => {
  try {
    const { target, title, body, data } = req.body || {};
    if (!target || (!target.role && !target.userId && !target.restaurantId)) {
      return res.status(400).json({ message: 'Missing target' });
    }
    const id = String(Date.now()) + Math.random().toString(36).slice(2, 8);
    webNotifications.push({ id, target, title: title || '', body: body || '', data: data || {}, createdAt: new Date() });
    res.json({ message: 'ok' });
  } catch (e) {
    res.status(500).json({ message: e.message || 'web push failed' });
  }
};

// GET /notify/web?role=...&userId=...  -> fetch and consume matching notifications
exports.webFetch = async (req, res) => {
  try {
    const { role, userId, restaurantId } = req.query || {};
    const matched = webNotifications.filter((n) => {
      if (userId && n.target.userId && String(n.target.userId) === String(userId)) return true;
      if (restaurantId && n.target.restaurantId && String(n.target.restaurantId) === String(restaurantId)) return true;
      if (role && n.target.role && String(n.target.role) === String(role)) return true;
      return false;
    });

    // Remove returned notifications from store
    const ids = new Set(matched.map((m) => m.id));
    for (let i = webNotifications.length - 1; i >= 0; i--) {
      if (ids.has(webNotifications[i].id)) webNotifications.splice(i, 1);
    }

    res.json(matched);
  } catch (e) {
    res.status(500).json({ message: e.message || 'web fetch failed' });
  }
};
