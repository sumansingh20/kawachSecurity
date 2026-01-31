/**
 * MongoDB Models
 */

const mongoose = require('mongoose');

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'USER'], default: 'USER' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  department: { type: String, default: null },
  phone: { type: String, default: null },
  last_login: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

userSchema.pre('save', function(next) {
  this.updated_at = new Date();
  if (typeof next === 'function') next();
});

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_email: { type: String },
  action: { type: String, required: true },
  category: { type: String, default: 'SYSTEM' },
  description: { type: String },
  ip_address: { type: String },
  user_agent: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
});

// System Event Schema
const systemEventSchema = new mongoose.Schema({
  event_type: { type: String, required: true },
  severity: { type: String, enum: ['INFO', 'WARNING', 'CRITICAL'], default: 'INFO' },
  source: { type: String },
  description: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'DISMISSED'], default: 'ACTIVE' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  resolved_at: { type: Date },
  created_at: { type: Date, default: Date.now }
});

// Session Schema
const sessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true },
  ip_address: { type: String },
  user_agent: { type: String },
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true }
});

// System Settings Schema
const systemSettingSchema = new mongoose.Schema({
  setting_key: { type: String, required: true, unique: true },
  setting_value: { type: String },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_at: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const SystemEvent = mongoose.model('SystemEvent', systemEventSchema);
const Session = mongoose.model('Session', sessionSchema);
const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);

module.exports = {
  User,
  AuditLog,
  SystemEvent,
  Session,
  SystemSetting
};
