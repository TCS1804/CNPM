// drone-service/models/Drone.js
const mongoose = require('mongoose');

const droneSchema = new mongoose.Schema({
  // tên hiển thị (option)
  name: { type: String, trim: true },

  // mã định danh drone (duy nhất)
  code: { type: String, required: true, unique: true },

  status: {
    type: String,
    enum: ['idle', 'delivering', 'charging', 'maintenance', 'offline'],
    default: 'idle',
  },

  battery: { type: Number, default: 100 }, // %
  speedKmh: { type: Number, default: 40 },

  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },

  currentMissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DroneMission',
    default: null,
  },

  lastHeartbeat: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Drone', droneSchema);
