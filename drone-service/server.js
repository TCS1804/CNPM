require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const axios = require('axios');

const Drone = require('./models/Drone');
const DroneMission = require('./models/DroneMission');

const app = express();
const PORT = process.env.PORT || 5055;

// tốc độ drone (km/h) dùng để tính thời gian bay
const DRONE_SPEED_KMH = Number(process.env.DRONE_SPEED_KMH || 40);
// giới hạn thời gian bay tối đa cho 1 đơn (để tránh loop vô hạn)
const MAX_FLIGHT_DURATION_SECONDS = Number(
  process.env.MAX_FLIGHT_DURATION_SECONDS || 600
);

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://mongo:27017/dronedb';
const ORDER_SERVICE_URL =
  process.env.ORDER_SERVICE_URL || 'http://api-gateway:5020/api/orders';
const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:5006';
  
app.use(cors());
app.use(express.json());

// ================== MongoDB Connection ==================

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ Drone service connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ Drone service MongoDB connection error:', err);
  });

// ================== In-memory simulation state ==================

// orderId -> droneState
const dronesState = new Map();

// orderId -> Set<WebSocket>
const wsClientsByOrder = new Map();

// orderId -> { milestone1/3, milestone2/3 } (để track xem đã gửi thông báo chưa)
const milestonesNotified = new Map();

// ================== Helper functions ==================

// Haversine distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// nội suy giữa 2 điểm
function interpolatePosition(start, end, t) {
  t = Math.max(0, Math.min(1, t));
  return {
    lat: start.lat + (end.lat - start.lat) * t,
    lng: start.lng + (end.lng - start.lng) * t,
  };
}

// tạo / cập nhật state drone tại thời điểm hiện tại
function computeDroneState(orderId) {
  const state = dronesState.get(orderId);
  if (!state) return null;

  const now = Date.now();
  const elapsedMs = now - state.startedAt;

  const durationMs = state.durationMs;
  let progress = durationMs > 0 ? elapsedMs / durationMs : 1;
  if (progress >= 1) {
    progress = 1;
    state.status = 'delivered';
  } else if (progress > 0 && state.status === 'pending') {
    state.status = 'enroute';
  }

  const position = interpolatePosition(state.restaurant, state.customer, progress);

  // pin giả lập: giảm max 20% khi bay từ 0 -> 100%
  const battery = Math.max(0, 100 - progress * 20);

  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const etaSeconds = Math.round(remainingMs / 1000);

  const computed = {
    ...state,
    position,
    progress,
    battery,
    etaSeconds,
    lastUpdate: now,
  };

  // lưu lại 1 số field có thể thay đổi
  state.position = position;
  state.progress = progress;
  state.battery = battery;
  state.etaSeconds = etaSeconds;
  state.lastUpdate = now;

  // nếu đã delivered thì đánh dấu kết thúc
  if (state.status === 'delivered' && !state.completedAt) {
    state.completedAt = now;
  }

  // 🎯 Check milestone notifications (1/3, 2/3 quãng đường)
  checkAndSendMilestones(orderId, progress, state);

  return computed;
}

// Kiểm tra và gửi thông báo milestone
function checkAndSendMilestones(orderId, progress, state) {
  const milestones = milestonesNotified.get(orderId) || {};
  
  // Milestone 1/3 (33%)
  if (progress >= 0.33 && !milestones['1/3']) {
    milestones['1/3'] = true;
    milestonesNotified.set(orderId, milestones);
    
    const message = `Đơn hàng của bạn đang trên đường giao (33% hoàn thành) 🚁`;
    sendDeliveryNotification(orderId, state.customerId, message, 'delivery_1/3');
    
    console.log(`[drone-service] Milestone 1/3 reached for order ${orderId}`);
  }
  
  // Milestone 2/3 (67%)
  if (progress >= 0.67 && !milestones['2/3']) {
    milestones['2/3'] = true;
    milestonesNotified.set(orderId, milestones);
    
    const message = `Đơn hàng của bạn sắp tới (67% hoàn thành) 📍`;
    sendDeliveryNotification(orderId, state.customerId, message, 'delivery_2/3');
    
    console.log(`[drone-service] Milestone 2/3 reached for order ${orderId}`);
  }
}

