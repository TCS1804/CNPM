// drone-service/models/DroneMission.js
const mongoose = require('mongoose');

const droneMissionSchema = new mongoose.Schema({
  orderId: { type: String, required: true },

  droneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drone',
    required: true,
  },

  // toạ độ nhà hàng
  restaurant: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },

  // toạ độ khách
  customer: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
  },

  distanceKm: { type: Number, default: 0 },
  durationSec: { type: Number, default: 0 },

  progress: { type: Number, default: 0 }, // 0..1

  status: {
    type: String,
    enum: ['queued', 'assigned', 'enroute', 'delivered', 'canceled', 'failed'],
    default: 'queued',
  },

  position: {
    lat: { type: Number },
    lng: { type: Number },
  },

  etaSeconds: { type: Number, default: 0 },

  batteryStart: { type: Number, default: 100 },
  batteryEnd: { type: Number },

  startedAt: { type: Date },
  completedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('DroneMission', droneMissionSchema);
