const mongoose = require('mongoose');

const adminAuditSchema = new mongoose.Schema({
  adminId: { type: String, required: true },
  action: { type: String, enum: ['delete_attempt', 'update', 'create'], default: 'delete_attempt' },
  targetType: { type: String, enum: ['restaurant', 'menuitem'], default: 'restaurant' },
  targetId: { type: String, required: true },
  status: { type: String, enum: ['blocked', 'success', 'error'], default: 'blocked' },
  reason: String, // Lý do nếu bị chặn (e.g., "has 2 orders")
  requestBody: mongoose.Schema.Types.Mixed,
  responseMessage: String,
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
}, { timestamps: true });

module.exports = mongoose.model('AdminAudit', adminAuditSchema);