function broadcastToOrder(orderId, payload) {
  const clients = wsClientsByOrder.get(orderId);
  if (!clients || clients.size === 0) return;

  const data = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

// Gửi thông báo đến customer qua notification-service
async function sendDeliveryNotification(orderId, customerId, message, type = 'delivery_progress') {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/notify/send`, {
      userId: customerId,
      title: 'Đơn hàng đang giao',
      message,
      type,
      orderId,
      webNotification: {
        title: 'Đơn hàng đang giao',
        body: message,
        icon: '/delivery-icon.png',
        badge: '/badge-icon.png',
        tag: `delivery-${orderId}`,
      },
    });
    console.log(`[drone-service] Notification sent: ${message} for order ${orderId}`);
  } catch (err) {
    console.warn(
      '[drone-service] Failed to send notification:',
      err.response?.data || err.message
    );
  }
}

// chọn drone rảnh để giao (idle + pin > 20)
async function pickAvailableDrone() {
  const drone = await Drone.findOne({
    status: 'idle',
    battery: { $gt: 20 },
  }).sort({ updatedAt: 1 });

  if (!drone) {
    throw new Error('No available drone (all busy or low battery)');
  }

  return drone;
}

// ================== REST API ==================

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'drone-service', time: new Date().toISOString() });
});

// ================== Fleet Management (CRUD Drone) ==================

// List toàn bộ drone (admin)
app.get('/api/drone/fleet', async (req, res) => {
  try {
    const list = await Drone.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('[drone-service] GET /fleet error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Helper: build + validate payload khi tạo / cập nhật
function buildDronePayload(body) {
  const payload = {};

  if (typeof body.name === 'string') {
    payload.name = body.name.trim();
  }

  if (typeof body.status === 'string') {
    payload.status = body.status;
  }

  if (body.battery !== undefined) {
    const b = Number(body.battery);
    if (!Number.isFinite(b) || b < 0 || b > 100) {
      throw new Error('battery_must_be_between_0_and_100');
    }
    payload.battery = b;
  }

  if (body.speedKmh !== undefined) {
    const s = Number(body.speedKmh);
    if (!Number.isFinite(s) || s <= 0 || s > 200) {
      throw new Error('invalid_speedKmh');
    }
    payload.speedKmh = s;
  }

  // location có thể gửi dạng { location: {lat,lng} } hoặc { lat, lng }
  const rawLat = body.lat ?? body?.location?.lat;
  const rawLng = body.lng ?? body?.location?.lng;
  if (rawLat !== undefined || rawLng !== undefined) {
    const lat = Number(rawLat ?? 0);
    const lng = Number(rawLng ?? 0);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new Error('invalid_latitude');
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new Error('invalid_longitude');
    }
    payload.location = { lat, lng };
  }

  return payload;
}

// Tạo drone mới
app.post('/api/drone/fleet', async (req, res) => {
  try {
    const baseCode = (req.body.code || '').trim();
    const code = baseCode || `DRN-${uuidv4().slice(0, 8)}`;

    // đảm bảo code duy nhất
    const existed = await Drone.findOne({ code });
    if (existed) {
      return res.status(400).json({ error: 'code_already_exists' });
    }

    const payload = buildDronePayload(req.body);
    payload.code = code;

    // default values
    if (payload.status == null) payload.status = 'idle';
    if (payload.battery == null) payload.battery = 100;
    if (payload.speedKmh == null) payload.speedKmh = DRONE_SPEED_KMH;
    if (!payload.location) payload.location = { lat: 0, lng: 0 };

    const doc = await new Drone(payload).save();
    res.status(201).json(doc);
  } catch (err) {
    console.error('[drone-service] POST /fleet error', err);
    res.status(400).json({ error: err.message || 'invalid_payload' });
  }
});

// Lấy chi tiết 1 drone
app.get('/api/drone/fleet/:id', async (req, res) => {
  try {
    const doc = await Drone.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cập nhật drone (có ràng buộc nếu đang có mission)
app.patch('/api/drone/fleet/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const drone = await Drone.findById(id);
    if (!drone) {
      return res.status(404).json({ error: 'not_found' });
    }

    // kiểm tra mission đang active (queued/assigned/enroute + chưa completedAt)
    const hasActiveMission = await DroneMission.exists({
      droneId: id,
      status: { $in: ['queued', 'assigned', 'enroute'] },
      completedAt: { $exists: false },
    });

    // Nếu đang bay / có mission active -> chỉ cho đổi name
    if (hasActiveMission || ['delivering'].includes(drone.status) || drone.currentMissionId) {
      const name = typeof req.body.name === 'string' ? req.body.name.trim() : undefined;
      if (!name) {
        return res.status(400).json({
          error: 'drone_in_active_mission_only_name_can_be_updated',
        });
      }

      const doc = await Drone.findByIdAndUpdate(
        id,
        { $set: { name } },
        { new: true }
      );
      return res.json(doc);
    }

    // Trường hợp không có mission active: cho phép update bình thường (có validate)
    const payload = buildDronePayload(req.body);

    const doc = await Drone.findByIdAndUpdate(
      id,
      { $set: payload },
      { new: true }
    );

    if (!doc) return res.status(404).json({ error: 'not_found' });
    res.json(doc);
  } catch (err) {
    console.error('[drone-service] PATCH /fleet/:id error', err);
    res.status(400).json({ error: err.message || 'invalid_payload' });
  }
});

// Xoá drone (có ràng buộc lịch sử mission + trạng thái)
app.delete('/api/drone/fleet/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const drone = await Drone.findById(id);
    if (!drone) {
      return res.status(404).json({ error: 'not_found' });
    }

    // 1. Không xoá nếu đã từng có mission
    const hasMissionHistory = await DroneMission.exists({ droneId: id });
    if (hasMissionHistory) {
      return res
        .status(400)
        .json({ error: 'cannot_delete_drone_with_mission_history' });
    }

    // 2. Không xoá nếu đang có mission active
    const hasActiveMission = await DroneMission.exists({
      droneId: id,
      status: { $in: ['queued', 'assigned', 'enroute'] },
      completedAt: { $exists: false },
    });
    if (hasActiveMission || drone.currentMissionId) {
      return res
        .status(400)
        .json({ error: 'cannot_delete_drone_with_active_mission' });
    }

    // 3. Chỉ cho phép xoá khi status là idle hoặc offline
    if (!['idle', 'offline'].includes(drone.status)) {
      return res
        .status(400)
        .json({ error: 'only_idle_or_offline_drone_can_be_deleted' });
    }

    await Drone.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('[drone-service] DELETE /fleet/:id error', err);
    res.status(400).json({ error: err.message || 'delete_failed' });
  }
});

// ================== Mission Management (CRUD Mission) ==================

// List toàn bộ missions
app.get('/api/drone/missions', async (req, res) => {
  try {
    const missions = await DroneMission.find().sort({ createdAt: -1 });
    res.json(missions);
  } catch (err) {
    console.error('[drone-service] GET /missions error', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

// Lấy chi tiết mission
app.get('/api/drone/missions/:id', async (req, res) => {
  try {
    const mission = await DroneMission.findById(req.params.id);
    if (!mission) return res.status(404).json({ error: 'not_found' });
    res.json(mission);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cập nhật mission (admin có thể sửa status, v.v.)
app.patch('/api/drone/missions/:id', async (req, res) => {
  try {
    const update = {};
    [
      'status',
      'progress',
      'position',
      'etaSeconds',
      'batteryEnd',
      'startedAt',
      'completedAt',
    ].forEach((key) => {
      if (req.body[key] != null) update[key] = req.body[key];
    });

    const mission = await DroneMission.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { new: true }
    );

    if (!mission) return res.status(404).json({ error: 'not_found' });
    res.json(mission);
  } catch (err) {
    console.error('[drone-service] PATCH /missions/:id error', err);
    res.status(400).json({ error: err.message });
  }
});

// Xoá mission
app.delete('/api/drone/missions/:id', async (req, res) => {
  try {
    const mission = await DroneMission.findByIdAndDelete(req.params.id);
    if (!mission) return res.status(404).json({ error: 'not_found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[drone-service] DELETE /missions/:id error', err);
    res.status(400).json({ error: err.message });
  }
});

// ================== Simulation Assign (tạo mission từ order) ==================

// assign mission cho drone (simulation)
// body: { orderId, restaurant: {lat,lng}, customer: {lat,lng}, customerId }
app.post('/api/drone/assign', async (req, res) => {
  try {
    const { orderId, restaurant, customer, customerId } = req.body || {};

    if (!orderId || !restaurant || !customer) {
      return res.status(400).json({
        error: 'orderId, restaurant, customer là bắt buộc',
      });
    }

    if (
      typeof restaurant.lat !== 'number' ||
      typeof restaurant.lng !== 'number' ||
      typeof customer.lat !== 'number' ||
      typeof customer.lng !== 'number'
    ) {
      return res.status(400).json({
        error: 'restaurant.lat/lng và customer.lat/lng phải là số',
      });
    }

    // chọn drone rảnh
    const drone = await pickAvailableDrone();

    const distanceKm = haversineKm(
      restaurant.lat,
      restaurant.lng,
      customer.lat,
      customer.lng
    );

    // thời gian bay (ms)
    const durationHours = distanceKm / DRONE_SPEED_KMH;
    let durationMs = durationHours * 3600 * 1000;

    // giới hạn min / max
    const minDurationMs = 60 * 1000; // tối thiểu 1 phút
    const maxDurationMs = MAX_FLIGHT_DURATION_SECONDS * 1000;

    if (durationMs < minDurationMs) durationMs = minDurationMs;
    if (durationMs > maxDurationMs) durationMs = maxDurationMs;

    const startedAt = Date.now();
    const durationSec = Math.round(durationMs / 1000);

    // tạo DroneMission trong DB
    const mission = await DroneMission.create({
      orderId,
      droneId: drone._id,
      restaurant,
      customer,
      distanceKm,
      durationSec,
      progress: 0,
      status: 'enroute',
      position: restaurant,
      etaSeconds: durationSec,
      batteryStart: drone.battery,
      startedAt: new Date(startedAt),
    });

    // cập nhật drone
    drone.status = 'delivering';
    drone.currentMissionId = mission._id;
    drone.lastHeartbeat = new Date();
    await drone.save();

    // state mô phỏng trong RAM
    const state = {
      droneCode: drone.code,
      missionId: mission._id.toString(),
      orderId,
      customerId, // 🎯 Lưu customerId để gửi notification
      restaurant,
      customer,
      distanceKm,
      durationMs,
      startedAt,
      status: 'enroute',
      createdAt: startedAt,
      completedAt: null,
      battery: drone.battery,
    };

    dronesState.set(orderId, state);

    const etaSeconds = Math.round(durationMs / 1000);

    res.json({
      droneId: drone.code,
      missionId: mission._id,
      orderId,
      status: state.status,
      distanceKm,
      etaSeconds,
    });

    // 🔗 Đồng bộ missionId + mode + trạng thái in-transit sang order-service
    try {
      await axios.patch(
        `${ORDER_SERVICE_URL}/internal/${orderId}/drone-mission`,
        {
          missionId: mission._id,
          mode: 'drone',
          status: 'in-transit', // tuỳ bạn: hoặc để nguyên 'accepted' cũng được
        }
      );
    } catch (errSync) {
      console.warn(
        '[drone-service] Failed to sync mission to order-service:',
        errSync.response?.data || errSync.message
      );
    }

    // gửi lần đầu qua WS nếu có client đăng ký
    const computed = computeDroneState(orderId);
    if (computed) {
      broadcastToOrder(orderId, {
        type: 'telemetry',
        orderId,
        missionId: mission._id,
        status: computed.status,
        battery: computed.battery,
        position: computed.position,
        progress: computed.progress,
        etaSeconds: computed.etaSeconds,
      });
    }
    
  } catch (err) {
    console.error('[drone-service] assign error', err);
    res.status(500).json({ error: err.message || 'internal_error' });
  }
});

// lấy status hiện tại của drone theo orderId
app.get('/api/drone/:orderId/status', (req, res) => {
  const { orderId } = req.params;
  const state = computeDroneState(orderId);
  if (!state) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({
    droneCode: state.droneCode,
    missionId: state.missionId,
    orderId: state.orderId,
    status: state.status,
    battery: state.battery,
    progress: state.progress,
    position: state.position,
    distanceKm: state.distanceKm,
    etaSeconds: state.etaSeconds,
  });
});

// hủy mission (simulation)
app.post('/api/drone/:orderId/cancel', async (req, res) => {
  const { orderId } = req.params;
  const state = dronesState.get(orderId);
  if (!state) {
    return res.status(404).json({ error: 'not_found' });
  }

  state.status = 'cancelled';
  state.canceledAt = Date.now();

  try {
    // cập nhật mission trong DB
    if (state.missionId) {
      await DroneMission.findByIdAndUpdate(state.missionId, {
        $set: {
          status: 'canceled',
          completedAt: new Date(),
        },
      });
    }

    // giải phóng drone
    const mission = state.missionId
      ? await DroneMission.findById(state.missionId)
      : null;
    if (mission) {
      await Drone.updateOne(
        { _id: mission.droneId },
        {
          $set: {
            status: 'idle',
            currentMissionId: null,
            lastHeartbeat: new Date(),
            location: state.position || state.restaurant,
          },
        }
      );
    }
  } catch (err) {
    console.error('[drone-service] cancel mission DB sync error', err);
  }

  res.json({ ok: true, orderId, status: state.status });
});

// 📍 Progress tracking endpoint - để client polling progress
app.get('/api/drone/:orderId/progress', (req, res) => {
  const { orderId } = req.params;
  const state = computeDroneState(orderId);
  
  if (!state) {
    return res.status(404).json({ error: 'not_found' });
  }

  res.json({
    orderId: state.orderId,
    missionId: state.missionId,
    status: state.status,
    progress: state.progress, // 0-1
    progressPercent: Math.round(state.progress * 100), // 0-100
    position: state.position,
    battery: state.battery,
    etaSeconds: state.etaSeconds,
    distanceKm: state.distanceKm,
    milestonesNotified: milestonesNotified.get(orderId) || {},
  });
});

// ================== HTTP + WebSocket server ==================

const server = http.createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      ws.send(
        JSON.stringify({
          type: 'error',
          error: 'orderId query param is required',
        })
      );
      ws.close();
      return;
    }

    console.log('[drone-service] WS client connected for order', orderId);

    if (!wsClientsByOrder.has(orderId)) {
      wsClientsByOrder.set(orderId, new Set());
    }
    wsClientsByOrder.get(orderId).add(ws);

    // gửi trạng thái hiện tại ngay khi connect
    const state = computeDroneState(orderId);
    if (state) {
      ws.send(
        JSON.stringify({
          type: 'telemetry',
          orderId,
          missionId: state.missionId,
          status: state.status,
          battery: state.battery,
          position: state.position,
          progress: state.progress,
          etaSeconds: state.etaSeconds,
          milestonesNotified: milestonesNotified.get(orderId) || {}, // 🎯 Gửi milestone status
        })
      );
    } else {
      ws.send(
        JSON.stringify({
          type: 'info',
          message: 'Chưa có mission cho order này. Gửi POST /api/drone/assign trước.',
        })
      );
    }

    ws.on('close', () => {
      const set = wsClientsByOrder.get(orderId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          wsClientsByOrder.delete(orderId);
        }
      }
      console.log('[drone-service] WS client disconnected for order', orderId);
    });
  } catch (err) {
    console.error('[drone-service] WS connection error', err);
    ws.close();
  }
});

// tick simulator mỗi 1 giây
setInterval(() => {
  (async () => {
    for (const [orderId, state] of dronesState.entries()) {
      const computed = computeDroneState(orderId);
      if (!computed) continue;

      // broadcast
      broadcastToOrder(orderId, {
        type: 'telemetry',
        orderId,
        missionId: computed.missionId,
        status: computed.status,
        battery: computed.battery,
        position: computed.position,
        progress: computed.progress,
        etaSeconds: computed.etaSeconds,
        milestonesNotified: milestonesNotified.get(orderId) || {}, // 🎯 Gửi milestone status
      });

      if (computed.status === 'delivered') {
        broadcastToOrder(orderId, {
          type: 'completed',
          orderId,
          missionId: computed.missionId,
          status: 'delivered',
        });

        // cập nhật Mission + Drone vào DB (chỉ khi chuyển sang delivered)
        try {
          if (computed.missionId) {
            await DroneMission.findByIdAndUpdate(computed.missionId, {
              $set: {
                status: 'delivered',
                progress: 1,
                position: computed.position,
                etaSeconds: 0,
                batteryEnd: computed.battery,
                completedAt: new Date(),
              },
            });

            const mission = await DroneMission.findById(computed.missionId);
            if (mission) {
              await Drone.updateOne(
                { _id: mission.droneId },
                {
                  $set: {
                    status: 'idle',
                    currentMissionId: null,
                    lastHeartbeat: new Date(),
                    location: computed.position,
                    battery: computed.battery,
                  },
                }
              );
            }
          }

          // 🔗 Đồng bộ trạng thái đơn sang 'delivered' trong order-service
          try {
            await axios.patch(
              `${ORDER_SERVICE_URL}/internal/${orderId}/drone-mission`,
              {
                status: 'delivered',
              }
            );
          } catch (errSync) {
            console.warn(
              '[drone-service] Failed to sync delivered status to order-service:',
              errSync.response?.data || errSync.message
            );
          }
          
        } catch (err) {
          console.error('[drone-service] finalize mission DB sync error', err);
        }
      }
    }
  })().catch((err) => console.error('Simulation loop error', err));
}, 1000);

// start server
server.listen(PORT, () => {
  console.log(`🛰️  Drone service running on port ${PORT}`);
});
